import { NextResponse } from 'next/server';
import clientPromise from '/lib/mongodb';

export async function POST(request) {
  try {
    const { dbName } = await request.json();
    
    if (!dbName) {
      return NextResponse.json({ error: 'Database name is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    
    // Fetch all products from the products collection
    const products = await db.collection('products').find({}).toArray();
    
    return NextResponse.json({ 
      products: products,
      total: products.length 
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
} 