
// Updated create-paddle-checkout endpoint
// app/api/create-paddle-checkout/route.js

import { paddle } from '/lib/paddle';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { SUBSCRIPTION_TIERS } from '/lib/paddle-config';
import clientPromise from '/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🚀 [${requestId}] Create checkout API called`);
  
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const { tier } = await request.json(); // Correctly extract tier from request body
    if (!tier) {
      return NextResponse.json({ message: 'Tier is required' }, { status: 400 });
    }
    // Validate plan
    const planConfig = Object.values(SUBSCRIPTION_TIERS).find(plan => plan.tier === tier);
    if (!planConfig || !planConfig.priceId) {
      return NextResponse.json({ message: 'Invalid subscription tier' }, { status: 400 });
    }

    // Get user from database
    const client = await clientPromise;
    const db = client.db("users");
    const userDoc = await db.collection("users").findOne({ email: session.user.email });
    
    if (!userDoc) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Create transaction with Paddle
    console.log(`🛒 [${requestId}] Creating Paddle transaction...`);
    
    const customData = {
      userId: userDoc._id.toString(),
      userEmail: session.user.email,
      tier: tier,
      requestId: requestId
    };

    const transaction = await paddle.createTransaction(
      planConfig.priceId,
      session.user.email,
      customData
    );

    console.log(`✅ [${requestId}] Transaction created:`, transaction.id);

    // The checkout URL is in the transaction response
    const checkoutUrl = transaction.checkout_url || transaction.data?.checkout_url;
    
    if (!checkoutUrl) {
      throw new Error('No checkout URL received from Paddle');
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl,
      transactionId: transaction.id,
      tier: tier,
      planName: planConfig.name,
      price: planConfig.price,
      requestId: requestId
    });

  } catch (error) {
    console.error(`💥 [${requestId}] Error:`, error);
    
    // Handle specific Paddle API errors
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return NextResponse.json({
        message: 'Payment service authentication failed. Please check API credentials.',
        requestId: requestId
      }, { status: 503 });
    } else if (error.message.includes('price') || error.message.includes('product')) {
      return NextResponse.json({
        message: 'Invalid pricing configuration. Please contact support.',
        requestId: requestId
      }, { status: 400 });
    } else {
      return NextResponse.json({
        message: 'Payment service error. Please try again.',
        requestId: requestId,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }
  }
}

// Debug endpoint for new API
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'test-api') {
    try {
      console.log('🧪 Testing new Paddle Billing API...');
      
      // Test API connection by getting products
      const products = await paddle.getProducts();
      const prices = await paddle.getPrices();
      
      return NextResponse.json({
        success: true,
        message: 'Paddle Billing API connection successful',
        api_version: 'v4_billing',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        products_count: products.data?.length || 0,
        prices_count: prices.data?.length || 0,
        sample_products: products.data?.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          status: p.status
        })),
        sample_prices: prices.data?.slice(0, 3).map(p => ({
          id: p.id,
          product_id: p.product_id,
          unit_price: p.unit_price,
          currency_code: p.unit_price?.currency_code
        }))
      });
    } catch (error) {
      console.error('❌ Paddle API test failed:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        api_version: 'v4_billing',
        troubleshooting: [
          'Check your PADDLE_API_KEY is correct',
          'Verify you are using the right environment (sandbox vs production)',
          'Make sure your Paddle account has the Billing API enabled',
          'Check that your API key has the required permissions'
        ]
      }, { status: 500 });
    }
  }

  return NextResponse.json({
    service: 'Paddle Checkout API (Billing v4)',
    status: 'healthy',
    test_endpoint: '?action=test-api'
  });
}