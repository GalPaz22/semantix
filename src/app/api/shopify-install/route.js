import { NextResponse } from "next/server";
import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const REDIRECT_URI = "https://www.semantix.co.il/api/shopify-auth-callback";
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
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
}

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const shop = searchParams.get("shop");

  if (!shop) {
    return new Response("Missing shop", { status: 400 });
  }

  if (!verifyHmac(searchParams)) {
    return new Response("Invalid HMAC", { status: 401 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const formattedShop = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

  const authUrl = `https://${formattedShop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

  return NextResponse.redirect(authUrl);
}
