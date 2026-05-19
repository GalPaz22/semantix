import { NextResponse } from "next/server";
import clientPromise from "/lib/mongodb";
import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

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

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
}

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");

  if (!code || !shop) {
    return new Response("Missing code or shop", { status: 400 });
  }

  // Verify request is genuinely from Shopify
  if (!verifyShopifyHmac(searchParams)) {
    return new Response("Invalid HMAC", { status: 401 });
  }

  try {
    // Exchange code for access token
    const formattedShop = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;
    const tokenRes = await fetch(`https://${formattedShop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.statusText}`);
    }

    const { access_token, scope } = await tokenRes.json();

    // Save to MongoDB — no user association needed
    const client = await clientPromise;
    const db = client.db("users");
    await db.collection("shopify_installations").updateOne(
      { shop: formattedShop },
      {
        $set: {
          shop: formattedShop,
          accessToken: access_token,
          scope: scope || "",
          installedAt: new Date(),
          active: true,
        },
        $setOnInsert: {
          installationId: crypto.randomUUID(),
        },
      },
      { upsert: true }
    );

    console.log(`✅ Shopify installed: ${formattedShop} | token: ${access_token}`);

    // Redirect to a simple success page
    return NextResponse.redirect(new URL("/install-success", request.url));
  } catch (error) {
    console.error("Shopify callback error:", error);
    return new Response(`Installation failed: ${error.message}`, { status: 500 });
  }
}
