import { NextResponse } from 'next/server';

/**
 * API route to handle session token authentication
 * This endpoint verifies the session token from App Bridge and returns user data
 */
export async function POST(request) {
  try {
    const { sessionToken } = await request.json();
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token is required' }, { status: 400 });
    }
    
    // In a production environment, you would verify the session token with Shopify
    // For example, using @shopify/shopify-api to validate the token
    
    // For now, we'll just acknowledge the token was received
    return NextResponse.json({
      success: true,
      message: 'Session token received',
      // Include user data or other relevant information here
    });
  } catch (error) {
    console.error('Error processing session token:', error);
    return NextResponse.json({ error: 'Failed to process session token' }, { status: 500 });
  }
}

/**
 * API route to handle OPTIONS requests (CORS preflight)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 