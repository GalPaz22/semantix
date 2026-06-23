import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '/src/app/api/auth/[...nextauth]/route';
import clientPromise from '/lib/mongodb.js';
import crypto from 'crypto';

const adminEmail = 'galpaz2210@gmail.com';

async function createProductIndexes(client, dbName) {
  const col = client.db(dbName).collection('products');
  const specs = [
    { category: 1, fetchedAt: -1 },
    { type: 1, fetchedAt: -1 },
    { softCategory: 1, fetchedAt: -1 },
    { stockStatus: 1, fetchedAt: -1 },
    { description1: 1, fetchedAt: -1 },
    { name: 'text', description1: 'text' },
    { category: 1, stockStatus: 1, fetchedAt: -1 },
    { softCategory: 1, stockStatus: 1, fetchedAt: -1 }
  ];
  for (const spec of specs) {
    try { await col.createIndex(spec); } catch (e) { if (e.code !== 85) console.warn('Index warn:', e.message); }
  }
}

async function createVectorIndex(client, dbName) {
  const db = client.db(dbName);
  const col = db.collection('products');
  const collections = await db.listCollections({ name: 'products' }).toArray();
  if (!collections.length) await db.createCollection('products');
  try {
    const existing = await col.listSearchIndexes().toArray();
    if (existing.some(i => i.name === 'vector_index')) return;
  } catch { /* proceed */ }
  try {
    await col.createSearchIndex({
      name: 'vector_index',
      type: 'vectorSearch',
      definition: {
        fields: [
          { numDimensions: 3072, path: 'embedding', similarity: 'cosine', type: 'vector' },
          { path: 'category', type: 'filter' },
          { path: 'price', type: 'filter' },
          { path: 'type', type: 'filter' },
          { path: 'stockStatus', type: 'filter' },
          { path: 'softCategory', type: 'filter' },
          { path: '_id', type: 'filter' },
          { path: 'colors', type: 'filter' }
        ]
      }
    });
  } catch (e) {
    if (e.code !== 68) throw e;
  }
}

async function createAutocompleteIndex(client, dbName) {
  const db = client.db(dbName);
  const col = db.collection('products');
  const collections = await db.listCollections({ name: 'products' }).toArray();
  if (!collections.length) await db.createCollection('products');
  try {
    const existing = await col.listSearchIndexes().toArray();
    if (existing.some(i => i.name === 'default')) return;
  } catch { /* proceed */ }
  const acFields = ['description', 'name', 'category', 'softCategory', 'colors'].reduce((acc, field) => {
    acc[field] = [
      { maxGrams: 20, minGrams: 2, tokenization: 'edgeGram', type: 'autocomplete' },
      { analyzer: 'lucene.standard', type: 'string' }
    ];
    return acc;
  }, {});
  try {
    await db.command({
      createSearchIndexes: 'products',
      indexes: [{ name: 'default', definition: { mappings: { dynamic: true, fields: acFields } } }]
    });
  } catch (e) {
    if (e.code !== 68) throw e;
  }
}

async function findUserByDbName(dbName) {
  const client = await clientPromise;
  return client.db('users').collection('users').findOne({
    $or: [
      { 'credentials.dbName': dbName },
      { dbName }
    ]
  });
}

function normalizeFilterArrays(discovery) {
  const toArray = (value) => (Array.isArray(value) ? value : [])
    .map(item => String(item || '').trim())
    .filter(Boolean);

  return {
    categories: toArray(discovery?.categories),
    type: toArray(discovery?.type || discovery?.productTypes),
    softCategories: toArray(discovery?.softCategories)
  };
}

function buildSoftCategoryBoosts(softCategories, existing = {}) {
  const boosts = { ...existing };
  softCategories.forEach(cat => {
    if (boosts[cat] === undefined) boosts[cat] = 1.0;
  });
  return boosts;
}

function storeHostFromUrl(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

function buildCredentialsForPlatform({ platform, url, dbName, filters, existingCredentials = {} }) {
  const boosts = buildSoftCategoryBoosts(filters.softCategories, existingCredentials.softCategoryBoosts || {});
  const base = {
    dbName,
    categories: filters.categories,
    type: filters.type,
    softCategories: filters.softCategories,
    colors: existingCredentials.colors || [],
    softCategoryBoosts: boosts,
    siteConfig: existingCredentials.siteConfig || {
      siteId: dbName,
      platform,
      enabled: true,
      domains: [storeHostFromUrl(url)],
      features: {
        rerankBoost: true,
        injectIntoGrid: true,
        zeroReplace: true,
        disabled: false,
        shadowMode: false
      }
    }
  };

  if (platform === 'woocommerce') {
    return {
      ...existingCredentials,
      ...base,
      wooUrl: existingCredentials.wooUrl || url,
      wooKey: existingCredentials.wooKey || '',
      wooSecret: existingCredentials.wooSecret || ''
    };
  }

  const domain = storeHostFromUrl(url);
  return {
    ...existingCredentials,
    ...base,
    shopifyDomain: existingCredentials.shopifyDomain || domain,
    shopifyClientId: existingCredentials.shopifyClientId || '',
    shopifyClientSecret: existingCredentials.shopifyClientSecret || ''
  };
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { dbName, platform, url, discovery } = await request.json();
    const cleanDbName = String(dbName || '').trim();
    const cleanPlatform = String(platform || '').toLowerCase();
    const cleanUrl = String(url || '').trim();
    const filters = normalizeFilterArrays(discovery);

    if (!cleanDbName) {
      return NextResponse.json({ error: 'dbName is required' }, { status: 400 });
    }
    if (!['shopify', 'woocommerce'].includes(cleanPlatform)) {
      return NextResponse.json({ error: 'platform must be shopify or woocommerce' }, { status: 400 });
    }
    if (!cleanUrl) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    if (!filters.categories.length && !filters.type.length && !filters.softCategories.length) {
      return NextResponse.json({ error: 'discovery filters are empty' }, { status: 400 });
    }

    const client = await clientPromise;
    const usersCol = client.db('users').collection('users');
    const existingUser = await findUserByDbName(cleanDbName);

    if (existingUser) {
      const credentials = buildCredentialsForPlatform({
        platform: cleanPlatform,
        url: cleanUrl,
        dbName: cleanDbName,
        filters,
        existingCredentials: existingUser.credentials || {}
      });

      await usersCol.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            credentials,
            platform: cleanPlatform,
            dbName: cleanDbName,
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        created: false,
        dbName: cleanDbName,
        apiKey: existingUser.apiKey,
        userName: existingUser.name,
        credentials: {
          categories: credentials.categories,
          type: credentials.type,
          softCategories: credentials.softCategories
        }
      });
    }

    const apiKey = crypto.randomBytes(16).toString('hex');
    const syntheticEmail = `client-${cleanDbName.toLowerCase().replace(/[^a-z0-9]/g, '-')}@semantix.internal`;
    const credentials = buildCredentialsForPlatform({
      platform: cleanPlatform,
      url: cleanUrl,
      dbName: cleanDbName,
      filters
    });

    const userDoc = {
      name: cleanDbName,
      email: syntheticEmail,
      apiKey,
      platform: cleanPlatform,
      dbName: cleanDbName,
      active: true,
      shadowMode: false,
      onboardingComplete: false,
      syncMode: 'text',
      createdAt: new Date(),
      updatedAt: new Date(),
      credentials
    };

    await usersCol.insertOne(userDoc);

    try {
      await createVectorIndex(client, cleanDbName);
      await createAutocompleteIndex(client, cleanDbName);
      await createProductIndexes(client, cleanDbName);
    } catch (e) {
      console.warn('Index creation warning for', cleanDbName, ':', e.message);
    }

    return NextResponse.json({
      success: true,
      created: true,
      dbName: cleanDbName,
      apiKey,
      userName: cleanDbName,
      credentials: {
        categories: credentials.categories,
        type: credentials.type,
        softCategories: credentials.softCategories
      }
    });
  } catch (error) {
    console.error('[save-client-taxonomy error]', error);
    return NextResponse.json({ error: error.message || 'Failed to save client taxonomy' }, { status: 500 });
  }
}
