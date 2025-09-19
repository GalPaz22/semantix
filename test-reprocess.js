const { reprocessProducts } = require('./lib/reprocess-products.js');

async function testReprocess() {
  const dbName = process.argv[2];
  
  if (!dbName) {
    console.error('Usage: node test-reprocess.js <dbName>');
    process.exit(1);
  }

  console.log(`🧪 Testing reprocess with full description and embedding regeneration for database: ${dbName}`);
  
  try {
    const logs = await reprocessProducts({
      dbName: dbName,
      categories: [], // Will be fetched from user settings
      userTypes: [], // Will be fetched from user settings  
      softCategories: [], // Will be fetched from user settings
      options: {
        reprocessAll: true, // Enable all processing options
        reprocessDescriptions: true,
        reprocessEmbeddings: true,
        reprocessHardCategories: true,
        reprocessSoftCategories: true,
        reprocessTypes: true,
        reprocessVariants: true
      }
    });
    
    console.log('\n🎉 Test completed successfully!');
    console.log('📋 Final logs:');
    logs.forEach(log => console.log(log));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testReprocess(); 