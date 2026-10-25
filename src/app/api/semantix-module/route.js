import { NextResponse } from 'next/server';
import clientPromise from '/lib/mongodb';
import { normalizeSemantixModule } from '/lib/semantixModule.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/semantix-module?apiKey=xxx
 * Public flag Magento/tenant code reads: { module, enabled, percent }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey') || request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400, headers: corsHeaders });
    }

    const client = await clientPromise;
    const user = await client.db('users').collection('users').findOne(
      { apiKey },
      { projection: { credentials: 1, dbName: 1, active: 1 } }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
    }

    const dbName = user.credentials?.dbName || user.dbName || '';
    const semantix = normalizeSemantixModule(user.credentials?.siteConfig?.semantix, dbName);

    return NextResponse.json(
      {
        ...semantix,
        accountActive: user.active !== false
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ semantix-module lookup failed:', error);
    return NextResponse.json({ error: 'Failed to load Semantix module flag' }, { status: 500, headers: corsHeaders });
  }
}
