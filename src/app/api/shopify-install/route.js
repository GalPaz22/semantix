import { NextResponse } from "next/server";
import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.semantix.co.il"}/api/shopify-auth-callback`;
const SCOPES = "read_products,write_products,read_themes,write_themes,read_content,write_content";

function verifyHmac(searchParams) {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;
  const params = {};
  searchParams.forEach((value, key) => {
    if (key !== "hmac") params[key] = value;
  });
  const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const expected = crypto.createHmac("sha256", SHOPIFY_API_SECRET).update(message).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

function normalizeShop(shop) {
  if (!shop) return null;
  const clean = shop.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(clean)) return null;
  return clean;
}

// GET /api/shopify-install?shop=...
// Called by Shopify when the merchant opens the app (App URL).
// Also used as a direct install link: https://www.semantix.co.il/api/shopify-install?shop=store.myshopify.com
export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const rawShop = searchParams.get("shop");
  const shop = normalizeShop(rawShop);

  if (!shop) {
    return new Response("Invalid or missing shop parameter", { status: 400 });
  }

  // If Shopify added HMAC (app opened from Shopify Admin), verify it.
  // If no HMAC (direct install link we sent to the customer), skip.
  const hmacParam = searchParams.get("hmac");
  if (hmacParam && !verifyHmac(searchParams)) {
    return new Response("Invalid HMAC signature", { status: 401 });
  }

  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", SHOPIFY_API_KEY);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  // Save state in a cookie so the callback can verify it (CSRF protection).
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
