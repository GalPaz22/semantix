import { buildDynamicDateFilter } from "./analytics-helper.js";

const CACHE_COLLECTION = "analytics_dashboard_cache";
const CACHE_VERSION = 1;
const STALE_AFTER_MS = 5 * 60 * 1000;
const LOCK_FOR_MS = 2 * 60 * 1000;
const ATTRIBUTION_WINDOW_MS = 2 * 60 * 60 * 1000;
const QUERY_LOG_LIMIT = 1000;
const PURCHASE_LIMIT = 50;

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function toMs(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function price(value) {
  if (value == null) return 0;
  const parsed = typeof value === "number"
    ? value
    : parseFloat(String(value).replace(/[^0-9.,]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function eventRevenue(event, preferCartTotal = false) {
  const quantity = Number(event?.quantity) || 1;
  const cartTotal = price(event?.cart_total ?? event?.order_total ?? event?.total);
  const productTotal = price(event?.product_price ?? event?.price) * quantity;
  return preferCartTotal && cartTotal > 0 ? cartTotal : productTotal || cartTotal;
}

function purchaseProductNames(event) {
  const nested = [
    ...(Array.isArray(event?.products) ? event.products : []),
    ...(Array.isArray(event?.cart_items) ? event.cart_items : []),
    ...(Array.isArray(event?.line_items) ? event.line_items : []),
  ];
  const names = nested
    .map(product => product?.product_name || product?.name || product?.title)
    .filter(Boolean);
  const topLevel = event?.product_name || event?.name || event?.product;
  if (topLevel) names.unshift(topLevel);
  return [...new Set(names)];
}

function cacheId(dbName, days) {
  return `${dbName}:${days}d:v${CACHE_VERSION}`;
}

export async function buildImpactSnapshot(client, dbName, days = 30) {
  const db = client.db(dbName);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [queryDateFilter, cartDateFilter, checkoutDateFilter] = await Promise.all([
    buildDynamicDateFilter(db, "queries", start.toISOString(), end.toISOString()),
    buildDynamicDateFilter(db, "cart", start.toISOString(), end.toISOString()),
    buildDynamicDateFilter(db, "checkout_events", start.toISOString(), end.toISOString()),
  ]);

  const complexFilter = {
    $and: [
      {
        $or: [
          { isComplex: true },
          { isComplex: "true" },
          { isComplicated: true },
          { isComplicated: "true" },
        ],
      },
      queryDateFilter,
    ],
  };

  const [queries, cartEvents, checkoutEvents] = await Promise.all([
    db.collection("queries").find(complexFilter, {
      projection: {
        query: 1,
        timestamp: 1,
        isComplex: 1,
        isComplicated: 1,
        deliveredProducts: 1,
      },
    }).sort({ timestamp: -1 }).toArray(),
    db.collection("cart").find(cartDateFilter, {
      projection: {
        search_query: 1,
        query: 1,
        timestamp: 1,
        created_at: 1,
        session_id: 1,
        product_name: 1,
        product_id: 1,
        product_price: 1,
        price: 1,
        quantity: 1,
      },
    }).sort({ timestamp: -1, created_at: -1 }).toArray(),
    db.collection("checkout_events").find(checkoutDateFilter, {
      projection: {
        search_query: 1,
        query: 1,
        timestamp: 1,
        created_at: 1,
        session_id: 1,
        order_id: 1,
        orderId: 1,
        checkout_id: 1,
        product_name: 1,
        product_id: 1,
        product_price: 1,
        price: 1,
        quantity: 1,
        cart_total: 1,
        order_total: 1,
        total: 1,
        products: 1,
        cart_items: 1,
        line_items: 1,
      },
    }).sort({ timestamp: -1, created_at: -1 }).toArray(),
  ]);

  const rows = queries.map((query, index) => ({
    _id: query._id,
    query: query.query,
    timestamp: query.timestamp,
    isComplex: query.isComplex,
    isComplicated: query.isComplicated,
    resultsCount: Array.isArray(query.deliveredProducts) ? query.deliveredProducts.length : 0,
    impactKey: `${query._id || query.timestamp || "query"}:${index}`,
    normalizedQuery: normalizeText(query.query),
    queryTime: toMs(query.timestamp),
    cartCount: 0,
    cartRevenue: 0,
    checkoutCount: 0,
  }));

  const rowsByText = new Map();
  for (const row of rows) {
    if (!row.normalizedQuery) continue;
    const matches = rowsByText.get(row.normalizedQuery) || [];
    matches.push(row);
    rowsByText.set(row.normalizedQuery, matches);
  }

  const attributedRow = event => {
    const candidates = rowsByText.get(normalizeText(event?.search_query || event?.query)) || [];
    const eventTime = toMs(event?.timestamp || event?.created_at);
    if (!eventTime) return candidates[0] || null;
    for (const row of candidates) {
      if (row.queryTime && row.queryTime <= eventTime && eventTime - row.queryTime <= ATTRIBUTION_WINDOW_MS) {
        return row;
      }
    }
    return null;
  };

  let addToCartCount = 0;
  let cartRevenue = 0;
  const rowsBySession = new Map();
  for (const event of cartEvents) {
    const row = attributedRow(event);
    if (!row) continue;
    addToCartCount += 1;
    const revenue = eventRevenue(event);
    cartRevenue += revenue;
    row.cartCount += 1;
    row.cartRevenue += revenue;
    if (event.session_id) rowsBySession.set(String(event.session_id), row);
  }

  const checkoutKeys = new Set();
  const purchases = [];
  let checkoutRevenue = 0;
  for (let index = 0; index < checkoutEvents.length; index += 1) {
    const event = checkoutEvents[index];
    const row = attributedRow(event) ||
      (event.session_id ? rowsBySession.get(String(event.session_id)) : null);
    if (!row) continue;

    const eventTime = toMs(event.timestamp || event.created_at);
    const queryKey = normalizeText(event.search_query || event.query);
    const bucket = eventTime ? Math.floor(eventTime / (5 * 60 * 1000)) : index;
    const orderKey = event.order_id || event.orderId || event.checkout_id ||
      `${queryKey}:${event.product_id || event.product_name || "checkout"}:${bucket}`;
    if (checkoutKeys.has(orderKey)) continue;
    checkoutKeys.add(orderKey);

    const revenue = eventRevenue(event, true);
    checkoutRevenue += revenue;
    row.checkoutCount += 1;
    if (purchases.length < PURCHASE_LIMIT) {
      purchases.push({
        key: String(orderKey),
        query: row.query || event.search_query || "—",
        products: purchaseProductNames(event),
        revenue,
        orderId: event.order_id || event.orderId || event.checkout_id || null,
        timestamp: eventTime || row.queryTime,
      });
    }
  }

  const searchGroups = new Map();
  for (const row of rows) {
    if (!row.normalizedQuery) continue;
    const current = searchGroups.get(row.normalizedQuery) || {
      query: row.query,
      searches: 0,
      cart: 0,
      checkout: 0,
      latest: 0,
    };
    current.searches += 1;
    current.cart += row.cartCount;
    current.checkout += row.checkoutCount;
    current.latest = Math.max(current.latest, row.queryTime || 0);
    searchGroups.set(row.normalizedQuery, current);
  }

  const topSearches = Array.from(searchGroups.values())
    .sort((a, b) => b.searches - a.searches || b.latest - a.latest)
    .slice(0, 8);
  const opportunities = Array.from(searchGroups.values())
    .filter(item => item.cart === 0 && item.checkout === 0)
    .sort((a, b) => b.searches - a.searches || b.latest - a.latest)
    .slice(0, 8);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const productGroups = new Map();
  for (const purchase of purchases) {
    if (purchase.timestamp < weekAgo) continue;
    for (const productName of purchase.products) {
      const key = normalizeText(productName);
      if (!key) continue;
      const current = productGroups.get(key) || { name: productName, purchases: 0 };
      current.purchases += 1;
      productGroups.set(key, current);
    }
  }

  const generatedAt = new Date();
  return {
    version: CACHE_VERSION,
    dbName,
    days,
    range: { start, end },
    generatedAt,
    staleAt: new Date(generatedAt.getTime() + STALE_AFTER_MS),
    impact: {
      complexQueryCount: rows.length,
      rows: rows.slice(0, QUERY_LOG_LIMIT).map(row => ({
        _id: row._id,
        query: row.query,
        timestamp: row.timestamp,
        isComplex: row.isComplex,
        isComplicated: row.isComplicated,
        resultsCount: row.resultsCount,
        impactKey: row.impactKey,
        cartCount: row.cartCount,
        cartRevenue: row.cartRevenue,
        checkoutCount: row.checkoutCount,
      })),
      addToCartCount,
      checkoutCount: checkoutKeys.size,
      rescuedWithCart: rows.filter(row => row.cartCount > 0).length,
      rescuedWithCheckout: rows.filter(row => row.checkoutCount > 0).length,
      cartRevenue,
      checkoutRevenue,
      totalValue: checkoutRevenue > 0 ? checkoutRevenue : cartRevenue,
      purchases,
      topProductsThisWeek: Array.from(productGroups.values())
        .sort((a, b) => b.purchases - a.purchases)
        .slice(0, 8),
      topSearches,
      opportunities,
    },
  };
}

export async function readImpactSnapshot(client, dbName, days = 30) {
  return client.db("users").collection(CACHE_COLLECTION).findOne({
    _id: cacheId(dbName, days),
    version: CACHE_VERSION,
  });
}

export function isImpactSnapshotStale(snapshot) {
  return !snapshot?.staleAt || new Date(snapshot.staleAt).getTime() <= Date.now();
}

export async function refreshImpactSnapshot(client, dbName, days = 30) {
  const collection = client.db("users").collection(CACHE_COLLECTION);
  const _id = cacheId(dbName, days);
  const now = new Date();
  const lockUntil = new Date(now.getTime() + LOCK_FOR_MS);
  const lock = await collection.findOneAndUpdate(
    {
      _id,
      $or: [
        { refreshingUntil: { $exists: false } },
        { refreshingUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        version: CACHE_VERSION,
        dbName,
        days,
        refreshingUntil: lockUntil,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: "after" }
  ).catch(error => {
    if (error?.code === 11000) return null;
    throw error;
  });

  if (!lock?.value && !lock?._id) {
    return readImpactSnapshot(client, dbName, days);
  }

  try {
    const snapshot = await buildImpactSnapshot(client, dbName, days);
    await collection.updateOne(
      { _id },
      {
        $set: {
          ...snapshot,
          updatedAt: new Date(),
        },
        $unset: { refreshingUntil: "" },
      }
    );
    return { _id, ...snapshot };
  } catch (error) {
    await collection.updateOne(
      { _id },
      {
        $set: {
          lastRefreshError: error.message,
          lastRefreshFailedAt: new Date(),
        },
        $unset: { refreshingUntil: "" },
      }
    );
    throw error;
  }
}
