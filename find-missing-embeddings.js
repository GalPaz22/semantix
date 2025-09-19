/**
 * Utility script to find products without embeddings in a specific database
 * 
 * Usage:
 * node find-missing-embeddings.js <dbName> [limit]
 * 
 * Examples:
 * node find-missing-embeddings.js store_123456 100
 */

const reprocessProducts = require('./lib/reprocess-products');
const { findProductsWithoutEmbeddings } = reprocessProducts;

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const dbName = args[0];
  const limit = parseInt(args[1] || '100', 10);
  
  if (!dbName) {
    console.error('❌ Error: Database name is required');
    console.log('Usage: node find-missing-embeddings.js <dbName> [limit]');
    process.exit(1);
  }
  
  try {
    console.log(`🔍 Finding products without embeddings in database: ${dbName} (limit: ${limit})`);
    
    const result = await findProductsWithoutEmbeddings(dbName, limit);
    
    console.log(`\n📊 Results Summary:`);
    console.log(`🔢 Total products without embeddings: ${result.totalCount}`);
    console.log(`📋 Retrieved products: ${result.products.length}`);
    
    // Display product information in a table format
    console.log('\n📋 Products without embeddings:');
    console.table(
      result.products.map(p => ({
        id: p.id,
        name: p.name,
        descriptionLength: p.description1 ? p.description1.length : 0,
        hasDescription: Boolean(p.description1 && p.description1.trim()),
        url: p.url
      }))
    );
    
    // Suggest next steps
    console.log('\n✅ Next Steps:');
    console.log(`1. To reprocess these products, run:`);
    console.log(`   node your-reprocess-script.js ${dbName} --embedding-only`);
    console.log(`2. To reprocess with all options, run:`);
    console.log(`   node your-reprocess-script.js ${dbName} --reprocess-all`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main(); 