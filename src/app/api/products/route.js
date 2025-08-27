import { NextResponse } from 'next/server';
import clientPromise from '/lib/mongodb';

export async function POST(request) {
  try {
    const { 
      dbName, 
      page = 1, 
      limit = 20, 
      search = '', 
      category = '', 
      type = '', 
      softCategory = '',
      status = 'all' 
    } = await request.json();
    
    if (!dbName) {
      return NextResponse.json({ error: 'Database name is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const collection = db.collection('products');
    
    // Build filter query
    const filter = {};
    
    // Search filter - use text index for better performance
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Category filter
    if (category) {
      filter.category = category;
    }
    
    // Type filter
    if (type) {
      filter.type = type;
    }

    // Soft Category filter
    if (softCategory) {
      filter.softCategory = softCategory;
    }
    
    // Status filter
    if (status === 'processed') {
      filter.embedding = { $exists: true, $ne: null };
      filter.description1 = { $exists: true, $ne: null };
    } else if (status === 'pending') {
      filter.$or = [
        { embedding: { $exists: false } },
        { embedding: null },
        { description1: { $exists: false } },
        { description1: null }
      ];
      filter.stockStatus = { $ne: 'outofstock' };
    } else if (status === 'outofstock') {
      filter.stockStatus = 'outofstock';
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Project fields - exclude large embedding field for list view
    const projection = {
      embedding: 0 // Exclude embeddings to improve performance
    };
    
    // Fetch products with pagination and projection
    const [products, total] = await Promise.all([
      collection
        .find(filter, { projection })
        .sort({ fetchedAt: -1 }) // Sort by most recently fetched
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter)
    ]);
    
    // Get unique categories and types for filters + statistics
    const [categories, types, softCategories, stats] = await Promise.all([
        collection.aggregate([
            { $match: { category: { $ne: null, $exists: true, $ne: [] } } },
            { $group: { _id: null, allCategories: { $addToSet: "$category" } } },
            { $project: {
                _id: 0,
                categories: {
                    $reduce: {
                        input: "$allCategories",
                        initialValue: [],
                        in: { 
                            $setUnion: [
                                "$$value", 
                                { 
                                    $cond: {
                                        if: { $isArray: "$$this" },
                                        then: "$$this",
                                        else: ["$$this"]
                                    }
                                }
                            ]
                        }
                    }
                }
            }}
        ]).toArray(),
        collection.distinct('type', { type: { $ne: null, $exists: true, $ne: [] } }),
        collection.distinct('softCategory', { softCategory: { $ne: null, $exists: true, $ne: [] } }),
        // Calculate actual database statistics
        Promise.all([
            collection.countDocuments({ description1: { $exists: true, $ne: null } }), // processed
            collection.countDocuments({
                $or: [
                    { description1: { $exists: false } },
                    { description1: null }
                ],
                stockStatus: { $ne: 'outofstock' }
            }), // pending
            collection.countDocuments({ stockStatus: 'outofstock' }), // out of stock
            collection.aggregate([
                { $match: { price: { $exists: true, $ne: null, $gt: 0 } } },
                { $group: { _id: null, avgPrice: { $avg: "$price" } } }
            ]).toArray() // average price
        ])
    ]);

    // Extract categories from aggregation result
    const finalCategories = categories.length > 0 ? categories[0].categories : [];

    // Flatten types array since it can contain arrays
    const flattenedTypes = [...new Set(types.flat().filter(Boolean))];
    // Flatten softCategories array since it can contain arrays
    const flattenedSoftCategories = [...new Set(softCategories.flat().filter(Boolean))];
    
    // Process statistics
    const [processedCount, pendingCount, outOfStockCount, avgPriceResult] = stats;
    const avgPrice = avgPriceResult.length > 0 ? avgPriceResult[0].avgPrice.toFixed(2) : 0;
    
    return NextResponse.json({ 
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categories: finalCategories.filter(Boolean),
      types: flattenedTypes,
      softCategories: flattenedSoftCategories,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
      stats: {
        total,
        processed: processedCount,
        pending: pendingCount,
        outOfStock: outOfStockCount,
        categories: finalCategories.filter(Boolean).length,
        softCategories: flattenedSoftCategories.length,
        avgPrice
      }
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
} 