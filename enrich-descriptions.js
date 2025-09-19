/**
 * Script to enrich product descriptions by translating and enhancing them
 * 
 * Usage:
 * node enrich-descriptions.js <dbName> [options]
 * 
 * Options:
 *  --limit=100                 Limit the number of products to process (default: 100)
 *  --missing-only              Only process products with missing enriched descriptions
 *  --force                     Force reprocessing even if description1 exists
 * 
 * Example:
 * node enrich-descriptions.js store_123456 --limit=50 --missing-only
 */

const { MongoClient } = require("mongodb");
const { GoogleGenAI } = require('@google/genai');
const dotenv = require("dotenv");
const OpenAI = require("openai");
const reprocessProducts = require('./lib/reprocess-products');

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize Google AI if available
const ai = GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== "YOUR_GOOGLE_AI_KEY" 
  ? new GoogleGenAI({apiKey: GOOGLE_AI_API_KEY})
  : null;

// Initialize OpenAI if available
const openai = OPENAI_API_KEY && OPENAI_API_KEY !== "YOUR_OPENAI_API_KEY" 
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

/**
 * Find products that need description enrichment
 * @param {Object} db - MongoDB database connection
 * @param {Object} options - Options for finding products
 * @returns {Array} - Products that need description enrichment
 */
async function findProductsForEnrichment(db, options) {
  const collection = db.collection("products");
  
  // Build query based on options
  let query = {};
  
  if (options.missingOnly) {
    // Find products with any original description field but missing enriched description1
    query = {
      $and: [
        // Must have at least one of these description fields
        {
          $or: [
            { description: { $exists: true, $ne: "", $ne: null } },
            { short_description: { $exists: true, $ne: "", $ne: null } },
            { name: { $exists: true, $ne: "", $ne: null } }
          ]
        },
        // Must be missing description1
        {
          $or: [
            { description1: { $exists: false } },
            { description1: "" },
            { description1: null }
          ]
        }
      ]
    };
  } else if (options.force) {
    // Force reprocessing of all products with any description field
    query = {
      $or: [
        { description: { $exists: true, $ne: "", $ne: null } },
        { short_description: { $exists: true, $ne: "", $ne: null } },
        { name: { $exists: true, $ne: "", $ne: null } }
      ]
    };
  } else {
    // Default: Find products with any description field but missing or empty description1
    query = {
      $and: [
        // Must have at least one of these description fields
        {
          $or: [
            { description: { $exists: true, $ne: "", $ne: null } },
            { short_description: { $exists: true, $ne: "", $ne: null } },
            { name: { $exists: true, $ne: "", $ne: null } }
          ]
        },
        // Must be missing description1
        {
          $or: [
            { description1: { $exists: false } },
            { description1: "" },
            { description1: null }
          ]
        }
      ]
    };
  }
  
  // Only include in-stock products
  const stockQuery = {
    $or: [
      { stockStatus: "instock" },
      { stock_status: "instock" },
      // Include products with no stock status field
      { stockStatus: { $exists: false }, stock_status: { $exists: false } }
    ]
  };
  
  // Combine with the stock query
  query = { $and: [query, stockQuery] };
  
  // Find products matching the query with limit
  const products = await collection.find(query)
    .limit(options.limit)
    .project({
      _id: 1,
      id: 1,
      name: 1,
      description: 1,
      short_description: 1,
      description1: 1,
      images: 1,
      categories: 1,
      metadata: 1,
      stockStatus: { $ifNull: ["$stockStatus", "$stock_status"] },
      url: { $ifNull: ["$url", "$permalink"] }
    })
    .toArray();
  
  // Get total count of products needing enrichment
  const totalCount = await collection.countDocuments(query);
  
  return { products, totalCount };
}

/**
 * Enrich a product description using AI
 * @param {Object} product - Product object with original description
 * @returns {string} - Enriched description
 */
async function enrichDescription(product) {
  if (!ai) {
    console.warn("⚠️ Google AI client not initialized - falling back to original description");
    return getProductDescription(product);
  }
  
  try {
    console.log(`🧠 Enriching description for: ${product.name}`);
    
    const { name, images, categories, metadata } = product;
    const description = getProductDescription(product);
    
    if (!description || description.trim() === '') {
      console.warn("⚠️ No valid description found for enrichment");
      return product.name || ""; // Fall back to product name if no description
    }
    
    // Get enhanced description with vision
    const enrichedDescription = await reprocessProducts.generateEnglishDescriptionWithVision(
      description,
      name,
      images,
      metadata,
      categories
    );
    
    return enrichedDescription;
  } catch (error) {
    console.error(`❌ Error enriching description: ${error.message}`);
    // Fall back to original description
    return getProductDescription(product);
  }
}

/**
 * Get the best available description from a product
 * @param {Object} product - Product object
 * @returns {string} - Best available description
 */
function getProductDescription(product) {
  // Try different fields in order of preference
  if (product.description && product.description.trim() !== '') {
    return product.description;
  }
  
  if (product.short_description && product.short_description.trim() !== '') {
    return product.short_description;
  }
  
  // Fall back to product name as a minimal description
  if (product.name && product.name.trim() !== '') {
    return product.name;
  }
  
  return '';
}

/**
 * Generate embedding for a product description
 * @param {string} description - Product description
 * @returns {Array} - Embedding vector
 */
async function generateEmbedding(description) {
  if (!openai) {
    console.warn("⚠️ OpenAI client not initialized - cannot generate embedding");
    return null;
  }
  
  try {
    console.log(`🧮 Generating embedding...`);
    
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: description,
    });
    
    return embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error(`❌ Error generating embedding: ${error.message}`);
    return null;
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dbName = args[0];
  
  // Parse options
  const options = {
    limit: 100,
    missingOnly: false,
    force: false
  };
  
  // Process command line arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--missing-only') {
      options.missingOnly = true;
    } else if (arg === '--force') {
      options.force = true;
    }
  }
  
  if (!dbName) {
    console.error('❌ Error: Database name is required');
    console.log('Usage: node enrich-descriptions.js <dbName> [options]');
    process.exit(1);
  }
  
  if (!ai) {
    console.error('❌ Error: Google AI API key is not configured');
    console.log('Make sure GOOGLE_AI_API_KEY is set in your .env file');
    process.exit(1);
  }
  
  const client = new MongoClient(MONGO_URI, { 
    connectTimeoutMS: 60000,
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true
  });
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db(dbName);
    const collection = db.collection("products");
    
    // Find products needing enrichment
    console.log(`🔍 Finding products for description enrichment in database: ${dbName}...`);
    const { products, totalCount } = await findProductsForEnrichment(db, options);
    
    if (products.length === 0) {
      console.log('✅ No products found that need description enrichment. Nothing to do.');
      await client.close();
      return;
    }
    
    console.log(`\n📊 Found ${totalCount} total products needing description enrichment`);
    console.log(`📋 Processing ${products.length} products (limit: ${options.limit})`);
    
    // Sample of products to be processed
    console.log(`\n📋 Sample products to process:`);
    products.slice(0, 3).forEach(product => {
      console.log(`- ${product.name} (ID: ${product.id})`);
      console.log(`  Original description length: ${product.description ? product.description.length : 0} chars`);
      console.log(`  Has existing description1: ${product.description1 ? 'Yes' : 'No'}`);
    });
    
    // Process each product
    let processed = 0;
    let succeeded = 0;
    let skipped = 0;
    
    for (const product of products) {
      try {
        console.log(`\n🔄 Processing product: ${product.name} (ID: ${product.id || 'undefined'})`);
        
        // Get the best available description
        const originalDescription = getProductDescription(product);
        
        // Skip products without any description
        if (!originalDescription || originalDescription.trim() === '') {
          console.log(`⚠️ Skipping - no valid description found in any field`);
          console.log(`  Available fields: description=${!!product.description}, short_description=${!!product.short_description}, name=${!!product.name}`);
          skipped++;
          continue;
        }
        
        console.log(`📝 Found description (${originalDescription.length} chars) in field: ${
          product.description ? 'description' : (product.short_description ? 'short_description' : 'name')
        }`);
        
        // Enrich description
        const enrichedDescription = await enrichDescription(product);
        console.log(`✅ Generated enriched description (${enrichedDescription.length} chars)`);
        
        // Generate embedding for the enriched description
        const embedding = await generateEmbedding(enrichedDescription);
        
        // Update the product in the database
        const updateData = {
          description1: enrichedDescription,
          categoryTypeProcessedAt: new Date()
        };
        
        // Add embedding if available
        if (embedding) {
          updateData.embedding = embedding;
          console.log(`✅ Generated embedding for enriched description`);
        }
        
        await collection.updateOne(
          { _id: product._id },
          { $set: updateData }
        );
        
        console.log(`✅ Updated product ${product.id || product._id} with enriched description and embedding`);
        succeeded++;
        
      } catch (error) {
        console.error(`❌ Error processing product ${product.id || product._id}: ${error.message}`);
        skipped++;
      }
      
      processed++;
      console.log(`📊 Progress: ${processed}/${products.length} (${Math.round(processed/products.length*100)}%)`);
    }
    
    // Print summary
    console.log(`\n�� Processing Summary:`);
    console.log(`🔢 Total products processed: ${processed}`);
    console.log(`✅ Successfully enriched: ${succeeded}`);
    console.log(`⚠️ Skipped: ${skipped}`);
    console.log(`🎯 Success rate: ${((succeeded / processed) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log("✅ Closed MongoDB connection");
  }
}

main(); 