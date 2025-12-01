import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import reprocessProducts from "/lib/reprocess-products";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

const adminEmail = "galpaz2210@gmail.com"; // Admin user email

/**
 * POST /api/admin/process-by-apikey
 * 
 * Admin endpoint to trigger processing for any user by their API key
 * 
 * Body:
 * {
 *   "apiKey": "user-api-key-here",
 *   "options": {
 *     "reprocessAll": false,
 *     "reprocessCategories": true,
 *     "reprocessTypes": true,
 *     "reprocessSoftCategories": true,
 *     "reprocessDescriptions": false,
 *     "reprocessEmbeddings": false,
 *     "translateBeforeEmbedding": false
 *   }
 * }
 */
export async function POST(request) {
  // Check if user is authenticated and is admin
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauth();
  
  // Only allow admin user
  if (session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { apiKey, options } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    // Find user by API key
    const user = await users.findOne({ apiKey });

    if (!user) {
      return NextResponse.json({ error: "User not found with provided API key" }, { status: 404 });
    }

    // Extract user configuration
    const {
      email: userEmail,
      credentials = {},
      syncMode = "text",
      context = "",
      explain = false
    } = user;

    const {
      dbName,
      platform,
      categories = [],
      type: userTypes = [],
      softCategories = [],
      // Platform-specific credentials
      shopifyDomain,
      shopifyToken,
      wooUrl,
      wooKey,
      wooSecret
    } = credentials;

    // Validate required fields
    if (!dbName) {
      return NextResponse.json({ 
        error: "User configuration incomplete - missing dbName",
        userEmail 
      }, { status: 400 });
    }

    if (!platform) {
      return NextResponse.json({ 
        error: "User configuration incomplete - missing platform",
        userEmail 
      }, { status: 400 });
    }

    // Validate platform-specific credentials
    if (platform === "shopify" && (!shopifyDomain || !shopifyToken)) {
      return NextResponse.json({ 
        error: "User configuration incomplete - missing Shopify credentials",
        userEmail 
      }, { status: 400 });
    }

    if (platform === "woocommerce" && (!wooUrl || !wooKey || !wooSecret)) {
      return NextResponse.json({ 
        error: "User configuration incomplete - missing WooCommerce credentials",
        userEmail 
      }, { status: 400 });
    }

    console.log(`🔑 Admin processing triggered for user: ${userEmail} (${platform})`);
    console.log(`📦 Database: ${dbName}`);
    console.log(`🏷️ Categories: ${categories.length}`);
    console.log(`🏷️ Types: ${userTypes.length}`);
    console.log(`🏷️ Soft Categories: ${softCategories.length}`);

    // Prepare processing options with defaults
    const processingOptions = {
      reprocessAll: options?.reprocessAll || false,
      reprocessHardCategories: options?.reprocessHardCategories !== undefined 
        ? options.reprocessHardCategories 
        : true,
      reprocessTypes: options?.reprocessTypes !== undefined 
        ? options.reprocessTypes 
        : true,
      reprocessSoftCategories: options?.reprocessSoftCategories !== undefined 
        ? options.reprocessSoftCategories 
        : true,
      reprocessVariants: options?.reprocessVariants !== undefined 
        ? options.reprocessVariants 
        : false,
      reprocessDescriptions: options?.reprocessDescriptions !== undefined 
        ? options.reprocessDescriptions 
        : false,
      reprocessEmbeddings: options?.reprocessEmbeddings !== undefined 
        ? options.reprocessEmbeddings 
        : false,
      translateBeforeEmbedding: options?.translateBeforeEmbedding !== undefined 
        ? options.translateBeforeEmbedding 
        : false
    };

    // Trigger reprocessing (this runs in background)
    // Match the signature expected by reprocess-products.js
    reprocessProducts({
      dbName,
      categories,
      userTypes,
      softCategories,
      targetCategory: options?.targetCategory || null,
      missingSoftCategoryOnly: options?.missingSoftCategoryOnly || false,
      options: processingOptions
    }).catch(err => {
      console.error(`❌ Error in background processing for ${userEmail}:`, err);
    });

    // Return immediately
    return NextResponse.json({
      success: true,
      message: "Processing started in background",
      user: {
        email: userEmail,
        platform,
        dbName,
        categoriesCount: categories.length,
        typesCount: userTypes.length,
        softCategoriesCount: softCategories.length
      },
      options: processingOptions
    });

  } catch (error) {
    console.error("❌ Error in admin process-by-apikey:", error);
    return NextResponse.json({ 
      error: "Failed to process request",
      details: error.message 
    }, { status: 500 });
  }
}

