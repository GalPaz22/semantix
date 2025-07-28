import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import { WEBHOOK_TOPICS, APP_URL } from "/lib/shopify-app-config";

export async function POST(request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Get the shop domain and access token from the request
    const { shop } = await request.json();
    
    if (!shop) {
      return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
    }
    
    // Get the user's Shopify access token from the database
    const client = await clientPromise;
    const db = client.db("users");
    const user = await db.collection("users").findOne({ email: session.user.email });
    
    if (!user || !user.shopifyAccessToken) {
      return NextResponse.json({ error: "No Shopify access token found" }, { status: 400 });
    }
    
    const accessToken = user.shopifyAccessToken;
    
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
        userId: user._id,
        userEmail: user.email
      }));
    
    if (successfulWebhooks.length > 0) {
      await db.collection("shopify_webhook_registrations").insertMany(successfulWebhooks);
    }
    
    return NextResponse.json({
      success: true,
      registered: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error("Error registering webhooks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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