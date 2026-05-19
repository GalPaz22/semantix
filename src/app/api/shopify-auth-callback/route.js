import { NextResponse } from "next/server";
import clientPromise from "/lib/mongodb";
import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

function hasShopifyCredentials() {
  return Boolean(SHOPIFY_API_KEY && SHOPIFY_API_SECRET);
}

// Verify the HMAC Shopify appends to the callback URL.
function verifyShopifyHmac(searchParams) {
  const hmac = searchParams.get("hmac");
  if (!hmac || !SHOPIFY_API_SECRET) return false;

  const params = {};
  searchParams.forEach((value, key) => {
    if (key !== "hmac" && key !== "signature") params[key] = value;
  });

  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const expected = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  try {
    const hmacBuffer = Buffer.from(hmac, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    return (
      hmacBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(hmacBuffer, expectedBuffer)
    );
  } catch {
    return false;
  }
}

// Try to extract the user email from a signed state (set by shopify-install-url).
// Returns { email: null, validSignedState: false } for a plain random nonce (set by shopify-install).
function extractUserEmailFromState(state) {
  if (!state || !SHOPIFY_API_SECRET) {
    return { email: null, validSignedState: false };
  }

  try {
    const { payload, hmac: stateHmac } = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );

    if (!payload || !stateHmac) {
      return { email: null, validSignedState: false };
    }

    const expected = crypto
      .createHmac("sha256", SHOPIFY_API_SECRET)
      .update(payload)
      .digest("hex");

    const stateHmacBuffer = Buffer.from(stateHmac, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (
      stateHmacBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(stateHmacBuffer, expectedBuffer)
    ) {
      return { email: null, validSignedState: false };
    }

    const [email, timestamp] = payload.split(":");
    const stateAgeMs = Date.now() - Number(timestamp);
    const maxStateAgeMs = 10 * 60 * 1000;

    if (!email || !timestamp || Number.isNaN(stateAgeMs) || stateAgeMs > maxStateAgeMs) {
      return { email: null, validSignedState: false };
    }

    return { email, validSignedState: true };
  } catch {
    return { email: null, validSignedState: false }; // plain random nonce — that's fine
  }
}

function normalizeShop(shop) {
  if (!shop) return null;
  const clean = shop.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(clean)) return null;
  return clean;
}

async function exchangeCodeForToken(shop, code) {
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Token exchange failed (${tokenRes.status}): ${body}`);
  }

  return tokenRes.json();
}

export async function GET(request) {
  if (!hasShopifyCredentials()) {
    return new Response(
      "Missing Shopify credentials. Set NEXT_PUBLIC_SHOPIFY_API_KEY and SHOPIFY_API_SECRET.",
      { status: 500 }
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const rawShop = searchParams.get("shop");
  const stateParam = searchParams.get("state");
  const shop = normalizeShop(rawShop);

  if (!code || !shop) {
    return new Response("Missing code or shop", { status: 400 });
  }

  // 1. Verify the request is genuinely from Shopify.
  if (!verifyShopifyHmac(searchParams)) {
    return new Response("Invalid HMAC signature", { status: 401 });
  }

  // 2. Verify state (CSRF protection). Signed state is used when a logged-in
  // Semantix user starts the install. Plain nonce state is used for direct install links.
  const cookieState = request.cookies.get("shopify_oauth_state")?.value;
  if (!stateParam) {
    return new Response("Missing OAuth state", { status: 401 });
  }
  if (cookieState && cookieState !== stateParam) {
    return new Response("State mismatch — possible CSRF attack", { status: 401 });
  }

  const { email: linkedUserEmail, validSignedState } = extractUserEmailFromState(stateParam);

  try {
    // 3. Exchange the authorization code for an Admin API access token.
    const { access_token: accessToken, scope } = await exchangeCodeForToken(shop, code);

    if (!accessToken) {
      throw new Error("Shopify did not return an access token");
    }

    // 4. Persist the token in MongoDB.
    const client = await clientPromise;
    const db = client.db("users");
    const now = new Date();

    await db.collection("shopify_installations").updateOne(
      { shop },
      {
        $set: {
          shop,
          accessToken,
          scope: scope || "",
          installedAt: now,
          active: true,
          tokenType: "offline",
          ...(linkedUserEmail ? { userEmail: linkedUserEmail, linkedUserEmail } : {}),
        },
        $setOnInsert: {
          installationId: crypto.randomUUID(),
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // If the install was started from a logged-in Semantix account, connect it immediately.
    if (linkedUserEmail && validSignedState) {
      await db.collection("users").updateOne(
        { email: linkedUserEmail },
        {
          $set: {
            shopifyAccessToken: accessToken,
            shopifyShop: shop,
            shopifyConnected: true,
            shopifyConnectedAt: now,
            shopifyScope: scope || "",
            shopifyTokenType: "offline",
          },
        }
      );

      await db.collection("pending_installations").deleteOne({ shop });
    } else {
      // If this was a merchant/direct install with no logged-in Semantix user,
      // keep it claimable through /api/shopify-link-installation.
      await db.collection("pending_installations").updateOne(
        { shop },
        {
          $set: {
            shop,
            accessToken,
            scope: scope || "",
            installedAt: now,
            active: true,
          },
          $setOnInsert: {
            pendingInstallationId: crypto.randomUUID(),
            createdAt: now,
          },
        },
        { upsert: true }
      );
    }

    console.log(
      `✅ Shopify installed: ${shop}${linkedUserEmail ? ` (linked to ${linkedUserEmail})` : " (pending claim)"}`
    );

    // 5. Clear the OAuth state cookie and redirect to success page.
    const successUrl = new URL("/install-success", request.url);
    successUrl.searchParams.set("shop", shop);
    successUrl.searchParams.set("connected", linkedUserEmail ? "true" : "pending");

    const response = NextResponse.redirect(successUrl);
    response.cookies.delete("shopify_oauth_state");
    return response;
  } catch (error) {
    console.error("Shopify callback error:", error);
    return new Response(`Installation failed: ${error.message}`, { status: 500 });
  }
}
