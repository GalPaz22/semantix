// Environment variable validator for Paddle integration

export function validatePaddleEnvironment() {
  console.log('\n🔍 VALIDATING PADDLE ENVIRONMENT VARIABLES');
  
  const requiredVars = [
    { name: 'PADDLE_API_KEY', description: 'Server-side API key for Paddle API calls' },
    { name: 'PADDLE_WEBHOOK_SECRET', description: 'Secret for verifying webhook signatures' },
    { name: 'NEXT_PUBLIC_PADDLE_PUBLIC_KEY', description: 'Client-side public key for Paddle.js' }
  ];
  
  const optionalVars = [
    { name: 'NEXT_PUBLIC_PADDLE_VENDOR_ID', description: 'Vendor ID for Paddle API' }
  ];
  
  let hasErrors = false;
  
  // Check required variables
  console.log('\n📋 REQUIRED VARIABLES:');
  for (const variable of requiredVars) {
    const value = process.env[variable.name];
    if (!value) {
      console.error(`❌ ${variable.name}: MISSING - ${variable.description}`);
      hasErrors = true;
    } else {
      // Show first few characters for debugging, but hide most of the value
      const displayValue = value.substring(0, 4) + '...' + value.substring(value.length - 4);
      console.log(`✅ ${variable.name}: ${displayValue} - ${variable.description}`);
    }
  }
  
  // Check optional variables
  console.log('\n📋 OPTIONAL VARIABLES:');
  for (const variable of optionalVars) {
    const value = process.env[variable.name];
    if (!value) {
      console.warn(`⚠️ ${variable.name}: MISSING - ${variable.description}`);
    } else {
      const displayValue = value.substring(0, 4) + '...' + value.substring(value.length - 4);
      console.log(`✅ ${variable.name}: ${displayValue} - ${variable.description}`);
    }
  }
  
  // Check environment
  console.log('\n📋 ENVIRONMENT:');
  console.log(`🌐 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`🔗 NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}`);
  
  if (hasErrors) {
    console.error('\n❌ CRITICAL ISSUES FOUND WITH PADDLE ENVIRONMENT VARIABLES');
    console.error('   Please check your .env file or environment configuration.');
    // Don't throw an error, just log it - this allows the app to still start
  } else {
    console.log('\n✅ PADDLE ENVIRONMENT VALIDATION COMPLETE - NO ISSUES FOUND');
  }
  
  return !hasErrors;
} 