import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import { exchangeCodeForToken, WEBHOOK_TOPICS, APP_URL } from "/lib/shopify-app-config";
import crypto from "crypto";

export async function GET(request) {
  // Get user session
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  // Extract the authorization code and shop from the URL
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  
  if (!code || !shop) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_params", request.url));
  }
  
  try {
    // Verify state to prevent CSRF attacks
    const expectedState = session.user.email || "anonymous";
    if (state !== expectedState) {
      throw new Error("Invalid state parameter");
    }
    
    // Exchange the code for a permanent access token
    const tokenData = await exchangeCodeForToken(shop, code);
    const accessToken = tokenData.access_token;
    
    // Update user record with the Shopify access token
    const client = await clientPromise;
    const db = client.db("users");
    await db.collection("users").updateOne(
      { email: session.user.email },
      { 
        $set: { 
          shopifyAccessToken: accessToken,
          shopifyShop: shop,
          shopifyConnected: true,
          shopifyConnectedAt: new Date(),
          shopifyScope: tokenData.scope || "",
          shopifyTokenType: tokenData.token_type || "bearer"
        } 
      }
    );
    
    // Create a new installation record
    const installationId = crypto.randomUUID();
    await db.collection("shopify_installations").insertOne({
      installationId,
      shop,
      accessToken,
      userId: session.user.id,
      userEmail: session.user.email,
      installedAt: new Date(),
      scope: tokenData.scope || "",
      active: true
    });
    
    // Register webhooks
    const webhookResults = await registerWebhooks(shop, accessToken, db, session.user);
    
    console.log(`Successfully connected Shopify store: ${shop}`);
    console.log(`Registered ${webhookResults.registered} webhooks`);
    
    // Redirect back to the dashboard with success message
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