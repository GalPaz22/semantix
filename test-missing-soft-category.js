const { MongoClient } = require("mongodb");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

async function testMissingSoftCategoryQuery() {
  console.log("🧪 Testing Missing Soft Category Query Logic");
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    // Replace 'your-db-name' with your actual database name
    const dbName = "alcohome"; // Change this to your database name
    const db = client.db(dbName);
    const collection = db.collection("products");
    
    console.log(`\n🔍 Testing queries on database: ${dbName}`);
    
    // Test 1: Base query (in-stock products with embeddings)
    const baseQuery = {
      embedding: { $exists: true, $ne: null },
      stockStatus: "instock"
    };
    const baseCount = await collection.countDocuments(baseQuery);
    console.log(`📊 Base query (in-stock + embeddings): ${baseCount} products`);
    
    // Test 2: Products with categories
    const withCategoriesQuery = {
      ...baseQuery,
      category: { $exists: true, $ne: null, $not: { $eq: [] } }
    };
    const withCategoriesCount = await collection.countDocuments(withCategoriesQuery);
    console.log(`📊 Products with categories: ${withCategoriesCount} products`);
    
    // Test 3: Products without softCategory field
    const withoutSoftCategoryQuery = {
      ...baseQuery,
      softCategory: { $exists: false }
    };
    const withoutSoftCategoryCount = await collection.countDocuments(withoutSoftCategoryQuery);
    console.log(`📊 Products without softCategory field: ${withoutSoftCategoryCount} products`);
    
    // Test 4: The actual target query (categories + missing softCategory)
    const targetQuery = {
      ...baseQuery,
      $and: [
        { category: { $exists: true, $ne: null, $not: { $eq: [] } } },
        { softCategory: { $exists: false } }
      ]
    };
    const targetCount = await collection.countDocuments(targetQuery);
    console.log(`🎯 TARGET QUERY (categories + missing softCategory): ${targetCount} products`);
    
    console.log(`\n📋 Query Details:`);
    console.log(JSON.stringify(targetQuery, null, 2));
    
    // Get a sample product that matches
    if (targetCount > 0) {
      const sample = await collection.findOne(targetQuery);
      console.log(`\n🔍 Sample matching product:`);
      console.log(`- ID: ${sample._id}`);
      console.log(`- Name: ${sample.name || 'N/A'}`);
      console.log(`- Has category: ${!!sample.category}`);
      console.log(`- Category value: ${JSON.stringify(sample.category)}`);
      console.log(`- Has softCategory: ${!!sample.softCategory}`);
      console.log(`- SoftCategory value: ${JSON.stringify(sample.softCategory)}`);
    } else {
      console.log(`\n❌ No products found matching the target query`);
      
      // Let's see why - check some examples
      const sampleWithCategory = await collection.findOne(withCategoriesQuery);
      if (sampleWithCategory) {
        console.log(`\n🔍 Sample product WITH category:`);
        console.log(`- Has softCategory: ${!!sampleWithCategory.softCategory}`);
        console.log(`- SoftCategory value: ${JSON.stringify(sampleWithCategory.softCategory)}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Test error:", error);
  } finally {
    await client.close();
    console.log("✅ Closed MongoDB connection");
  }
}

testMissingSoftCategoryQuery(); 