import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import clientPromise from "/lib/mongodb";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

const adminEmail = "galpaz2210@gmail.com"; // Admin user email

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
    const searchName = searchParams.get('name');
    const apiKey = searchParams.get('apiKey');

    if (!searchName && !apiKey) {
      return NextResponse.json({ error: "name or apiKey parameter is required" }, { status: 400 });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    // Find user by name (case-insensitive) or apiKey fallback
    const query = searchName
      ? { name: { $regex: searchName, $options: 'i' } }
      : { apiKey };

    const user = await users.findOne(query, { projection: { password: 0 } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract relevant information
    const {
      email,
      name,
      apiKey: userApiKey,
      credentials = {},
      platform, // Platform is stored as a top-level field
      syncMode = "text",
      context = "",
      explain = false,
      createdAt,
      onboardingComplete,
      active
    } = user;

    const {
      dbName,
      categories = [],
      type: userTypes = [],
      softCategories = [],
      colors: userColors = [],
      softCategoryBoosts = {},
      shopifyDomain,
      wooUrl,
      siteConfig
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
        apiKey: userApiKey,
        onboardingComplete,
        createdAt,
        active: active !== false
      },
      credentials: {
        siteConfig: siteConfig || null
      },
      configuration: {
        dbName,
        platform,
        syncMode,
        context: context || '',
        explain: explain || false,
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
        colors: {
          count: userColors.length,
          list: userColors
        },
        softCategoryBoosts,
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

