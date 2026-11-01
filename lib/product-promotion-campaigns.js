import { ObjectId } from 'mongodb';

const DAY = 86400000;
const LIMIT = 50000;
const sourceNames = ['queries', 'product_clicks', 'cart', 'checkout_events'];
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const timeOf = row => +new Date(row.timestamp ?? row.created_at);
const preview = row => row.preview === true || row.internal === true || /^(internal|test|preview|qa)[_:-]/i.test(row.session_id || row.sessionId || '');

// Equal-duration windows, capped at seven days. The post window follows the
// latest week of activity; the baseline always ends at the recorded application.
export function promotionWindows(appliedAt, now = new Date()) {
  const start = +new Date(appliedAt), end = +new Date(now);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null;
  const duration = Math.min(7 * DAY, end - start);
  return {
    before: { from: new Date(start - duration).toISOString(), to: new Date(start).toISOString() },
    after: { from: new Date(Math.max(start, end - duration)).toISOString(), to: new Date(end).toISOString() },
  };
}

function productMatcher(products) {
  const ids = new Set(products.flatMap(p => [p._id, p.id].filter(v => v != null).map(String)));
  const names = new Set(products.map(p => normalize(p.name)).filter(Boolean));
  return value => {
    if (typeof value === 'string' || typeof value === 'number') return ids.has(String(value)) || names.has(normalize(value));
    if (!value || typeof value !== 'object') return false;
    // An explicit ID takes precedence over a coincidentally identical title.
    const id = value.product_id ?? value.productId ?? value.id;
    if (id != null) return ids.has(String(id));
    return names.has(normalize(value.product_name ?? value.name ?? value.title));
  };
}

export function summarizePromotion(rows, products, window, sources = {}) {
  const matches = productMatcher(products), from = +new Date(window.from), to = +new Date(window.to);
  const inside = row => !preview(row) && timeOf(row) >= from && timeOf(row) < to;
  const countEvents = (name, accept = () => true) => {
    if (sources[name]?.status !== 'ok') return null;
    const seen = new Set(); let total = 0;
    for (const row of rows[name] || []) {
      if (!inside(row) || !accept(row) || !matches(row)) continue;
      // Do not merge legitimate repeat actions without a stable event ID.
      const key = row.event_id;
      if (key && seen.has(String(key))) continue;
      if (key) seen.add(String(key));
      total++;
    }
    return total;
  };
  let searchAppearances = null, searches = null;
  if (sources.queries?.status === 'ok') {
    searchAppearances = 0; searches = 0;
    for (const row of rows.queries || []) {
      if (!inside(row)) continue;
      searches++;
      if (Array.isArray(row.deliveredProducts) && row.deliveredProducts.some(matches)) searchAppearances++;
    }
  }
  let reportedOrders = null;
  if (sources.checkout_events?.status === 'ok') {
    const orders = new Set();
    for (const row of rows.checkout_events || []) {
      if (!inside(row) || row.event_type !== 'checkout_completed' || !row.order_id) continue;
      if (Array.isArray(row.products) && row.products.some(matches)) orders.add(String(row.order_id));
    }
    reportedOrders = orders.size;
  }
  return {
    ...window, searches, searchAppearances,
    clicks: countEvents('product_clicks'),
    carts: countEvents('cart', row => !row.event_type || row.event_type === 'add_to_cart'),
    reportedOrders,
  };
}

async function readSources(db, from, to) {
  const available = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  const rows = {}, sources = {};
  await Promise.all(sourceNames.map(async name => {
    if (!available.has(name)) { sources[name] = { status: 'missing' }; return; }
    try {
      // Older commerce events use ISO strings; search/click events use BSON dates.
      const filter = { $or: [
        { timestamp: { $gte: new Date(from), $lt: new Date(to) } },
        { timestamp: { $gte: from, $lt: to } },
      ] };
      const projection = { timestamp: 1, created_at: 1, event_type: 1, event_id: 1, order_id: 1,
        product_id: 1, productId: 1, product_name: 1, products: 1, deliveredProducts: 1,
        session_id: 1, sessionId: 1, preview: 1, internal: 1 };
      const data = await db.collection(name).find(filter, { projection, maxTimeMS: 15000 }).limit(LIMIT + 1).toArray();
      sources[name] = { status: data.length > LIMIT ? 'truncated' : 'ok' };
      rows[name] = data.slice(0, LIMIT);
    } catch { sources[name] = { status: 'unavailable' }; }
  }));
  return { rows, sources };
}

export async function getProductPromotionCampaigns(client, dbName, { now = new Date() } = {}) {
  const db = client.db('control_plane');
  const proposals = await db.collection('proposals').find({ dbName, kind: 'productBoost', status: 'approved' }, {
    projection: { boostChange: 1, createdAt: 1, reviewedAt: 1, appliedCount: 1 },
  }).sort({ createdAt: -1 }).toArray();
  if (!proposals.length) return [];
  const audits = await db.collection('catalog_change_audits').find({ dbName, kind: 'productBoost', proposalId: { $in: proposals.map(p => String(p._id)) } }, {
    projection: { proposalId: 1, appliedAt: 1 },
  }).toArray();
  const applied = new Map(audits.map(a => [a.proposalId, a.appliedAt]));
  const tenant = client.db(dbName);
  const ids = [...new Set(proposals.flatMap(p => p.boostChange?.products || []).map(p => String(p._id)))].filter(ObjectId.isValid).map(id => new ObjectId(id));
  const products = ids.length ? await tenant.collection('products').find({ _id: { $in: ids } }, {
    projection: { id: 1, name: 1, boost: 1, hidden: 1, stockStatus: 1, stock_status: 1 },
  }).toArray() : [];
  const current = new Map(products.map(p => [String(p._id), p]));
  const windows = proposals.map(p => promotionWindows(applied.get(String(p._id)), now)).filter(Boolean);
  let data = { rows: {}, sources: {} };
  if (windows.length) {
    const from = windows.map(w => w.before.from).sort()[0];
    try { data = await readSources(tenant, from, new Date(now).toISOString()); }
    catch { /* Keep campaigns visible when tracking cannot be read. */ }
  }
  return proposals.map(p => {
    const change = p.boostChange || {}, appliedAt = applied.get(String(p._id));
    const cohort = (change.products || []).map(saved => ({ ...saved, ...current.get(String(saved._id)) }));
    const atLevel = cohort.filter(product => current.has(String(product._id)) && Number(product.boost) === change.level);
    const window = promotionWindows(appliedAt, now);
    return {
      _id: `productBoost-${p._id}`, source: 'productBoost', title: `קידום מוצרים: ${change.term}`,
      // A reset and a superseded promotion must not be advertised as live.
      status: change.level > 0 && atLevel.length ? 'applied' : 'stopped',
      queries: [], description: `קידום ברמה ${change.level} למוצרים שנכללו באישור הלקוח.`, createdAt: p.createdAt,
      appliedAt: appliedAt || null, productCount: cohort.length, currentCount: atLevel.length,
      availableCount: atLevel.filter(product => !product.hidden && (product.stockStatus ?? product.stock_status) === 'instock').length,
      products: cohort.map(product => ({ name: product.name, current: current.has(String(product._id)) && Number(product.boost) === change.level })),
      measurement: window ? {
        mode: 'productActivity', generatedAt: new Date(now).toISOString(), sources: data.sources,
        before: summarizePromotion(data.rows, cohort, window.before, data.sources),
        after: summarizePromotion(data.rows, cohort, window.after, data.sources),
      } : null,
    };
  });
}
