import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb.js";

export async function POST(request) {
  console.log("REPROCESS API: Received request.");
  try {
    const { dbName } = await request.json();
    console.log(`REPROCESS API: Starting reprocessing for db: ${dbName}`);
    
    // Get categories and userTypes from onboarding data
    const client = await clientPromise;
    const usersDb = client.db("users");
    const usersCollection = usersDb.collection("users");
    
    const userDoc = await usersCollection.findOne({ dbName });
    if (!userDoc) {
      throw new Error("User not found");
    }
    
    const categories = userDoc.credentials?.categories || [];
    const userTypes = userDoc.credentials?.type || [];
    
    console.log(`REPROCESS API: Found user data - categories: ${categories.length}, types: ${userTypes.length}`);
    console.log(`REPROCESS API: Categories:`, categories);
    console.log(`REPROCESS API: Types:`, userTypes);
    
    // Dynamic imports for CommonJS modules
    const { setJobState } = await import("../../../../lib/syncStatus.js");
    const reprocessProducts = (await import("../../../../lib/reprocess-products.js")).default;
    
    // Set the job state to "running"
    await setJobState(dbName, "running");

    // Run the reprocessing in the background
    (async () => {
      try {
        await reprocessProducts({ dbName, categories, userTypes });
        await setJobState(dbName, "done");
        console.log("REPROCESS API: Background reprocessing finished.");
      } catch (err) {
        console.error("REPROCESS API BACKGROUND ERROR:", err);
        await setJobState(dbName, "error");
      }
    })();

    // Immediately return a response indicating the job is running
    return NextResponse.json({ state: "running" });
  } catch (error) {
    console.error("REPROCESS API ERROR:", error);
    return NextResponse.json({ error: `Server error: ${error.message}` }, { status: 500 });
  }
} 