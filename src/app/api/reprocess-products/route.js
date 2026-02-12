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
      colors,
      targetCategory, 
      missingSoftCategoryOnly,
      onlyWithoutSoftCategories, // New parameter from AdminPanel
      onlyUnprocessed, // New parameter for fresh products
      // New reprocessing options
      reprocessHardCategories,
      reprocessSoftCategories,
      reprocessTypes,
      reprocessColors,
      reprocessVariants,
      reprocessEmbeddings,
      reprocessDescriptions,
      translateBeforeEmbedding,
      reprocessAll,
      // Incremental mode
      incrementalMode,
      incrementalSoftCategories,
      incrementalHardCategories
    } = await request.json();
    
    // Map the new parameter to the existing one
    const filterMissingSoftCategories = onlyWithoutSoftCategories || missingSoftCategoryOnly || false;
    const filterOnlyUnprocessed = onlyUnprocessed || false;
    
    console.log(`📝 DB Name from request: ${dbNameFromRequest}`);
    console.log("📝 Categories from request:", categories);
    console.log("📝 Types from request:", userTypes);
    console.log("📝 Soft Categories from request:", softCategories);
    console.log("📝 Target Category from request:", targetCategory);
    console.log("📝 Only Without Soft Categories from request:", filterMissingSoftCategories);
    console.log("📝 Only Unprocessed from request:", filterOnlyUnprocessed);
    console.log("📝 Incremental Mode from request:", incrementalMode);
    console.log("📝 Incremental Soft Categories from request:", incrementalSoftCategories);
    console.log("📝 Incremental Hard Categories from request:", incrementalHardCategories);
    
    // Log reprocessing options
    console.log("📝 Reprocess Options:");
    console.log("- Hard Categories:", reprocessHardCategories !== undefined ? reprocessHardCategories : "default (true)");
    console.log("- Soft Categories:", reprocessSoftCategories !== undefined ? reprocessSoftCategories : "default (true)");
    console.log("- Types:", reprocessTypes !== undefined ? reprocessTypes : "default (true)");
    console.log("- Variants:", reprocessVariants !== undefined ? reprocessVariants : "default (true)");
    console.log("- Embeddings:", reprocessEmbeddings !== undefined ? reprocessEmbeddings : "default (false)");
    console.log("- Descriptions:", reprocessDescriptions !== undefined ? reprocessDescriptions : "default (false)");
    console.log("- Translation:", translateBeforeEmbedding !== undefined ? translateBeforeEmbedding : "default (false)");
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
    console.log("filterMissingSoftCategories:", filterMissingSoftCategories);

    // Basic validation
    if (!userDbName || !categories) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    // Import modules
    const { setJobState } = await import("../../../../lib/syncStatus.js");
    const reprocessModule = await import("../../../../lib/reprocess-products.js");
    const reprocessProducts = reprocessModule.default;

    // Set job state
    await setJobState(userDbName, "running");

    // If incremental mode, merge new categories with existing ones and update user document
    let finalSoftCategories = softCategories || [];
    let finalCategories = categories || [];
    if (incrementalMode && incrementalSoftCategories && incrementalSoftCategories.length > 0) {
      // Merge and remove duplicates
      const mergedCategories = [...new Set([...finalSoftCategories, ...incrementalSoftCategories])];
      finalSoftCategories = mergedCategories;

      // Update user document with merged soft categories under credentials
      try {
        await usersCollection.updateOne(
          { dbName: dbNameFromRequest },
          { $set: { "credentials.softCategories": mergedCategories } }
        );
        console.log(`✅ Updated user credentials.softCategories: added ${incrementalSoftCategories.length} new categories`);
        console.log(`📝 New total soft categories: ${mergedCategories.length}`);
      } catch (updateErr) {
        console.error("⚠️ Failed to update user softCategories:", updateErr);
      }
    }
    if (incrementalMode && incrementalHardCategories && incrementalHardCategories.length > 0) {
      // Merge and remove duplicates
      const mergedHardCategories = [...new Set([...finalCategories, ...incrementalHardCategories])];
      finalCategories = mergedHardCategories;

      // Update user document with merged hard categories under credentials
      try {
        await usersCollection.updateOne(
          { dbName: dbNameFromRequest },
          { $set: { "credentials.categories": mergedHardCategories } }
        );
        console.log(`✅ Updated user credentials.categories: added ${incrementalHardCategories.length} new hard categories`);
        console.log(`📝 New total hard categories: ${mergedHardCategories.length}`);
      } catch (updateErr) {
        console.error("⚠️ Failed to update user categories:", updateErr);
      }
    }

    // Create the payload - handle undefined values
    const payload = {
      dbName: userDbName,
      categories: finalCategories,  // Use merged categories
      userTypes: userTypes || [],  // Fallback to empty array
      softCategories: finalSoftCategories,  // Use merged categories
      colors: colors || [],  // Colors filter
      targetCategory: targetCategory || null,  // Optional category filter
      missingSoftCategoryOnly: filterMissingSoftCategories,  // Filter for products without soft categories
      onlyUnprocessed: filterOnlyUnprocessed, // Filter for fresh products
      incrementalMode: incrementalMode || false, // Incremental mode for adding new categories
      incrementalSoftCategories: incrementalSoftCategories || [], // New soft categories to add
      incrementalHardCategories: incrementalHardCategories || [], // New hard categories to add
      
      // Add reprocessing options if provided
      options: {
        reprocessHardCategories: reprocessHardCategories !== undefined ? reprocessHardCategories : true,
        reprocessSoftCategories: reprocessSoftCategories !== undefined ? reprocessSoftCategories : true,
        reprocessTypes: reprocessTypes !== undefined ? reprocessTypes : true,
        reprocessColors: reprocessColors !== undefined ? reprocessColors : true,
        reprocessVariants: reprocessVariants !== undefined ? reprocessVariants : true,
        reprocessEmbeddings: reprocessEmbeddings !== undefined ? reprocessEmbeddings : false,
        reprocessDescriptions: reprocessDescriptions !== undefined ? reprocessDescriptions : false,
        translateBeforeEmbedding: translateBeforeEmbedding !== undefined ? translateBeforeEmbedding : false,
        reprocessAll: reprocessAll !== undefined ? reprocessAll : false
      }
    };

    console.log("🚀 PAYLOAD BEING SENT TO REPROCESS:");
    console.log("dbName:", payload.dbName);
    console.log("categories length:", payload.categories.length);
    console.log("userTypes length:", payload.userTypes.length);
    console.log("softCategories length:", payload.softCategories.length);
    console.log("targetCategory:", payload.targetCategory);
    console.log("missingSoftCategoryOnly (filter):", payload.missingSoftCategoryOnly);
    console.log("reprocessing options:", payload.options);

    // Background processing
    (async () => {
      try {
        await reprocessProducts(payload);
        await setJobState(userDbName, "done");
        console.log("✅ Background processing completed");
      } catch (err) {
        console.error("❌ Background processing error:", err);
        await setJobState(userDbName, "error");
      }
    })();

    return NextResponse.json({ 
      state: "running",
      debug: {
        foundUserTypes: userTypes !== undefined,
        foundSoftCategories: softCategories !== undefined,
        userTypesLength: userTypes?.length || 0,
        softCategoriesLength: softCategories?.length || 0
      }
    });

  } catch (error) {
    console.error("💥 MAIN ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}