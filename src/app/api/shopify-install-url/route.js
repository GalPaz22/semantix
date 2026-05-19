import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { generateAuthUrl, APP_URL, AUTH_CALLBACK_URL } from "/lib/shopify-app-config";
import crypto from "crypto";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { shop } = await request.json();

    if (!shop) {
      return NextResponse.json({ error: "Shop domain required" }, { status: 400 });
    }

    // Build a self-verifying state: encodes user email + timestamp, signed with HMAC.
    // The callback can re-verify this without needing server-side session storage.
    const payload = `${session.user.email}:${Date.now()}`;
    const hmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(payload)
      .digest("hex");
    const state = Buffer.from(JSON.stringify({ payload, hmac })).toString("base64url");

    const redirectUri = `${APP_URL}${AUTH_CALLBACK_URL}`;
    const url = generateAuthUrl(shop, state, redirectUri);

    // Also save state in a cookie as a second CSRF layer.
    const response = NextResponse.json({ url });
    response.cookies.set("shopify_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    console.error("Error generating Shopify installation URL:", error);
    return NextResponse.json({ error: "Failed to generate installation URL" }, { status: 500 });
  }
}
