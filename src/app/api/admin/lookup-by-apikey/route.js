import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

const adminEmail = "galpaz@gmail.com"; // Admin user email

/**
 * GET /api/admin/lookup-by-apikey?apiKey=xxx
 * 
 * Admin endpoint to lookup user configuration by API key
 * Returns user details and processing configuration
 */
export async function GET(request) {
  // Check if user is authenticated and is admin
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauth();
  
  // Only allow admin user
  if (session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: "apiKey parameter is required" }, { status: 400 });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    // Find user by API key (exclude password)
    const user = await users.findOne(
      { apiKey },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found with provided API key" }, { status: 404 });
    }

    // Extract relevant information
    const {
      email,
      name,
      credentials = {},
      syncMode = "text",
      context = "",
      explain = false,
      createdAt,
      onboardingComplete
    } = user;

    const {
      dbName,
      platform,
      categories = [],
      type: userTypes = [],
      softCategories = [],
      shopifyDomain,
      wooUrl
    } = credentials;

    // Get product count from the user's database if dbName exists
    let productCount = 0;
    if (dbName) {
      try {
        const productDb = client.db(dbName);
        const productsCol = productDb.collection("products");
        productCount = await productsCol.countDocuments({});
      } catch (err) {
        console.warn(`Could not count products for ${dbName}:`, err.message);
      }
    }

    return NextResponse.json({
      user: {
        email,
        name,
        apiKey,
        onboardingComplete,
        createdAt
      },
      configuration: {
        dbName,
        platform,
        syncMode,
        context,
        explain,
        storeUrl: platform === "shopify" ? shopifyDomain : wooUrl,
        categories: {
          count: categories.length,
          list: categories
        },
        types: {
          count: userTypes.length,
          list: userTypes
        },
        softCategories: {
          count: softCategories.length,
          list: softCategories
        },
        productCount
      }
    });

  } catch (error) {
    console.error("❌ Error in admin lookup-by-apikey:", error);
    return NextResponse.json({ 
      error: "Failed to lookup user",
      details: error.message 
    }, { status: 500 });
  }
}

