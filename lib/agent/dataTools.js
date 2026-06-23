import clientPromise from "/lib/mongodb";

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - Number(days || 30));
  return d;
}

// Timestamp storage differs by collection (BSON type-bracketing matters):
//   queries.timestamp        -> Date
//   product_clicks.timestamp -> Date
//   cart.timestamp           -> string (ISO)
// Pass tsType to match the stored type, otherwise the $gte silently matches nothing.
function buildTimeMatch(days, { field = "timestamp", tsType = "date" } = {}) {
  if (!days) return {};
  const cutoff = dateDaysAgo(days);
  const value = tsType === "string" ? cutoff.toISOString() : cutoff;
  return { [field]: { $gte: value } };
}

async function getDb(dbName) {
  const client = await clientPromise;
  return client.db(dbName);
}

// ── checkout_events normalization ─────────────────────────────────────────────
// Schema varies across clients: timestamp can be a Date, an int/double epoch
// (seconds), or an ISO string (fallback created_at); line items live under
// products | cart_items | line_items; order total under cart_total |
// order_total | total_price. These expressions normalize all variants.
const CHECKOUT_DATE = {
  $switch: {
    branches: [
      { case: { $eq: [{ $type: "$timestamp" }, "date"] }, then: "$timestamp" },
      {
        case: { $in: [{ $type: "$timestamp" }, ["double", "int", "long", "decimal"]] },
        then: { $toDate: { $multiply: [{ $toDouble: "$timestamp" }, 1000] } },
      },
      {
        case: { $eq: [{ $type: "$timestamp" }, "string"] },
        then: { $dateFromString: { dateString: "$timestamp", onError: null, onNull: null } },
      },
    ],
    default: {
      $dateFromString: { dateString: { $ifNull: ["$created_at", ""] }, onError: null, onNull: null },
    },
  },
};

const CHECKOUT_ITEMS = {
  $ifNull: ["$products", { $ifNull: ["$cart_items", { $ifNull: ["$line_items", []] }] }],
};

const CHECKOUT_TOTAL = {
  $convert: {
    input: { $ifNull: ["$cart_total", { $ifNull: ["$order_total", "$total_price"] }] },
    to: "double",
    onError: 0,
    onNull: 0,
  },
};

async function checkoutAvailable(db) {
  const cols = await db.listCollections({ name: "checkout_events" }).toArray();
  if (!cols.length) return false;
  return (await db.collection("checkout_events").estimatedDocumentCount()) > 0;
}

// ── Whitelisted tools ────────────────────────────────────────────────────────
// Each function takes (db, args) and returns a plain JSON-serializable result.

async function overview(db) {
  const [queries, clicks, cart, profiles] = await Promise.all([
    db.collection("queries").countDocuments({}),
    db.collection("product_clicks").countDocuments({}),
    db.collection("cart").countDocuments({}),
    db.collection("profiles").countDocuments({}).catch(() => 0),
  ]);

  const lastQuery = await db
    .collection("queries")
    .findOne({}, { sort: { timestamp: -1 }, projection: { timestamp: 1, query: 1 } });
  const firstQuery = await db
    .collection("queries")
    .findOne({}, { sort: { timestamp: 1 }, projection: { timestamp: 1 } });

  return {
    totals: { queries, product_clicks: clicks, cart_events: cart, profiles },
    firstQueryAt: firstQuery?.timestamp || null,
    lastQueryAt: lastQuery?.timestamp || null,
    lastQuery: lastQuery?.query || null,
  };
}

async function topQueries(db, { days = 30, limit = 20 } = {}) {
  const pipeline = [
    { $match: buildTimeMatch(days) },
    {
      $group: {
        _id: { $toLower: { $ifNull: ["$query", ""] } },
        count: { $sum: 1 },
        avgDelivered: { $avg: { $size: { $ifNull: ["$deliveredProducts", []] } } },
        sampleCategory: { $first: "$category" },
      },
    },
    { $match: { _id: { $ne: "" } } },
    { $sort: { count: -1 } },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 0,
        query: "$_id",
        count: 1,
        avgDelivered: { $round: ["$avgDelivered", 1] },
        sampleCategory: 1,
      },
    },
  ];
  return db.collection("queries").aggregate(pipeline).toArray();
}

async function zeroResultQueries(db, { days = 30, limit = 25 } = {}) {
  const pipeline = [
    { $match: buildTimeMatch(days) },
    {
      $addFields: {
        deliveredCount: { $size: { $ifNull: ["$deliveredProducts", []] } },
      },
    },
    { $match: { deliveredCount: 0 } },
    {
      $group: {
        _id: { $toLower: { $ifNull: ["$query", ""] } },
        count: { $sum: 1 },
        lastSeen: { $max: "$timestamp" },
      },
    },
    { $match: { _id: { $ne: "" } } },
    { $sort: { count: -1 } },
    { $limit: Number(limit) },
    { $project: { _id: 0, query: "$_id", count: 1, lastSeen: 1 } },
  ];
  return db.collection("queries").aggregate(pipeline).toArray();
}

async function topClickedProducts(db, { days = 30, limit = 20 } = {}) {
  const pipeline = [
    { $match: buildTimeMatch(days) },
    {
      $group: {
        _id: "$product_id",
        product_name: { $first: "$product_name" },
        clicks: { $sum: 1 },
        sessions: { $addToSet: "$session_id" },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 0,
        product_id: "$_id",
        product_name: 1,
        clicks: 1,
        uniqueSessions: { $size: "$sessions" },
      },
    },
  ];
  return db.collection("product_clicks").aggregate(pipeline).toArray();
}

async function cartProducts(db, { days = 30, limit = 20 } = {}) {
  const pipeline = [
    { $match: buildTimeMatch(days, { tsType: "string" }) },
    {
      $group: {
        _id: "$product_id",
        product_name: { $first: "$product_name" },
        addToCartCount: { $sum: 1 },
        sessions: { $addToSet: "$session_id" },
      },
    },
    { $sort: { addToCartCount: -1 } },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 0,
        product_id: "$_id",
        product_name: 1,
        addToCartCount: 1,
        uniqueSessions: { $size: "$sessions" },
      },
    },
  ];
  return db.collection("cart").aggregate(pipeline).toArray();
}

async function conversionFunnel(db, { days = 30 } = {}) {
  const dateMatch = buildTimeMatch(days, { tsType: "date" });
  const stringMatch = buildTimeMatch(days, { tsType: "string" });
  const [searchSessions, clickSessions, cartSessions] = await Promise.all([
    db.collection("queries").distinct("sessionId", dateMatch).catch(() => []),
    db.collection("product_clicks").distinct("session_id", dateMatch),
    db.collection("cart").distinct("session_id", stringMatch),
  ]);

  const totalSearches = await db.collection("queries").countDocuments(dateMatch);
  const totalClicks = await db.collection("product_clicks").countDocuments(dateMatch);
  const totalCart = await db.collection("cart").countDocuments(stringMatch);

  // Checkout stage (only when checkout_events has data).
  let checkout = { available: false };
  if (await checkoutAvailable(db)) {
    const cutoff = dateDaysAgo(days);
    const rows = await db
      .collection("checkout_events")
      .aggregate([
        { $addFields: { _d: CHECKOUT_DATE } },
        { $match: { _d: { $gte: cutoff } } },
        { $group: { _id: "$event_type", count: { $sum: 1 } } },
      ])
      .toArray();
    const byType = {};
    let total = 0;
    rows.forEach((r) => {
      byType[r._id || "unknown"] = r.count;
      total += r.count;
    });
    checkout = { available: true, total, byEventType: byType };
  }

  const rates = {
    clicksPerSearch: totalSearches ? +(totalClicks / totalSearches).toFixed(3) : null,
    cartPerClick: totalClicks ? +(totalCart / totalClicks).toFixed(3) : null,
  };
  if (checkout.available) {
    rates.checkoutPerCart = totalCart ? +(checkout.total / totalCart).toFixed(3) : null;
  }

  return {
    days,
    counts: {
      searches: totalSearches,
      clicks: totalClicks,
      addToCart: totalCart,
      checkout: checkout.available ? checkout.total : null,
    },
    checkout,
    uniqueSessions: {
      search: searchSessions.length,
      click: clickSessions.length,
      cart: cartSessions.length,
    },
    rates,
  };
}

async function categoryBreakdown(db, { days = 30, limit = 20 } = {}) {
  const pipeline = [
    { $match: buildTimeMatch(days) },
    {
      $group: {
        _id: { $ifNull: ["$category", "(none)"] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: Number(limit) },
    { $project: { _id: 0, category: "$_id", count: 1 } },
  ];
  return db.collection("queries").aggregate(pipeline).toArray();
}

async function queryTrends(db, { days = 30 } = {}) {
  const pipeline = [
    { $match: buildTimeMatch(days) },
    {
      $addFields: {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
      },
    },
    { $match: { day: { $ne: null } } },
    {
      $group: {
        _id: "$day",
        searches: { $sum: 1 },
        zeroResults: {
          $sum: {
            $cond: [
              { $eq: [{ $size: { $ifNull: ["$deliveredProducts", []] } }, 0] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, day: "$_id", searches: 1, zeroResults: 1 } },
  ];
  return db.collection("queries").aggregate(pipeline).toArray();
}

async function priceDistribution(db, { days = 30 } = {}) {
  const pipeline = [
    { $match: { ...buildTimeMatch(days), price: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        avgPrice: { $round: ["$avgPrice", 2] },
        minPrice: 1,
        maxPrice: 1,
        count: 1,
      },
    },
  ];
  const res = await db.collection("queries").aggregate(pipeline).toArray();
  return res[0] || { count: 0 };
}

function hoursFromRows(rows) {
  const map = Object.fromEntries(rows.map((r) => [r._id ?? r.hour, r.count]));
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: map[h] || 0 }));
  const total = hours.reduce((s, h) => s + h.count, 0);
  const peak = hours.reduce((a, b) => (b.count > a.count ? b : a), hours[0]);
  return { hours, total, peakHour: total ? peak.hour : null, peakCount: peak.count };
}

async function activityByHour(db, { metric = "searches", days = 30 } = {}) {
  const tz = "Asia/Jerusalem";

  // Checkout has a varied schema and needs date normalization before bucketing.
  if (metric === "checkout") {
    if (!(await checkoutAvailable(db))) {
      return { metric, days, timezone: tz, available: false, ...hoursFromRows([]) };
    }
    const cutoff = dateDaysAgo(days);
    const rows = await db
      .collection("checkout_events")
      .aggregate([
        { $addFields: { _d: CHECKOUT_DATE } },
        { $match: { _d: { $gte: cutoff } } },
        { $group: { _id: { $hour: { date: "$_d", timezone: tz } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    return { metric, days, timezone: tz, available: true, ...hoursFromRows(rows) };
  }

  let collection, dateExpr, match;
  if (metric === "cart") {
    collection = "cart";
    match = buildTimeMatch(days, { tsType: "string" });
    dateExpr = { $dateFromString: { dateString: "$timestamp", onError: null, onNull: null } };
  } else {
    collection = metric === "clicks" ? "product_clicks" : "queries";
    match = buildTimeMatch(days, { tsType: "date" });
    dateExpr = "$timestamp";
  }

  const pipeline = [
    { $match: match },
    { $addFields: { _d: dateExpr } },
    { $match: { _d: { $ne: null } } },
    { $group: { _id: { $hour: { date: "$_d", timezone: tz } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, hour: "$_id", count: 1 } },
  ];
  const rows = await db.collection(collection).aggregate(pipeline).toArray();
  return { metric, days, timezone: tz, available: true, ...hoursFromRows(rows) };
}

async function checkoutSummary(db, { days = 30 } = {}) {
  if (!(await checkoutAvailable(db))) {
    return { available: false, note: "אין נתוני checkout (קופה) לחנות הזו." };
  }
  const cutoff = dateDaysAgo(days);
  const rows = await db
    .collection("checkout_events")
    .aggregate([
      { $addFields: { _d: CHECKOUT_DATE, _total: CHECKOUT_TOTAL } },
      { $match: { _d: { $gte: cutoff } } },
      { $group: { _id: "$event_type", count: { $sum: 1 }, revenue: { $sum: "$_total" } } },
    ])
    .toArray();

  const byEventType = {};
  let totalEvents = 0;
  let totalRevenue = 0;
  rows.forEach((r) => {
    byEventType[r._id || "unknown"] = { count: r.count, revenue: Math.round(r.revenue) };
    totalEvents += r.count;
    totalRevenue += r.revenue;
  });

  // Prefer "completed" revenue/AOV when that event type exists, else all events.
  const completed = byEventType.checkout_completed;
  const aovBase = completed || { count: totalEvents, revenue: totalRevenue };

  return {
    available: true,
    days,
    totalEvents,
    byEventType,
    totalRevenue: Math.round(totalRevenue),
    avgOrderValue: aovBase.count ? +(aovBase.revenue / aovBase.count).toFixed(2) : 0,
  };
}

async function topPurchasedProducts(db, { days = 30, limit = 20 } = {}) {
  if (!(await checkoutAvailable(db))) {
    return { available: false, items: [], note: "אין נתוני checkout (קופה) לחנות הזו." };
  }
  const cutoff = dateDaysAgo(days);
  const qty = { $convert: { input: "$_items.quantity", to: "double", onError: 1, onNull: 1 } };
  const price = { $convert: { input: "$_items.price", to: "double", onError: 0, onNull: 0 } };
  const items = await db
    .collection("checkout_events")
    .aggregate([
      { $addFields: { _d: CHECKOUT_DATE, _items: CHECKOUT_ITEMS } },
      { $match: { _d: { $gte: cutoff } } },
      { $unwind: "$_items" },
      {
        $group: {
          _id: { $ifNull: ["$_items.product_id", "$_items.product_name"] },
          product_name: { $first: "$_items.product_name" },
          quantity: { $sum: qty },
          revenue: { $sum: { $multiply: [qty, price] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 0,
          product_id: "$_id",
          product_name: 1,
          quantity: 1,
          orders: 1,
          revenue: { $round: ["$revenue", 0] },
        },
      },
    ])
    .toArray();
  return { available: true, days, items };
}

async function searchExamples(db, { query, limit = 10 } = {}) {
  const filter = query
    ? { query: { $regex: String(query).slice(0, 80), $options: "i" } }
    : {};
  const docs = await db
    .collection("queries")
    .find(filter, {
      projection: {
        _id: 0,
        query: 1,
        timestamp: 1,
        category: 1,
        price: 1,
        type: 1,
        deliveredProducts: 1,
      },
    })
    .sort({ timestamp: -1 })
    .limit(Number(limit))
    .toArray();
  return docs.map((d) => ({
    ...d,
    deliveredCount: Array.isArray(d.deliveredProducts) ? d.deliveredProducts.length : 0,
    deliveredProducts: undefined,
  }));
}

// ── Registry ─────────────────────────────────────────────────────────────────

const TOOLS = {
  overview: { fn: overview },
  top_queries: { fn: topQueries },
  zero_result_queries: { fn: zeroResultQueries },
  top_clicked_products: { fn: topClickedProducts },
  cart_products: { fn: cartProducts },
  conversion_funnel: { fn: conversionFunnel },
  category_breakdown: { fn: categoryBreakdown },
  query_trends: { fn: queryTrends },
  price_distribution: { fn: priceDistribution },
  activity_by_hour: { fn: activityByHour },
  checkout_summary: { fn: checkoutSummary },
  top_purchased_products: { fn: topPurchasedProducts },
  search_examples: { fn: searchExamples },
};

export async function runTool(dbName, toolName, args = {}) {
  const entry = TOOLS[toolName];
  if (!entry) throw new Error(`Unknown tool: ${toolName}`);
  const db = await getDb(dbName);
  return entry.fn(db, args || {});
}

// Anthropic tool schemas
export const TOOL_SCHEMAS = [
  {
    name: "overview",
    description:
      "High-level totals for the store: number of search queries, product clicks, cart events, profiles, and the date range of available data. Call this first to understand data volume.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "top_queries",
    description:
      "Most frequent search queries in the last N days, with how many products were delivered on average for each.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Look-back window in days (default 30)." },
        limit: { type: "number", description: "Max rows to return (default 20)." },
      },
    },
  },
  {
    name: "zero_result_queries",
    description:
      "Search queries that returned zero products (deliveredProducts empty), ranked by frequency. These are missed demand / catalog gaps.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "top_clicked_products",
    description: "Products with the most click-throughs from search results in the last N days.",
    input_schema: {
      type: "object",
      properties: { days: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "cart_products",
    description: "Products most frequently added to cart in the last N days.",
    input_schema: {
      type: "object",
      properties: { days: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "conversion_funnel",
    description:
      "Funnel volumes and ratios across searches → clicks → add-to-cart over the last N days, including unique session counts.",
    input_schema: { type: "object", properties: { days: { type: "number" } } },
  },
  {
    name: "category_breakdown",
    description: "Distribution of searches across categories in the last N days.",
    input_schema: {
      type: "object",
      properties: { days: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "query_trends",
    description:
      "Daily time series of search volume and zero-result counts over the last N days. Use for trend / spike detection.",
    input_schema: { type: "object", properties: { days: { type: "number" } } },
  },
  {
    name: "price_distribution",
    description: "Average, min, and max price filter values used in searches over the last N days.",
    input_schema: { type: "object", properties: { days: { type: "number" } } },
  },
  {
    name: "activity_by_hour",
    description:
      "Activity broken down by hour of day (0-23, Israel time) over the last N days. Use for questions about WHEN users are active or buy. metric: 'searches' (queries), 'clicks' (product clicks), or 'cart' (add-to-cart — the closest proxy for purchasing, since there is no checkout data). Returns per-hour counts plus the peak hour.",
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["searches", "clicks", "cart", "checkout"],
          description:
            "Which event type to bucket by hour. Prefer 'checkout' for buying/purchase questions when checkout data exists; otherwise fall back to 'cart'.",
        },
        days: { type: "number" },
      },
    },
  },
  {
    name: "checkout_summary",
    description:
      "Checkout/purchase summary over the last N days: number of checkout events (by event_type, e.g. checkout_initiated vs checkout_completed), total revenue, and average order value. Returns {available:false} if the store has no checkout data. Use this for revenue, orders, and conversion questions.",
    input_schema: { type: "object", properties: { days: { type: "number" } } },
  },
  {
    name: "top_purchased_products",
    description:
      "Products that were actually purchased/checked-out the most in the last N days (by quantity), with revenue and order counts. This reflects real purchases, unlike top_clicked_products (interest) or cart_products (intent). Returns {available:false} if the store has no checkout data.",
    input_schema: {
      type: "object",
      properties: { days: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "search_examples",
    description:
      "Raw recent example search documents, optionally filtered by a substring of the query text. Use to inspect what real searches look like.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional substring to filter queries by." },
        limit: { type: "number" },
      },
    },
  },
];
