import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb.js";

export async function POST(request) {
  console.log("🚀 REPROCESS API: Starting...");
  
  try {
    const { 
      dbName: dbNameFromRequest, 
      categories, 
      type: userTypes, 
      softCategories, 
      targetCategory, 
      missingSoftCategoryOnly,
      // New reprocessing options
      reprocessHardCategories,
      reprocessSoftCategories,
      reprocessTypes,
      reprocessVariants,
      reprocessEmbeddings,
      reprocessDescriptions,
      reprocessAll
    } = await request.json();
    console.log(`📝 DB Name from request: ${dbNameFromRequest}`);
    console.log("📝 Categories from request:", categories);
    console.log("📝 Types from request:", userTypes);
    console.log("📝 Soft Categories from request:", softCategories);
    console.log("📝 Target Category from request:", targetCategory);
    console.log("📝 Missing Soft Category Only from request:", missingSoftCategoryOnly);
    
    // Log reprocessing options
    console.log("📝 Reprocess Options:");
    console.log("- Hard Categories:", reprocessHardCategories !== undefined ? reprocessHardCategories : "default (true)");
    console.log("- Soft Categories:", reprocessSoftCategories !== undefined ? reprocessSoftCategories : "default (true)");
    console.log("- Types:", reprocessTypes !== undefined ? reprocessTypes : "default (true)");
    console.log("- Variants:", reprocessVariants !== undefined ? reprocessVariants : "default (true)");
    console.log("- Embeddings:", reprocessEmbeddings !== undefined ? reprocessEmbeddings : "default (false)");
    console.log("- Descriptions:", reprocessDescriptions !== undefined ? reprocessDescriptions : "default (false)");
    console.log("- All:", reprocessAll !== undefined ? reprocessAll : "default (false)");
    
    const client = await clientPromise;
    const usersDb = client.db("users");
    const usersCollection = usersDb.collection("users");
    
    console.log("🔍 Searching for user in MongoDB...");
    const userDoc = await usersCollection.findOne({ dbName: dbNameFromRequest });
    
    if (!userDoc) {
      console.error("❌ User not found!");
      throw new Error(`User not found for dbName: ${dbNameFromRequest}`);
    }
    console.log("✅ User found!");

    // Note: Reprocessing doesn't require credentials, only dbName
    console.log("✅ User found, proceeding with reprocessing");

    // Use data from request body instead of database
    const userDbName = dbNameFromRequest;
    
    console.log("🎯 USING DATA FROM REQUEST:");
    console.log("userDbName:", userDbName);
    console.log("categories:", categories ? `Array(${categories.length})` : "UNDEFINED");
    console.log("userTypes:", userTypes ? `Array(${userTypes.length})` : "UNDEFINED");
    console.log("softCategories:", softCategories ? `Array(${softCategories.length})` : "UNDEFINED");
    console.log("targetCategory:", targetCategory || "NONE");
    console.log("missingSoftCategoryOnly:", missingSoftCategoryOnly || false);

    // Basic validation
    if (!userDbName || !categories) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    // Import setJobState
    const { setJobState } = await import("../../../../lib/syncStatus.js");

    // Set job state
    await setJobState(userDbName, "running");

    // Create the payload - handle undefined values
    const payload = {
      dbName: userDbName,
      categories: categories,
      userTypes: userTypes || [],  // Fallback to empty array
      softCategories: softCategories || [],  // Fallback to empty array
      targetCategory: targetCategory || null,  // Optional category filter
      missingSoftCategoryOnly: missingSoftCategoryOnly || false,  // Optional missing field filter
      
      // Add reprocessing options if provided
      options: {
        reprocessHardCategories: reprocessHardCategories !== undefined ? reprocessHardCategories : true,
        reprocessSoftCategories: reprocessSoftCategories !== undefined ? reprocessSoftCategories : true,
        reprocessTypes: reprocessTypes !== undefined ? reprocessTypes : true,
        reprocessVariants: reprocessVariants !== undefined ? reprocessVariants : true,
        reprocessEmbeddings: reprocessEmbeddings !== undefined ? reprocessEmbeddings : false,
        reprocessDescriptions: reprocessDescriptions !== undefined ? reprocessDescriptions : false,
        reprocessAll: reprocessAll !== undefined ? reprocessAll : false
      }
    };

    console.log("🚀 FORWARDING PAYLOAD TO BACKEND:");
    console.log("dbName:", payload.dbName);
    console.log("categories length:", payload.categories.length);
    console.log("userTypes length:", payload.userTypes.length);
    console.log("softCategories length:", payload.softCategories.length);
    console.log("targetCategory:", payload.targetCategory);
    console.log("missingSoftCategoryOnly:", payload.missingSoftCategoryOnly);
    console.log("reprocessing options:", payload.options);

    // Forward to backend server
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      console.log(`📡 Forwarding to ${backendUrl}/api/reprocess-products`);
      
      const backendResponse = await fetch(`${backendUrl}/api/reprocess-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await backendResponse.json();
      
      if (!backendResponse.ok) {
        throw new Error(result.error || 'Backend reprocessing failed');
      }

      console.log("✅ Backend reprocessing request accepted");
      
      return NextResponse.json({ 
        state: "running",
        debug: {
          foundUserTypes: userTypes !== undefined,
          foundSoftCategories: softCategories !== undefined,
          userTypesLength: userTypes?.length || 0,
          softCategoriesLength: softCategories?.length || 0
        }
      });
    } catch (err) {
      console.error("❌ Backend forwarding error:", err);
      await setJobState(userDbName, "error");
      throw err;
    }

  } catch (error) {
    console.error("💥 MAIN ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}