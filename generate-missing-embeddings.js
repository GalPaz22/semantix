/**
 * Script to generate embeddings for products that are missing them
 * 
 * Usage:
 * node generate-missing-embeddings.js <dbName> [--limit=100]
 * 
 * Example:
 * node generate-missing-embeddings.js store_123456 --limit=50
 */

const reprocessProducts = require('./lib/reprocess-products');
const { findProductsWithoutEmbeddings } = reprocessProducts;

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const dbName = args[0];
  
  // Check for limit parameter
  let limit = 100;
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--limit=')) {
      limit = parseInt(args[i].split('=')[1], 10);
    }
  }
  
  if (!dbName) {
    console.error('❌ Error: Database name is required');
    console.log('Usage: node generate-missing-embeddings.js <dbName> [--limit=100]');
    process.exit(1);
  }
  
  try {
    // First, check how many products need embeddings
    console.log(`🔍 Checking products without embeddings in database: ${dbName}...`);
    const result = await findProductsWithoutEmbeddings(dbName, 5);
    
    if (result.totalCount === 0) {
      console.log('✅ No products found without embeddings. Nothing to do.');
      return;
    }
    
    console.log(`\n📊 Found ${result.totalCount} products without embeddings.`);
    console.log(`📋 Sample products without embeddings:`);
    
    // Show sample products
    result.products.forEach(product => {
      console.log(`- ${product.name} (ID: ${product.id})`);
    });
    
    // Ask for confirmation
    console.log(`\n🚀 Ready to generate embeddings for up to ${limit} products in database: ${dbName}`);
    console.log(`Proceeding in 3 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run reprocessProducts with specific options for embedding generation
    console.log(`\n🚀 Starting embedding generation process...`);
    
    const options = {
      reprocessHardCategories: false,   // Don't reprocess categories
      reprocessSoftCategories: false,   // Don't reprocess soft categories
      reprocessTypes: false,            // Don't reprocess types
      reprocessVariants: false,         // Don't reprocess variants
      reprocessEmbeddings: true,        // Generate embeddings (this is key)
      reprocessDescriptions: false,     // Don't reprocess descriptions
      reprocessAll: false,              // Don't do a full reprocess
      limit: limit                      // Process only a limited number of products
    };
    
    const logs = await reprocessProducts({
      dbName,
      categories: [],           // Empty categories since we're not classifying
      userTypes: [],            // Empty types since we're not classifying
      softCategories: [],       // Empty soft categories since we're not classifying
      options
    });
    
    // Print summary of logs
    console.log('\n📋 Process Summary:');
    logs.forEach(log => {
      if (log.includes('Generated new embedding') || 
          log.includes('Error generating embedding') ||
          log.includes('summary') ||
          log.includes('processed=')) {
        console.log(log);
      }
    });
    
    console.log('\n✅ Process completed!');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main(); 