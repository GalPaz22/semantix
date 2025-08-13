const { MongoClient } = require("mongodb");
const { classifyCategoryAndTypeWithGemini, summarizeMetadata } = require("./processWoo.js");
const dotenv = require("dotenv");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const LOCK_DIR = os.tmpdir(); // Use OS temp directory instead of hardcoded /tmp
const getLockFilePath = (dbName) => path.join(LOCK_DIR, `reprocessing_${dbName}.lock`);

async function reprocessProducts({ dbName, categories, userTypes }) {
  const logs = [];
  const lockFilePath = getLockFilePath(dbName);
  
  // Helper function to add logs and write to DB
  let statusCol;
  const addLog = async (message) => {
    logs.push(message);
    console.log(message);
    if (statusCol) {
      try {
        await statusCol.updateOne(
          { dbName },
          { $push: { logs: message } },
          { upsert: true }
        );
      } catch (err) {
        console.error("Failed to write log to DB:", err);
      }
    }
  };

  try {
    // Ensure lock directory exists
    await fs.mkdir(LOCK_DIR, { recursive: true });
    // Create lock file
    await fs.writeFile(lockFilePath, String(process.pid), { flag: 'w' });
    console.log(`Lock file created at: ${lockFilePath}`);
  } catch (error) {
    const errorMsg = `❌ Could not create lock file at ${lockFilePath}: ${error.message}`;
    logs.push(errorMsg);
    console.log(errorMsg);
    return logs;
  }

  await addLog(`🚀 Starting reprocessing for database: ${dbName}`);

  const client = new MongoClient(MONGO_URI, { connectTimeoutMS: 30000, serverSelectionTimeoutMS: 30000 });
  let runStartedAt = new Date();
  try {
    await client.connect();
    await addLog("✅ Connected to MongoDB");

    // Mark reprocess start on user document
    try {
      await client
        .db("users")
        .collection("users")
        .updateOne(
          { dbName },
          { $set: { reprocessStartedAt: runStartedAt } },
          { upsert: false }
        );
      await addLog("🕒 Marked reprocess start for user");
    } catch (userErr) {
      await addLog(`⚠️ Could not update user reprocess start: ${userErr.message}`);
    }
  } catch (err) {
    await addLog(`❌ MongoDB connection failed: ${err.message}`);
    await fs.unlink(lockFilePath);
    return logs;
  }

  const db = client.db(dbName);
  const collection = db.collection("products");
  statusCol = db.collection("sync_status");

  // Clear existing logs and initialize status
  await statusCol.updateOne(
    { dbName },
    { 
      $set: { 
        dbName, 
        state: "reprocessing", 
        progress: 0, 
        done: 0, 
        startedAt: runStartedAt,
        logs: [] 
      } 
    },
    { upsert: true }
  );

  // Clear existing categories and types before reprocessing
  try {
    const updateResult = await collection.updateMany(
      {},
      { $unset: { category: "", type: "" } }
    );
    await addLog(`🧹 Cleared existing categories and types for ${updateResult.modifiedCount} products.`);
  } catch (clearErr) {
    await addLog(`⚠️ Could not clear existing categories and types: ${clearErr.message}`);
  }

  // Ensure every product has a stamp: initialize missing stamps
  try {
    // 1) If fetchedAt exists, initialize stamp from fetchedAt (uses pipeline update)
    const initFromFetched = await collection.updateMany(
      { categoryTypeProcessedAt: { $exists: false }, fetchedAt: { $exists: true } },
      [ { $set: { categoryTypeProcessedAt: "$fetchedAt" } } ]
    );
    await addLog(`🧭 Initialized stamp from fetchedAt for ${initFromFetched.modifiedCount} products`);
  } catch (e) {
    await addLog(`⚠️ Pipeline update not supported, skipping init-from-fetchedAt: ${e.message}`);
  }

  // 2) Initialize remaining missing stamps to now
  const initToNow = await collection.updateMany(
    { categoryTypeProcessedAt: { $exists: false } },
    { $set: { categoryTypeProcessedAt: new Date() } }
  );
  await addLog(`🕒 Initialized missing stamp to now for ${initToNow.modifiedCount} products`);

  // Recency threshold: skip items processed within the last 24 hours
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - ONE_DAY_MS);
  await addLog(`⏱️ Using 24h recency threshold. Processing items with missing stamps or processed before: ${cutoffDate.toISOString()}`);

  // Inventory / skip stats
  try {
    const [totalCount, stampedCount, skippedByRecencyCount] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ categoryTypeProcessedAt: { $exists: true } }),
      collection.countDocuments({
        categoryTypeProcessedAt: { $gte: cutoffDate },
        category: { $exists: true },
        type: { $exists: true }
      })
    ]);
    await addLog(`📊 Inventory: total=${totalCount}, stamped=${stampedCount}, skipByRecency=${skippedByRecencyCount}`);
  } catch (countErr) {
    await addLog(`⚠️ Could not compute inventory stats: ${countErr.message}`);
  }

  const productsToProcess = await collection.find({
    $or: [
      { category: { $exists: false } },
      { type: { $exists: false } },
      { categoryTypeProcessedAt: { $exists: false } },
      { categoryTypeProcessedAt: { $lt: cutoffDate } }
    ]
  }).toArray();

  // Update progress in sync_status (store DB)
  const totalToProcess = productsToProcess.length;
  await statusCol.updateOne(
    { dbName },
    { $set: { state: totalToProcess > 0 ? "reprocessing" : "idle", total: totalToProcess } }
  );

  await addLog(`🔄 Processing ${totalToProcess} products for enrichment`);
  if (totalToProcess === 0) {
    await addLog("✅ Nothing to do. All products are either freshly processed (<24h) or complete.");
  }

  let done = 0;
  for (const product of productsToProcess) {
    try {
      await fs.access(lockFilePath);
    } catch (error) {
      await addLog("🛑 Reprocessing stopped by user.");
      // Mark status as idle/stopped
      await statusCol.updateOne(
        { dbName },
        { $set: { state: "idle", stoppedAt: new Date() } }
      );
      break;
    }

    try {
      await addLog(`\n🟡 Processing: ${product.name} (ID: ${product.id})`);

      const { name, description1, categories: productCategories, metadata } = product;

      if (!description1 || description1.trim() === "") {
        await addLog("⚠️ Skipping - no description1");
        // Mark as checked this run to avoid re-checking without data changes
        await collection.updateOne(
          { _id: product._id },
          { $set: { categoryTypeProcessedAt: new Date() } }
        );
      } else {
        let metadataAppend = '';
        if (metadata && Array.isArray(metadata)) {
          const summarization = await summarizeMetadata(metadata);
          metadataAppend = summarization;
        }

        let categoryAppend = '';
        if (productCategories && Array.isArray(productCategories)) {
          categoryAppend = productCategories
            .filter(cat => cat.name)
            .map(cat => cat.name)
            .join('\n');
        }

        const enrichedDescription = `${description1}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();

        const classificationResult = await classifyCategoryAndTypeWithGemini(enrichedDescription, name, categories, userTypes);
        const gptCategory = classificationResult.category;
        let productType = classificationResult.type || [];

        await collection.updateOne(
          { _id: product._id },
          { $set: { category: gptCategory, type: productType, categoryTypeProcessedAt: new Date() } }
        );

        await addLog(`✅ Updated category and type for: ${product.name}`);
      }

      // progress tick
      done += 1;
      const progress = totalToProcess > 0 ? Math.round((done / totalToProcess) * 100) : 100;
      await statusCol.updateOne(
        { dbName },
        { $set: { done, progress } }
      );

    } catch (error) {
      await addLog(`❌ Error processing product ${product.id}: ${error.message}`);
    }
  }

  // Mark reprocess finished
  try {
    await client
      .db("users")
      .collection("users")
      .updateOne(
        { dbName },
        { $set: { lastReprocessAt: new Date(), reprocessFinishedAt: new Date() } },
        { upsert: false }
      );
    await addLog("🏁 Marked reprocess finished for user");
  } catch (userErr) {
    await addLog(`⚠️ Could not update user reprocess finish: ${userErr.message}`);
  }

  // Mark status as done
  await statusCol.updateOne(
    { dbName },
    { $set: { state: "done", finishedAt: new Date(), done, progress: 100 } }
  );

  await addLog("📦 Reprocess summary: processed=" + (productsToProcess?.length || 0));

  await client.close();
  try {
    await fs.unlink(lockFilePath);
  } catch (error) {
    // Ignore errors if the file is already gone
  }
  await addLog("✅ Closed MongoDB connection");
  return logs;
}

module.exports = reprocessProducts; 