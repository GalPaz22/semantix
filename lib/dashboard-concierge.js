import { ObjectId } from 'mongodb';

const GAP = 30 * 60 * 1000;
const DAY = 86400000;
const MAX_ROWS = 120000;
export const BEAUTICS_DB = 'woo-beautics-shop-co-il';
const collections = ['concierge_conversations', 'queries', 'product_clicks', 'cart', 'checkout_events'];

function parseTime(value) {
  if (value instanceof Date) return Number.isFinite(+value) ? +value : null;
  if (typeof value === 'number' && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
  if (typeof value !== 'string' || !value.trim()) return null;
  if (/^\d{9,13}$/.test(value.trim())) return parseTime(Number(value));
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}
const timeOf = row => parseTime(row.timestamp) ?? parseTime(row.created_at) ?? parseTime(row.received_at) ?? row._id?.getTimestamp?.().getTime();
const visitorOf = row => {
  const id = row.session_id || row.sessionId || row.orderData?.session_id;
  return typeof id === 'string' && /^vis-\S+$/.test(id.trim()) ? id.trim() : null;
};
const orderAmount = row => {
  for (const value of [row.order_total, row.orderData?.total_price, row.orderData?.total, row.total_price, row.total, row.cart_total]) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) continue;
    const amount = typeof value === 'string' ? Number(value.replace(/,/g, '')) : value;
    const cents = Math.round(amount * 100);
    if (Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(cents)) return cents;
  }
  return null;
};
const orderCurrency = row => {
  const value = row.currency ?? row.orderData?.currency;
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value.trim()) ? value.trim() : null;
};

// Beautics' session_id persists across visits. Reconstruct visits from inactivity
// instead of attributing every later order from that browser to the concierge.
export function summarizeConciergeVisits(rows, window) {
  const from = parseTime(window?.from), to = parseTime(window?.to);
  if (from == null || to == null || from >= to) throw Error('Invalid concierge window');
  const byVisitor = new Map();
  const add = (row, kind, time = timeOf(row)) => {
    const visitor = visitorOf(row);
    if (!visitor || !Number.isFinite(time) || time < from - 2 * DAY || time >= to) return;
    if (!byVisitor.has(visitor)) byVisitor.set(visitor, []);
    byVisitor.get(visitor).push({ kind, time, row });
  };
  let conversations = 0, identifiedConversations = 0;
  for (const row of rows.concierge_conversations) {
    const time = timeOf(row);
    if (time >= from && time < to) {
      conversations++;
      if (visitorOf(row)) identifiedConversations++;
    }
    add(row, 'concierge');
    for (const turn of row.turnsAt || []) {
      const at = parseTime(turn);
      if (at > time) add(row, 'turn', at);
    }
  }
  for (const row of rows.queries) add(row, 'search');
  for (const row of rows.product_clicks) add(row, 'click');
  for (const row of rows.cart) {
    if ((!row.event_type || row.event_type === 'add_to_cart') && row.source === 'woocommerce_add_to_cart') add(row, 'cart');
  }
  // Count paid server webhooks only, with order IDs deduplicated before attribution.
  // Unidentified duplicates must not replace an identified paid order.
  const orders = new Map();
  for (const row of [...rows.checkout_events].sort((a, b) => timeOf(a) - timeOf(b))) {
    if (row.event_type === 'checkout_initiated') add(row, 'checkout');
    const time = timeOf(row);
    if (row.event_type !== 'checkout_completed' || row.source !== 'woocommerce_order_completed' || !row.order_id || !Number.isFinite(time) || time < from - 2 * DAY || time >= to) continue;
    const key = String(row.order_id), old = orders.get(key);
    if (!old || (!visitorOf(old) && visitorOf(row))) orders.set(key, row);
  }
  for (const row of orders.values()) add(row, 'purchase');

  const totals = { visits: 0, cartVisits: 0, purchaseVisits: 0, engagedVisits: 0 };
  const attributedOrders = new Map();
  const countVisit = events => {
    const first = events.find(event => event.kind === 'concierge');
    // The first activation anchors the cohort, including visits at the boundary.
    if (!first || first.time < from) return;
    totals.visits++;
    if (events.some(e => e.kind === 'concierge' && (e.row.turns > 1 || e.row.hasMessage === true))) totals.engagedVisits++;
    for (const kind of ['cart', 'purchase']) {
      if (events.some(e => e.kind === kind && e.time >= first.time)) totals[`${kind}Visits`]++;
    }
    for (const event of events) {
      if (event.kind === 'purchase' && event.time >= first.time) attributedOrders.set(String(event.row.order_id), event.row);
    }
  };
  for (const events of byVisitor.values()) {
    events.sort((a, b) => a.time - b.time);
    let visit = [];
    for (const event of events) {
      if (visit.length && event.time - visit[visit.length - 1].time > GAP) { countVisit(visit); visit = []; }
      visit.push(event);
    }
    countVisit(visit);
  }
  const paidOrders = [...orders.values()].filter(row => timeOf(row) >= from);
  const coverage = {
    conversations, identifiedConversations,
    paidOrders: paidOrders.length,
    identifiedPaidOrders: paidOrders.filter(visitorOf).length,
  };
  let measuredOrders = 0;
  const amounts = new Map();
  for (const row of attributedOrders.values()) {
    const cents = orderAmount(row), currency = orderCurrency(row);
    if (cents == null || currency == null) continue;
    measuredOrders++;
    const total = amounts.get(currency) || { cents: 0, orders: 0 };
    total.cents += cents; total.orders++;
    amounts.set(currency, total);
  }
  return {
    status: 'ok', window, inactivityMinutes: 30, ...totals, coverage,
    revenue: paidOrders.length ? {
      orders: attributedOrders.size, measuredOrders,
      missingOrders: attributedOrders.size - measuredOrders,
      totals: [...amounts].sort(([a], [b]) => a.localeCompare(b)).map(([currency, total]) => ({ currency, amount: total.cents / 100, orders: total.orders })),
    } : null,
    cartRate: totals.visits ? totals.cartVisits / totals.visits : null,
    purchaseRate: totals.visits && paidOrders.length ? totals.purchaseVisits / totals.visits : null,
  };
}

// Small projections keep messages, contact details, and raw payloads out of memory.
async function loadSource(db, name, from, to) {
  const common = { _id: 1, timestamp: 1, created_at: 1, received_at: 1, session_id: 1, sessionId: 1 };
  const projection = name === 'concierge_conversations' ? {
    ...common, turns: 1,
    turnsAt: { $map: { input: { $ifNull: ['$transcript', []] }, as: 'turn', in: '$$turn.at' } },
    hasMessage: { $anyElementTrue: [{ $map: { input: { $ifNull: ['$transcript', []] }, as: 'turn', in: { $ne: [{ $ifNull: ['$$turn.message', ''] }, ''] } } }] },
  } : { ...common, event_type: 1, source: 1, ...(name === 'checkout_events' ? {
    order_id: 1, order_total: 1, total_price: 1, total: 1, cart_total: 1, currency: 1,
    'orderData.session_id': 1, 'orderData.total_price': 1, 'orderData.total': 1, 'orderData.currency': 1,
  } : {}) };
  const collection = db.collection(name);
  const latest = await collection.findOne({}, { sort: { _id: -1 }, projection: { _id: 1 }, maxTimeMS: 10000 });
  // Match the main analytics reader's insertion-time padding for mixed timestamp types.
  const filter = latest?._id instanceof ObjectId ? { _id: {
    $gte: ObjectId.createFromTime(Math.floor((from - 2 * DAY) / 1000)),
    $lt: ObjectId.createFromTime(Math.ceil((to + 2 * DAY) / 1000)),
  } } : {};
  const rows = await collection.find(filter, { projection, maxTimeMS: 10000 }).limit(MAX_ROWS + 1).toArray();
  if (rows.length > MAX_ROWS) throw Error('Concierge source truncated');
  return rows;
}

const cache = new Map();
export async function getDashboardConcierge(client, dbName, window) {
  if (dbName !== BEAUTICS_DB) return null;
  const from = parseTime(window?.from), to = parseTime(window?.to);
  if (from == null || to == null || from >= to || to - from > 91 * DAY) return { status: 'unavailable' };
  const key = JSON.stringify([dbName, from, to]);
  for (const [key, entry] of cache) if (entry.expires <= Date.now()) cache.delete(key);
  if (!cache.has(key)) {
    const entry = { expires: Date.now() + 60000 };
    entry.result = (async () => {
      const db = client.db(dbName);
      const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
      if (collections.some(name => !names.has(name))) throw Error('Concierge source missing');
      const loaded = await Promise.all(collections.map(async name => [name, await loadSource(db, name, from, to)]));
      return summarizeConciergeVisits(Object.fromEntries(loaded), window);
    })().catch(() => {
      if (cache.get(key) === entry) cache.delete(key);
      return { status: 'unavailable' };
    });
    if (cache.size >= 6) cache.delete(cache.keys().next().value);
    cache.set(key, entry);
  }
  return cache.get(key).result;
}
