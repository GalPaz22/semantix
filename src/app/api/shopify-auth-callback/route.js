import { NextResponse } from "next/server";
import clientPromise from "/lib/mongodb";
import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// Verify the HMAC Shopify appends to the callback URL
function verifyShopifyHmac(searchParams) {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const params = {};
  searchParams.forEach((value, key) => {
    if (key !== "hmac") params[key] = value;
  });

  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const expected = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Try to extract the user email from a signed state (set by shopify-install-url).
// Returns null if the state is a plain random nonce (set by shopify-install).
function extractUserEmailFromState(state) {
  if (!state) return null;
  try {
    const { payload, hmac: stateHmac } = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );
    const expected = crypto
      .createHmac("sha256", SHOPIFY_API_SECRET)
      .update(payload)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(stateHmac), Buffer.from(expected))) {
      return null;
    }
    const [email] = payload.split(":");
    return email || null;
  } catch {
    return null; // plain random nonce — that's fine
  }
}

function normalizeShop(shop) {
  if (!shop) return null;
  const clean = shop.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(clean)) return null;
  return clean;
}

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const rawShop = searchParams.get("shop");
  const stateParam = searchParams.get("state");

  const shop = normalizeShop(rawShop);

  if (!code || !shop) {
    return new Response("Missing code or shop", { status: 400 });
  }

  // 1. Verify the request is genuinely from Shopify
  if (!verifyShopifyHmac(searchParams)) {
    return new Response("Invalid HMAC signature", { status: 401 });
  }

  // 2. Verify state (CSRF protection)
  const cookieState = request.cookies.get("shopify_oauth_state")?.value;
  if (cookieState && stateParam && cookieState !== stateParam) {
    return new Response("State mismatch — possible CSRF attack", { status: 401 });
  }

  // 3. Try to identify which user initiated the install (for linking)
  const linkedUserEmail = extractUserEmailFromState(stateParam);

  try {
    // 4. Exchange the authorization code for a permanent access token
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

    const { access_token, scope } = await tokenRes.json();

    // 5. Persist the token in MongoDB
    const client = await clientPromise;
    const db = client.db("users");

    await db.collection("shopify_installations").updateOne(
      { shop },
      {
        $set: {
          shop,
          accessToken: access_token,
          scope: scope || "",
          installedAt: new Date(),
          active: true,
          ...(linkedUserEmail ? { linkedUserEmail } : {}),
        },
        $setOnInsert: {
          installationId: crypto.randomUUID(),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`✅ Shopify installed: ${shop}${linkedUserEmail ? ` (linked to ${linkedUserEmail})` : ""}`);

    // 6. Clear the OAuth state cookie and redirect to success page
    const response = NextResponse.redirect(new URL("/install-success", request.url));
    response.cookies.delete("shopify_oauth_state");
    return response;
  } catch (error) {
    console.error("Shopify callback error:", error);
    return new Response(`Installation failed: ${error.message}`, { status: 500 });
  }
}
