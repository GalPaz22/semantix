import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import { shopifyAdminApiRequest } from "/lib/shopify-app-config";

export async function GET(request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Get the user's Shopify connection details from the database
    const client = await clientPromise;
    const db = client.db("users");
    const user = await db.collection("users").findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Check if the user has Shopify connected
    if (!user.shopifyConnected || !user.shopifyAccessToken || !user.shopifyShop) {
      return NextResponse.json({
        connected: false,
        message: "Shopify not connected"
      });
    }
    
    // Try to make a test API call to verify the connection
    try {
      const shopData = await shopifyAdminApiRequest(
        user.shopifyShop,
        user.shopifyAccessToken,
        'shop.json'
      );
      
      // Get webhook registrations
      const webhooks = await db.collection("shopify_webhook_registrations")
        .find({ userEmail: user.email })
        .toArray();
      
      return NextResponse.json({
        connected: true,
        shop: {
          domain: user.shopifyShop,
          name: shopData.shop.name,
          email: shopData.shop.email,
          plan: shopData.shop.plan_name,
          connectedAt: user.shopifyConnectedAt
        },
        webhooks: webhooks.length,
        scope: user.shopifyScope || ""
      });
    } catch (error) {
      // If the API call fails, the token might be invalid
      console.error("Shopify API error:", error);
      
      return NextResponse.json({
        connected: false,
        error: "Invalid or expired access token",
        message: error.message
      });
    }
  } catch (error) {
    console.error("Error checking Shopify connection:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 