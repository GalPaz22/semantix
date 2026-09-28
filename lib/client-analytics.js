import { buildDynamicDateFilter } from "/lib/analytics-helper";

// Search performance summary for the client dashboard.
//
// Attribution follows the admin AnalyticsPanel: a cart add or checkout event
// counts as "from search" when it carries a non-empty search_query. Revenue
// uses checkout events when the store sends them, otherwise cart value (and
// says so via revenueSource).

const MAX_EVENTS = 50000;
const DAY_MS = 24 * 60 * 60 * 1000;

function money(value) {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function qty(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

const norm = (q) => String(q || "").trim().toLowerCase();

function checkoutValue(event) {
  if (event.cart_total != null) return money(event.cart_total);
  if (event.order_total != null) return money(event.order_total);
  if (event.total_price != null) return money(event.total_price);
  return money(event.product_price) * qty(event.quantity);
}

const cartValue = (event) => money(event.product_price) * qty(event.quantity);

async function windowFilters(db, start, end) {
  const [queries, clicks, cart, checkout] = await Promise.all([
    buildDynamicDateFilter(db, "queries", start, end),
    buildDynamicDateFilter(db, "product_clicks", start, end),
    buildDynamicDateFilter(db, "cart", start, end),
    buildDynamicDateFilter(db, "checkout_events", start, end),
  ]);
  return { queries, clicks, cart, checkout };
}

const fromSearch = { search_query: { $exists: true, $nin: [null, ""] } };

async function searchEvents(db, collection, filter, projection) {
  return db
    .collection(collection)
    .find({ ...filter, ...fromSearch }, { projection })
    .limit(MAX_EVENTS)
    .toArray()
    .catch(() => []);
}

async function periodTotals(db, f) {
  const [searches, zeroResults, carts, checkouts] = await Promise.all([
    db.collection("queries").countDocuments(f.queries),
    db.collection("queries").countDocuments({
      ...f.queries,
      $or: [{ deliveredProducts: { $exists: false } }, { deliveredProducts: { $size: 0 } }],
    }),
    searchEvents(db, "cart", f.cart, { product_price: 1, quantity: 1 }),
    searchEvents(db, "checkout_events", f.checkout, {
      cart_total: 1, order_total: 1, total_price: 1, product_price: 1, quantity: 1,
    }),
  ]);

  const hasCheckout = checkouts.length > 0;
  const conversions = hasCheckout ? checkouts.length : carts.length;
  const revenue = hasCheckout
    ? checkouts.reduce((s, e) => s + checkoutValue(e), 0)
    : carts.reduce((s, e) => s + cartValue(e), 0);

  return {
    searches,
    zeroResults,
    cartAdds: carts.length,
    orders: hasCheckout ? checkouts.length : null,
    conversions,
    conversionSource: hasCheckout ? "checkout" : "cart",
    conversionRate: searches ? conversions / searches : 0,
    failedRate: searches ? zeroResults / searches : 0,
    revenue: Math.round(revenue),
    revenueSource: hasCheckout ? "checkout" : "cart",
  };
}

async function queryStats(db, f, limit) {
  const rows = await db
    .collection("queries")
    .aggregate([
      { $match: f.queries },
      {
        $group: {
          _id: { $toLower: { $trim: { input: { $ifNull: ["$query", ""] } } } },
          searches: { $sum: 1 },
          zeroResults: {
            $sum: { $cond: [{ $eq: [{ $size: { $ifNull: ["$deliveredProducts", []] } }, 0] }, 1, 0] },
          },
          lastSeen: { $max: "$timestamp" },
        },
      },
      { $match: { _id: { $ne: "" } } },
      { $sort: { searches: -1 } },
      { $limit: limit },
    ])
    .toArray();
  return rows.map((r) => ({ query: r._id, searches: r.searches, zeroResults: r.zeroResults, lastSeen: r.lastSeen }));
}

function groupByQuery(events, value) {
  const map = new Map();
  for (const e of events) {
    const key = norm(e.search_query);
    if (!key) continue;
    const row = map.get(key) || { count: 0, value: 0 };
    row.count += 1;
    row.value += value(e);
    map.set(key, row);
  }
  return map;
}

/**
 * @param {import('mongodb').Db} db  tenant database
 * @param {{days?: number, limit?: number}} opts
 */
export async function clientSearchAnalytics(db, { days = 30, limit = 20 } = {}) {
  const now = Date.now();
  const end = new Date(now);
  const start = new Date(now - days * DAY_MS);
  const prevStart = new Date(now - 2 * days * DAY_MS);

  const [f, prevF] = await Promise.all([
    windowFilters(db, start, end),
    windowFilters(db, prevStart, start),
  ]);

  const [current, previous, queries, clicks, carts, checkouts] = await Promise.all([
    periodTotals(db, f),
    periodTotals(db, prevF),
    queryStats(db, f, 500),
    searchEvents(db, "product_clicks", f.clicks, { search_query: 1 }),
    searchEvents(db, "cart", f.cart, { search_query: 1, product_price: 1, quantity: 1 }),
    searchEvents(db, "checkout_events", f.checkout, {
      search_query: 1, cart_total: 1, order_total: 1, total_price: 1, product_price: 1, quantity: 1,
    }),
  ]);

  const clicksBy = groupByQuery(clicks, () => 0);
  const cartsBy = groupByQuery(carts, cartValue);
  const ordersBy = groupByQuery(checkouts, checkoutValue);
  const hasCheckout = checkouts.length > 0;

  const rows = queries.map((q) => {
    const c = cartsBy.get(q.query);
    const o = ordersBy.get(q.query);
    return {
      query: q.query,
      searches: q.searches,
      zeroResults: q.zeroResults,
      clicks: clicksBy.get(q.query)?.count || 0,
      cartAdds: c?.count || 0,
      orders: hasCheckout ? o?.count || 0 : null,
      revenue: Math.round(hasCheckout ? o?.value || 0 : c?.value || 0),
      lastSeen: q.lastSeen,
    };
  });

  const topSearches = rows.slice(0, limit);

  const zeroResults = rows
    .filter((r) => r.zeroResults > 0)
    .sort((a, b) => b.zeroResults - a.zeroResults)
    .slice(0, limit)
    .map((r) => ({ query: r.query, searches: r.zeroResults, lastSeen: r.lastSeen }));

  // Results were shown, but nobody clicked or added to cart.
  const noEngagement = rows
    .filter((r) => r.searches - r.zeroResults >= 5 && r.clicks === 0 && r.cartAdds === 0)
    .slice(0, limit)
    .map((r) => ({ query: r.query, searches: r.searches - r.zeroResults, lastSeen: r.lastSeen }));

  return {
    days,
    from: start.toISOString(),
    to: end.toISOString(),
    kpis: { current, previous },
    topSearches,
    failedSearches: { zeroResults, noEngagement },
  };
}
