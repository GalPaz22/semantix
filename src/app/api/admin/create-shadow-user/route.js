import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "../../../../../lib/mongodb";
import crypto from "crypto";

const adminEmail = "galpaz2210@gmail.com";

// ── Index helpers (mirrors onboarding/route.js) ──────────────────────────────

async function createProductIndexes(client, dbName) {
  const db = client.db(dbName);
  const col = db.collection("products");
  const specs = [
    { category: 1, fetchedAt: -1 },
    { type: 1, fetchedAt: -1 },
    { softCategory: 1, fetchedAt: -1 },
    { stockStatus: 1, fetchedAt: -1 },
    { description1: 1, fetchedAt: -1 },
    { name: "text", description1: "text" },
    { category: 1, stockStatus: 1, fetchedAt: -1 },
    { softCategory: 1, stockStatus: 1, fetchedAt: -1 },
  ];
  for (const spec of specs) {
    try { await col.createIndex(spec); } catch (e) { if (e.code !== 85) console.warn("Index warn:", e.message); }
  }
}

async function createVectorIndex(client, dbName) {
  const db = client.db(dbName);
  const col = db.collection("products");

  const collections = await db.listCollections({ name: "products" }).toArray();
  if (!collections.length) await db.createCollection("products");

  try {
    const existing = await col.listSearchIndexes().toArray();
    if (existing.some(i => i.name === "vector_index")) return;
  } catch { /* proceed */ }

  try {
    await col.createSearchIndex({
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        fields: [
          { numDimensions: 3072, path: "embedding", similarity: "cosine", type: "vector" },
          { path: "category",     type: "filter" },
          { path: "price",        type: "filter" },
          { path: "type",         type: "filter" },
          { path: "stockStatus",  type: "filter" },
          { path: "softCategory", type: "filter" },
          { path: "_id",          type: "filter" },
          { path: "colors",       type: "filter" },
        ],
      },
    });
  } catch (e) {
    if (e.code !== 68) throw e;
  }
}

async function createAutocompleteIndex(client, dbName) {
  const db = client.db(dbName);
  const col = db.collection("products");

  const collections = await db.listCollections({ name: "products" }).toArray();
  if (!collections.length) await db.createCollection("products");

  try {
    const existing = await col.listSearchIndexes().toArray();
    if (existing.some(i => i.name === "default")) return;
  } catch { /* proceed */ }

  const acFields = ["description", "name", "category", "softCategory", "colors"].reduce((acc, field) => {
    acc[field] = [
      { maxGrams: 20, minGrams: 2, tokenization: "edgeGram", type: "autocomplete" },
      { analyzer: "lucene.standard", type: "string" },
    ];
    return acc;
  }, {});

  try {
    await db.command({
      createSearchIndexes: "products",
      indexes: [{ name: "default", definition: { mappings: { dynamic: true, fields: acFields } } }],
    });
  } catch (e) {
    if (e.code !== 68) throw e;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (session.user.email !== adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, dbName, platform, shopifyDomain, shopifyClientId, shopifyClientSecret, wooUrl, wooKey, wooSecret } = body;

  if (!name?.trim())    return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!dbName?.trim())  return NextResponse.json({ error: "dbName is required" }, { status: 400 });
  if (!["shopify", "woocommerce"].includes(platform))
    return NextResponse.json({ error: "platform must be 'shopify' or 'woocommerce'" }, { status: 400 });

  if (platform === "shopify") {
    const hasClientCreds = shopifyClientId?.trim() && shopifyClientSecret?.trim();
    if (!shopifyDomain?.trim() || !hasClientCreds)
      return NextResponse.json({ error: "shopifyDomain, shopifyClientId, and shopifyClientSecret are required for Shopify" }, { status: 400 });
  }
  if (platform === "woocommerce" && (!wooUrl?.trim() || !wooKey?.trim() || !wooSecret?.trim()))
    return NextResponse.json({ error: "wooUrl, wooKey, and wooSecret are required for WooCommerce" }, { status: 400 });

  const client = await clientPromise;
  const usersCol = client.db("users").collection("users");

  // Ensure dbName is not already taken
  const existing = await usersCol.findOne({ "credentials.dbName": dbName.trim() });
  if (existing) return NextResponse.json({ error: `dbName "${dbName}" is already in use` }, { status: 409 });

  const apiKey = crypto.randomBytes(16).toString("hex");
  const syntheticEmail = `shadow-${dbName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")}@shadow.semantix.internal`;

  const defaultSiteConfig = {
    siteId: dbName.trim(),
    platform,
    enabled: true,
    domains: [],
    features: {
      rerankBoost: true,
      injectIntoGrid: true,
      zeroReplace: true,
      disabled: false,
      shadowMode: true,
    },
  };

  const credentials =
    platform === "shopify"
      ? { shopifyDomain: shopifyDomain.trim(), shopifyClientId: shopifyClientId.trim(), shopifyClientSecret: shopifyClientSecret.trim(),
          dbName: dbName.trim(), categories: [], type: [], softCategories: [], colors: [], softCategoryBoosts: {},
          siteConfig: defaultSiteConfig }
      : { wooUrl: wooUrl.trim(), wooKey: wooKey.trim(), wooSecret: wooSecret.trim(), dbName: dbName.trim(),
          categories: [], type: [], softCategories: [], colors: [], softCategoryBoosts: {},
          siteConfig: defaultSiteConfig };

  const userDoc = {
    name: name.trim(),
    email: syntheticEmail,
    apiKey,
    platform,
    dbName: dbName.trim(),
    active: true,
    shadowMode: true,
    onboardingComplete: true,
    syncMode: "text",
    createdAt: new Date(),
    updatedAt: new Date(),
    credentials,
  };

  try {
    await usersCol.insertOne(userDoc);
  } catch (e) {
    return NextResponse.json({ error: "Failed to create user: " + e.message }, { status: 500 });
  }

  // Create DB + indexes (non-blocking on index build, they're queued on Atlas)
  try {
    await createVectorIndex(client, dbName.trim());
    await createAutocompleteIndex(client, dbName.trim());
    await createProductIndexes(client, dbName.trim());
  } catch (e) {
    console.warn("Index creation warning for", dbName, ":", e.message);
    // Don't fail — Atlas Search indexes build asynchronously anyway
  }

  console.log(`✅ Shadow user created: ${name} (${dbName}) [${platform}] apiKey: ${apiKey}`);

  return NextResponse.json({
    success: true,
    user: {
      name: name.trim(),
      email: syntheticEmail,
      apiKey,
      dbName: dbName.trim(),
      platform,
      shadowMode: true,
    },
  });
}
