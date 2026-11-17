// Customer profiles: the store's own customers (email, first name, phone) tied to the browser sessions the search
// plugin tracks. The details come from session_identities, which the search server fills from completed orders and
// signed-in accounts (dashboard-server session-identity.mjs). One profile per customer, merged by email, or by phone
// when there is no email; each profile lists what its sessions did: searches, clicks, cart, orders and concierge chats.

const PAGE_SIZE = 25;
const MAX_IDENTITIES = 20000;
const RECENT = 8;

// Stores whose dashboard shows profiles.
export const PROFILE_STORES = new Set(['garmin', 'manoVino']);
export const profilesEnabled = (dbName) => PROFILE_STORES.has(dbName);

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
      profile = { key, email: email || null, firstName: null, phone: null, sources: new Set(), sessions: new Set(), orderIds: new Set(), firstSeen: null, lastSeen: null };
      byKey.set(key, profile);
    }
    profile.sessions.add(row.session_id);
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
    .map((p) => ({ ...p, sources: [...p.sources], sessions: [...p.sessions], orderIds: [...p.orderIds] }))
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

/** One page of profiles with their activity. */
export async function getDashboardProfiles(client, dbName, { query = '', page = 1 } = {}) {
  if (!profilesEnabled(dbName)) throw Object.assign(new Error('פרופילי לקוחות אינם זמינים לחנות הזו'), { status: 404 });
  const pageNumber = Number(page);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 10000) throw Object.assign(new Error('עמוד לא תקין'), { status: 400 });
  const db = client.db(dbName);
  const identities = await db.collection('session_identities').find(
    { $and: [profileFilter(query), { $or: [{ email: { $type: 'string' } }, { phone: { $type: 'string' } }] }] },
    { projection: { _id: 0, session_id: 1, email: 1, first_name: 1, phone: 1, source: 1, order_ids: 1, created_at: 1, updated_at: 1 }, maxTimeMS: 20000 },
  ).sort({ updated_at: -1 }).limit(MAX_IDENTITIES).toArray();
  const all = mergeIdentities(identities);
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
      { projection: { _id: 0, session_id: 1, order_id: 1, order_total: 1, currency: 1, cart_items: 1, created_at: 1, timestamp: 1 }, maxTimeMS: 20000 })
      .sort({ _id: -1 }).limit(500).toArray(),
    db.collection('concierge_conversations').find({ session_id: { $in: sessions } },
      { projection: { _id: 0, conversation_id: 1, session_id: 1, query: 1, created_at: 1, updated_at: 1, turns: 1, transcript: { $slice: 1 } }, maxTimeMS: 20000 })
      .sort({ updated_at: -1 }).limit(500).toArray(),
  ]) : [empty, empty, empty, [], [], []];

  const profiles = pageRows.map((p) => {
    const own = new Set(p.sessions);
    const seenOrders = new Set();
    const profileOrders = orders.filter((o) => own.has(o.session_id)).filter((o) => {
      const id = String(o.order_id || '');
      if (!id || seenOrders.has(id)) return false;
      seenOrders.add(id); return true;
    }).map((o) => ({
      id: String(o.order_id),
      total: Number(o.order_total) || 0,
      currency: str(o.currency) || 'ILS',
      at: iso(o.created_at) || iso(o.timestamp),
      items: (o.cart_items || []).map((i) => str(i.product_name || i.name)).filter(Boolean).slice(0, 6),
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
    };
  });
  return { page: pageNumber, pageSize: PAGE_SIZE, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)), profiles };
}
