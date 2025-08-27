import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb.js";

export async function POST(request) {
  console.log("🚀 REPROCESS API: Starting...");
  
  try {
    const { dbName: dbNameFromRequest, categories, type: userTypes, softCategories } = await request.json();
    console.log(`📝 DB Name from request: ${dbNameFromRequest}`);
    console.log("📝 Categories from request:", categories);
    console.log("📝 Types from request:", userTypes);
    console.log("📝 Soft Categories from request:", softCategories);
    
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

    if (!userDoc.credentials) {
      console.error("❌ No credentials found!");
      throw new Error(`Credentials not found`);
    }
    console.log("✅ Credentials exist!");

    // Use data from request body instead of database
    const userDbName = dbNameFromRequest;
    
    console.log("🎯 USING DATA FROM REQUEST:");
    console.log("userDbName:", userDbName);
    console.log("categories:", categories ? `Array(${categories.length})` : "UNDEFINED");
    console.log("userTypes:", userTypes ? `Array(${userTypes.length})` : "UNDEFINED");
    console.log("softCategories:", softCategories ? `Array(${softCategories.length})` : "UNDEFINED");

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

    // Create the payload - handle undefined values
    const payload = {
      dbName: userDbName,
      categories: categories,
      userTypes: userTypes || [],  // Fallback to empty array
      softCategories: softCategories || []  // Fallback to empty array
    };

    console.log("🚀 PAYLOAD BEING SENT TO REPROCESS:");
    console.log("dbName:", payload.dbName);
    console.log("categories length:", payload.categories.length);
    console.log("userTypes length:", payload.userTypes.length);
    console.log("softCategories length:", payload.softCategories.length);

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