import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import { exchangeCodeForToken, WEBHOOK_TOPICS, APP_URL } from "/lib/shopify-app-config";
import crypto from "crypto";

/**
 * Decode and verify the signed state produced by /api/shopify-install-url.
 * Returns the user email embedded in the state, or null if verification fails.
 */
function decodeState(state) {
  try {
    const { payload, hmac } = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    const expected = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(payload)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
    // payload = "email:timestamp"
    const colonIdx = payload.indexOf(":");
    return colonIdx !== -1 ? payload.slice(0, colonIdx) : null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");

  if (!code || !shop) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_params", request.url));
  }

  try {
    // Resolve who the installing user is.
    // Primary path: extract email from the HMAC-signed state (works even if the
    // session cookie was lost during the cross-site Shopify redirect).
    // Fallback: read from the live server session (old-style plain-email state).
    let userEmail = state ? decodeState(state) : null;

    if (!userEmail) {
      // Fallback to session — covers the legacy plain-email state format
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.redirect(new URL("/login?callbackUrl=/install-shopify-app", request.url));
      }
      // Old state was just the raw email
      if (state && state !== session.user.email) {
        throw new Error("Invalid state parameter");
      }
      userEmail = session.user.email;
    }

    // Exchange the authorization code for a permanent access token
    const tokenData = await exchangeCodeForToken(shop, code);
    const accessToken = tokenData.access_token;

    const client = await clientPromise;
    const db = client.db("users");

    // Persist token on the user record so existing dashboard logic keeps working
    await db.collection("users").updateOne(
      { email: userEmail },
      {
        $set: {
          shopifyAccessToken: accessToken,
          shopifyShop: shop,
          shopifyConnected: true,
          shopifyConnectedAt: new Date(),
          shopifyScope: tokenData.scope || "",
          shopifyTokenType: tokenData.token_type || "bearer",
        },
      }
    );

    // Upsert the installation record (idempotent on re-installs)
    await db.collection("shopify_installations").updateOne(
      { shop, userEmail },
      {
        $set: {
          accessToken,
          scope: tokenData.scope || "",
          active: true,
          installedAt: new Date(),
        },
        $setOnInsert: {
          installationId: crypto.randomUUID(),
          shop,
          userEmail,
        },
      },
      { upsert: true }
    );

    // Register webhooks (best-effort — don't fail the install if this errors)
    const webhookResults = await registerWebhooks(shop, accessToken, db, { email: userEmail });
    console.log(`Shopify install complete: ${shop} (${userEmail}), webhooks: ${webhookResults.registered} ok / ${webhookResults.failed} failed`);

    return NextResponse.redirect(new URL("/dashboard?shopify_connected=true", request.url));
  } catch (error) {
    console.error("Shopify auth callback error:", error);
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error.message)}`, request.url));
  }
}

/**
 * Register webhooks for the shop
 * @param {string} shop - The shop domain
 * @param {string} accessToken - The access token
 * @param {Object} db - MongoDB database connection
 * @param {Object} user - The user object
 * @returns {Promise<Object>} - The results of webhook registration
 */
async function registerWebhooks(shop, accessToken, db, user) {
  try {
    // Register webhooks for each topic
    const results = await Promise.all(
      WEBHOOK_TOPICS.map(topic => registerWebhook(shop, accessToken, topic))
    );
    
    // Save webhook registrations to the database
    const successfulWebhooks = results
      .filter(result => result.success)
      .map(result => ({
        topic: result.topic,
        webhookId: result.webhookId,
        shop,
        createdAt: new Date(),
        userId: user.id,
        userEmail: user.email
      }));
    
    if (successfulWebhooks.length > 0) {
      await db.collection("shopify_webhook_registrations").insertMany(successfulWebhooks);
    }
    
    return {
      registered: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error("Error registering webhooks:", error);
    return {
      registered: 0,
      failed: WEBHOOK_TOPICS.length,
      error: error.message
    };
  }
}

/**
 * Register a webhook for a specific topic
 * @param {string} shop - The shop domain
 * @param {string} accessToken - The access token
 * @param {string} topic - The webhook topic
 * @returns {Promise<Object>} - The result of the registration
 */
async function registerWebhook(shop, accessToken, topic) {
  try {
    const formattedShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const apiVersion = '2023-10'; // Update this to the latest stable version
    
    const response = await fetch(`https://${formattedShop}/admin/api/${apiVersion}/webhooks.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address: `${APP_URL}/api/webhooks/shopify`,
          format: 'json'
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to register webhook for ${topic}:`, errorText);
      return {
        topic,
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }
    
    const data = await response.json();
    return {
      topic,
      success: true,
      webhookId: data.webhook.id
    };
  } catch (error) {
    console.error(`Error registering webhook for ${topic}:`, error);
    return {
      topic,
      success: false,
      error: error.message
    };
  }
} 