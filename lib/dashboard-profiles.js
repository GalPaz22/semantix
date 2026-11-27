// Customer profiles: the store's own customers (email, first name, phone) tied to the browser sessions the search
// plugin tracks. The details come from session_identities, which the search server fills from completed orders and
// signed-in accounts (dashboard-server session-identity.mjs). One profile per customer, merged by email, or by phone
// when there is no email; each profile lists what its sessions did: searches, clicks, cart, orders and concierge chats.
// A profile also carries the sold-out products it searched for that are on sale again (back_in_stock on its sessions,
// written by dashboard-server restock-watch.mjs; the flag leaves once a message about them is marked as sent).
// Only the stores in RESTOCK_STORES show that.

const PAGE_SIZE = 25;
const MAX_IDENTITIES = 20000;
const RECENT = 8;

// Stores whose dashboard shows profiles.
export const PROFILE_STORES = new Set(['garmin', 'manoVino']);
export const profilesEnabled = (dbName) => PROFILE_STORES.has(dbName);
// Stores whose profiles also show the products that came back to stock.
const RESTOCK_STORES = new Set(['manoVino']);

const literal = (text) => new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const str = (value) => (typeof value === 'string' ? value.trim() : '');
const iso = (value) => {
  const time = value instanceof Date ? +value : Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};

export function profileFilter(query) {
  const q = str(query);
  if (!q) return {};
  if (q.length > 120) throw Object.assign(new Error('החיפוש ארוך מדי'), { status: 400 });
  const rx = literal(q);
  const digits = q.replace(/\D/g, '');
  return { $or: [{ email: rx }, { first_name: rx }, { phone: rx }, ...(digits.length >= 4 ? [{ phone: literal(digits) }] : [])] };
}

const webLink = (value) => (/^https?:\/\//i.test(str(value)) ? str(value) : null);

/** The flagged sessions' products, one entry per product, newest restock first. */
function restockedProducts(rows) {
  const byId = new Map();
  for (const row of rows) {
    for (const item of row.back_in_stock && Array.isArray(row.back_in_stock_products) ? row.back_in_stock_products : []) {
      const id = str(String(item?.product_id ?? ''));
      const name = str(item?.name);
      if (!id || !name) continue;
      const entry = { id, name, url: webLink(item.url), query: str(item.query), searchedAt: iso(item.searched_at), restockedAt: iso(item.restocked_at) };
      const seen = byId.get(id);
      if (!seen || String(entry.searchedAt) > String(seen.searchedAt)) byId.set(id, entry);
    }
  }
  return [...byId.values()].sort((a, b) => String(b.restockedAt).localeCompare(String(a.restockedAt)));
}

/** Identity rows → one profile per customer, newest activity first. */
export function mergeIdentities(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const email = str(row.email).toLowerCase();
    const phone = str(row.phone);
    const key = email || phone;
    if (!key || !str(row.session_id)) continue;
    let profile = byKey.get(key);
    if (!profile) {
      profile = { key, email: email || null, firstName: null, phone: null, sources: new Set(), sessions: new Set(), orderIds: new Set(), firstSeen: null, lastSeen: null, rows: [] };
      byKey.set(key, profile);
    }
    profile.sessions.add(row.session_id);
    profile.rows.push(row);
    if (row.source) profile.sources.add(row.source === 'order' ? 'order' : 'account');
    for (const id of row.order_ids || []) profile.orderIds.add(String(id));
    // An order's details win over an account's; otherwise the first seen value stays.
    const better = row.source === 'order';
    if (str(row.first_name) && (!profile.firstName || better)) profile.firstName = str(row.first_name);
    if (phone && (!profile.phone || better)) profile.phone = phone;
    const created = iso(row.created_at), updated = iso(row.updated_at) || created;
    if (created && (!profile.firstSeen || created < profile.firstSeen)) profile.firstSeen = created;
    if (updated && (!profile.lastSeen || updated > profile.lastSeen)) profile.lastSeen = updated;
  }
  return [...byKey.values()]
    .map(({ rows, ...p }) => ({ ...p, sources: [...p.sources], sessions: [...p.sessions], orderIds: [...p.orderIds], backInStock: restockedProducts(rows) }))
    .sort((a, b) => String(b.lastSeen).localeCompare(String(a.lastSeen)));
}

const countBy = async (collection, sessions, extra = {}) => {
  const rows = await collection.aggregate([
    { $match: { session_id: { $in: sessions }, ...extra } },
    { $group: { _id: '$session_id', n: { $sum: 1 } } },
  ], { maxTimeMS: 20000 }).toArray();
  return new Map(rows.map((r) => [r._id, r.n]));
};
const sum = (map, sessions) => sessions.reduce((total, s) => total + (map.get(s) || 0), 0);

const shekelText = (n) => `₪${Number(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;

// One line per product: name, quantity when more than one, unit price. Stores report lines as cart_items (Garmin) or
// products (Mano Vino); a line with no name takes it from the catalog by id, and the id is shown only as a last resort.
export function orderItems(order, names = new Map()) {
  const lines = Array.isArray(order.cart_items) && order.cart_items.length ? order.cart_items : (Array.isArray(order.products) ? order.products : []);
  return lines.map((line) => {
    const id = str(String(line.product_id ?? line.id ?? ''));
    const known = names.get(id) || {};
    const name = str(line.product_name || line.name) || known.name || (id ? `מוצר ${id}` : '');
    if (!name) return '';
    const quantity = Number(line.quantity) || 1;
    const price = Number(line.price) || Number(known.price) || 0;
    return name + (quantity > 1 ? ` ×${quantity}` : '') + (price > 0 ? ` · ${shekelText(price)}` : '');
  }).filter(Boolean);
}

/** id → {name, price} for order lines that carry no name (one query per page). */
async function catalogNames(db, orders) {
  const missing = new Set();
  for (const o of orders) for (const line of (o.products || [])) if (!str(line.product_name || line.name) && line.product_id != null) missing.add(String(line.product_id));
  if (!missing.size) return new Map();
  const ids = [...missing].flatMap((id) => (/^\d+$/.test(id) ? [id, Number(id)] : [id]));
  const rows = await db.collection('products').find({ id: { $in: ids } }, { projection: { _id: 0, id: 1, name: 1, price: 1 }, maxTimeMS: 20000 }).toArray().catch(() => []);
  return new Map(rows.map((r) => [String(r.id), { name: str(r.name), price: Number(r.price) || 0 }]));
}

/** One page of profiles with their activity. */
export async function getDashboardProfiles(client, dbName, { query = '', page = 1, restock = false } = {}) {
  if (!profilesEnabled(dbName)) throw Object.assign(new Error('פרופילי לקוחות אינם זמינים לחנות הזו'), { status: 404 });
  const pageNumber = Number(page);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 10000) throw Object.assign(new Error('עמוד לא תקין'), { status: 400 });
  const db = client.db(dbName);
  const showRestock = RESTOCK_STORES.has(dbName);
  const identities = await db.collection('session_identities').find(
    { $and: [profileFilter(query), { $or: [{ email: { $type: 'string' } }, { phone: { $type: 'string' } }] }] },
    { projection: { _id: 0, session_id: 1, email: 1, first_name: 1, phone: 1, source: 1, order_ids: 1, created_at: 1, updated_at: 1, ...(showRestock ? { back_in_stock: 1, back_in_stock_products: 1 } : {}) }, maxTimeMS: 20000 },
  ).sort({ updated_at: -1 }).limit(MAX_IDENTITIES).toArray();
  const merged = mergeIdentities(identities);
  const matching = showRestock ? merged : merged.map((p) => ({ ...p, backInStock: [] }));
  const restockCount = matching.filter((p) => p.backInStock.length).length;
  // Filtered after merging, so a shown profile keeps the activity of all its sessions.
  const all = restock && showRestock ? matching.filter((p) => p.backInStock.length) : matching;
  const pageRows = all.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
  const sessions = [...new Set(pageRows.flatMap((p) => p.sessions))];

  const empty = new Map();
  const [searches, clicks, carts, recentSearches, orders, conversations] = sessions.length ? await Promise.all([
    countBy(db.collection('queries'), sessions),
    countBy(db.collection('product_clicks'), sessions),
    countBy(db.collection('cart'), sessions),
    // Per session, so one busy session cannot crowd the others out.
    Promise.all(sessions.map((session) => db.collection('queries').find({ session_id: session }, { projection: { _id: 0, session_id: 1, query: 1 }, maxTimeMS: 20000 })
      .sort({ _id: -1 }).limit(20).toArray())).then((lists) => lists.flat()),
    db.collection('checkout_events').find({ session_id: { $in: sessions }, event_type: 'checkout_completed' },
      { projection: { _id: 0, session_id: 1, order_id: 1, order_total: 1, total_price: 1, currency: 1, cart_items: 1, products: 1, created_at: 1, timestamp: 1 }, maxTimeMS: 20000 })
      .sort({ _id: -1 }).limit(500).toArray(),
    db.collection('concierge_conversations').find({ session_id: { $in: sessions } },
      { projection: { _id: 0, conversation_id: 1, session_id: 1, query: 1, created_at: 1, updated_at: 1, turns: 1, transcript: { $slice: 1 } }, maxTimeMS: 20000 })
      .sort({ updated_at: -1 }).limit(500).toArray(),
  ]) : [empty, empty, empty, [], [], []];

  const names = await catalogNames(db, orders);

  const profiles = pageRows.map((p) => {
    const own = new Set(p.sessions);
    const seenOrders = new Set();
    const profileOrders = orders.filter((o) => own.has(o.session_id)).filter((o) => {
      const id = String(o.order_id || '');
      if (!id || seenOrders.has(id)) return false;
      seenOrders.add(id); return true;
    }).map((o) => ({
      id: String(o.order_id),
      total: Number(o.order_total ?? o.total_price) || 0,
      currency: str(o.currency) || 'ILS',
      at: iso(o.created_at) || iso(o.timestamp),
      items: orderItems(o, names).slice(0, 12),
    }));
    for (const id of p.orderIds) if (!seenOrders.has(id)) profileOrders.push({ id, total: null, currency: 'ILS', at: null, items: [] });
    const seenQueries = new Set();
    const lastSearches = recentSearches.filter((r) => own.has(r.session_id)).map((r) => str(r.query)).filter((q) => {
      if (!q || seenQueries.has(q)) return false;
      seenQueries.add(q); return true;
    }).slice(0, RECENT);
    const chats = conversations.filter((c) => own.has(c.session_id)).map((c) => ({
      id: c.conversation_id,
      at: iso(c.updated_at) || iso(c.created_at),
      turns: typeof c.turns === 'number' ? c.turns : 0,
      preview: str(c.transcript?.[0]?.message) || str(c.query),
    }));
    return {
      key: p.key,
      email: p.email,
      firstName: p.firstName,
      phone: p.phone,
      sources: p.sources,
      firstSeen: p.firstSeen,
      lastSeen: p.lastSeen,
      sessions: p.sessions.length,
      activity: { searches: sum(searches, p.sessions), clicks: sum(clicks, p.sessions), cart: sum(carts, p.sessions), orders: profileOrders.length, conversations: chats.length },
      revenue: profileOrders.reduce((total, o) => total + (o.total || 0), 0),
      lastSearches,
      orders: profileOrders,
      conversations: chats,
      backInStock: p.backInStock,
    };
  });
  return { restockCount, page: pageNumber, pageSize: PAGE_SIZE, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)), profiles };
}
