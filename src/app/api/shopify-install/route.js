import { NextResponse } from "next/server";
import crypto from "crypto";

const CLIENT_ID    = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.semantix.co.il"}/api/shopify-auth-callback`;
const SCOPES       = "read_products,write_products,read_themes,write_themes,read_content,write_content";

function resolveShop(searchParams) {
  const shop = searchParams.get("shop");
  if (shop) return shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

  // Shopify App URL sends host = base64url("admin.shopify.com/store/SHOP-NAME")
  const host = searchParams.get("host");
  if (host) {
    try {
      const decoded = Buffer.from(host, "base64url").toString("utf8");
      const match   = decoded.match(/\/store\/([a-z0-9-]+)/i);
      if (match) return `${match[1]}.myshopify.com`;
    } catch { /* ignore */ }
  }
  return null;
}

// GET /api/shopify-install?shop=STORE.myshopify.com
// ─── just forward the merchant straight to Shopify's install/authorize screen ───
export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const shop = resolveShop(searchParams);

  if (!shop) return new Response("Missing shop", { status: 400 });
  if (!CLIENT_ID) return new Response("App not configured (missing NEXT_PUBLIC_SHOPIFY_API_KEY)", { status: 500 });

  const state = crypto.randomBytes(16).toString("hex");

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
