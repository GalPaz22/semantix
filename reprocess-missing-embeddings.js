/**
 * Utility script to reprocess products without embeddings in a specific database
 * 
 * Usage:
 * node reprocess-missing-embeddings.js <dbName> [options]
 * 
 * Options:
 *  --limit=100                 Limit the number of products to process (default: 100)
 *  --embedding-only            Only generate embeddings without other processing
 *  --reprocess-all             Reprocess all aspects of the products
 *  --reprocess-descriptions    Generate new descriptions
 * 
 * Examples:
 * node reprocess-missing-embeddings.js store_123456 --limit=50 --embedding-only
 * node reprocess-missing-embeddings.js store_123456 --reprocess-all
 */

const { MongoClient } = require("mongodb");
const reprocessProducts = require('./lib/reprocess-products');
const { findProductsWithoutEmbeddings } = reprocessProducts;
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI if available
const openai = OPENAI_API_KEY && OPENAI_API_KEY !== "YOUR_OPENAI_API_KEY" 
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

async function reprocessMissingEmbeddings() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dbName = args[0];
  
  // Parse options
  const options = {
    limit: 100,
    embeddingOnly: false,
    reprocessAll: false,
    reprocessDescriptions: false
  };
  
  // Process command line arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--embedding-only') {
      options.embeddingOnly = true;
    } else if (arg === '--reprocess-all') {
      options.reprocessAll = true;
    } else if (arg === '--reprocess-descriptions') {
      options.reprocessDescriptions = true;
    }
  }
  
  if (!dbName) {
    console.error('❌ Error: Database name is required');
    console.log('Usage: node reprocess-missing-embeddings.js <dbName> [options]');
    process.exit(1);
  }
  
  if (!openai) {
    console.error('❌ Error: OpenAI API key is not configured');
    process.exit(1);
  }
  
  console.log(`🚀 Starting reprocessing for database: ${dbName}`);
  console.log(`📊 Options: limit=${options.limit}, embeddingOnly=${options.embeddingOnly}, reprocessAll=${options.reprocessAll}, reprocessDescriptions=${options.reprocessDescriptions}`);
  
  try {
    // Find products without embeddings
    console.log(`🔍 Finding products without embeddings (limit: ${options.limit})...`);
    const result = await findProductsWithoutEmbeddings(dbName, options.limit);
    
    if (result.products.length === 0) {
      console.log('✅ No products found without embeddings. Nothing to do.');
      return;
    }
    
    console.log(`📋 Found ${result.products.length} products without embeddings (total: ${result.totalCount})`);
    
    // Connect to MongoDB
    const client = new MongoClient(MONGO_URI, { 
      connectTimeoutMS: 60000,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true
    });
    
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db(dbName);
    const collection = db.collection("products");
    
    // Process each product
    let processed = 0;
    let skipped = 0;
    let succeeded = 0;
    
    for (const product of result.products) {
      try {
        console.log(`\n🔄 Processing product: ${product.name} (ID: ${product.id})`);
        
        // Skip products without description
        if (!product.description1 || product.description1.trim() === '') {
          console.log(`⚠️ Skipping - no description available`);
          skipped++;
          continue;
        }
        
        // Create update data
        const updateData = {
          categoryTypeProcessedAt: new Date()
        };
        
        // Generate embedding
        try {
          console.log(`🧮 Generating embedding...`);
          
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: product.description1,
          });
          
          updateData.embedding = embeddingResponse.data[0].embedding;
          console.log(`✅ Successfully generated embedding`);
          
          // Update the product in the database
          await collection.updateOne(
            { _id: product._id },
            { $set: updateData }
          );
          
          console.log(`✅ Updated product ${product.id} with new embedding`);
          succeeded++;
          
        } catch (embeddingError) {
          console.error(`❌ Error generating embedding: ${embeddingError.message}`);
          skipped++;
        }
        
        processed++;
        
      } catch (productError) {
        console.error(`❌ Error processing product ${product.id}: ${productError.message}`);
        skipped++;
      }
    }
    
    // Close the MongoDB connection
    await client.close();
    console.log("✅ Closed MongoDB connection");
    
    // Print summary
    console.log(`\n📊 Processing Summary:`);
    console.log(`🔢 Total products found: ${result.products.length}`);
    console.log(`✅ Successfully processed: ${succeeded}`);
    console.log(`⚠️ Skipped: ${skipped}`);
    console.log(`🎯 Success rate: ${((succeeded / result.products.length) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

reprocessMissingEmbeddings(); 