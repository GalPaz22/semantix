import { TAKEOVER_MEASUREMENT_START, TAKEOVER_MEASUREMENT_ID } from './takeover-measurement.js';

const TEST = 'semantix_takeover';
const GROUPS = ['semantix', 'native'];
const MAX_ROWS = 200000;
const cache = new Map();
const id = row => String(row.session_id || row.sessionId || '');
const at = row => new Date(row.timestamp).getTime();
const group = row => row.ab_tests?.[TEST];
const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const validDate = value => Number.isFinite(new Date(value).getTime());
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' });
const day = value => dayFormatter.format(new Date(value));
const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] : null;
const ratio = (x, n) => n ? x / n : null;
const identifier = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : typeof value?.toHexString === 'function' ? value.toHexString() : '';
const searchKey = row => JSON.stringify([id(row), identifier(row.search_id)]);
const skuFromPath = value => {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value, 'https://www.steimatzky.co.il');
    if (!['steimatzky.co.il', 'www.steimatzky.co.il'].includes(url.hostname)) return '';
    const sku = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    return /^\d{9}$/.test(sku) ? sku : '';
  } catch { return ''; }
};
function productAliases(products) {
  const aliases = new Map();
  for (const product of products) {
    const sku = identifier(product.sku || product.siteCard?.sku), catalogId = identifier(product.id);
    const canonical = sku ? `sku:${sku}` : catalogId;
    if (!canonical) continue;
    for (const alias of [catalogId, sku, sku && `sku:${sku}`, identifier(product.siteCard?.productId)].filter(Boolean)) {
      if (!aliases.has(alias)) aliases.set(alias, canonical);
      else if (aliases.get(alias) !== canonical) aliases.set(alias, null);
    }
  }
  return aliases;
}
function productIdentity(row, aliases) {
  const raw = identifier(row.product_id);
  if (!raw) return '';
  const pathSku = skuFromPath(row.card_path || row.product_url), pathKey = `sku:${pathSku}`;
  const fromId = aliases.get(raw), fromPath = pathSku && aliases.get(pathKey);
  if ((aliases.has(raw) && !fromId) || (aliases.has(pathKey) && !fromPath)) return '';
  if (fromId && fromPath && fromId !== fromPath) return '';
  // A stored product-page SKU is accepted only when the catalog resolves it.
  // Names and arbitrary URL equality are never product identity evidence.
  return fromId || fromPath || raw;
}
const recordedAt = row => row.received_at && validDate(row.received_at) ? +new Date(row.received_at) : at(row);
const sameVisit = (a, b) => !a.visit_id || !b.visit_id || a.visit_id === b.visit_id;
const searchOrigin = row => row.search_link === 'results_page' || row.search_link === 'autocomplete' || row.search_link === 'typed_results'
  || (!row.search_link && ['inject', 'zero-results'].includes(row.source));

// Count product opportunities, not shoppers: one browser × search ID × product ID.
// No query-text, product-name, arbitrary URL equality or "latest search" fallback is used.
function productFunnel({ queries, clicks, carts, products }, stable, { start, end, complete }) {
  const aliases = productAliases(products);
  const productNames = new Map();
  for (const product of products) {
    const key = productIdentity({ product_id: product.id || product.sku }, aliases);
    const name = [product.name, product.title, product.ItemName, product.siteCard?.name].find(value => typeof value === 'string' && value.trim());
    if (key && name) productNames.set(key, name.trim());
  }
  const productKey = row => JSON.stringify([id(row), identifier(row.search_id), productIdentity(row, aliases)]);
  const searches = new Map(), chains = new Map(), productTotals = new Map();
  const make = () => ({ clickedProducts: 0, addedProducts: 0, clickEvents: 0, linkedClickEvents: 0, cartEvents: 0, linkedCartEvents: 0,
    excludedClicks: {}, excludedCarts: {} });
  const groups = { semantix: make(), native: make() };
  const eligible = row => { const visitor = stable.get(id(row)), time = recordedAt(row);
    return visitor && time >= start && time < end && time >= visitor.first ? visitor : null; };
  for (const row of queries) {
    const visitor = eligible(row);
    if (!visitor || !identifier(row.search_id)) continue;
    const key = searchKey(row), previous = searches.get(key);
    if (!previous) searches.set(key, { row, arm: visitor.arm, time: at(row), ambiguous: false });
    else {
      previous.ambiguous ||= normalize(previous.row.query) !== normalize(row.query) || !sameVisit(previous.row, row);
      if (at(row) < previous.time) { previous.time = at(row); previous.row = row; }
    }
  }
  const exclude = (arm, kind, reason) => { const counts = groups[arm][kind]; counts[reason] = (counts[reason] || 0) + 1; };
  const product = row => { const key = productIdentity(row, aliases);
    if (!productTotals.has(key)) productTotals.set(key, { productId: key, productName: productNames.get(key) || null, semantix: { clicked: 0, added: 0 }, native: { clicked: 0, added: 0 } });
    return productTotals.get(key); };
  const seenClicks = new Set(), seenCarts = new Set();
  for (const row of clicks) {
    const visitor = eligible(row);
    if (!visitor || (row.interaction_type && row.interaction_type !== 'click')) continue;
    const dedup = row.event_id || row._id?.toString();
    if (dedup && seenClicks.has(String(dedup))) continue;
    if (dedup) seenClicks.add(String(dedup));
    const arm = groups[visitor.arm]; arm.clickEvents++;
    if (!identifier(row.search_id) || !productIdentity(row, aliases)) { exclude(visitor.arm, 'excludedClicks', 'missingIds'); continue; }
    if (!searchOrigin(row)) { exclude(visitor.arm, 'excludedClicks', 'unconfirmedSearchOrigin'); continue; }
    const search = searches.get(searchKey(row));
    if (!search || search.ambiguous || search.arm !== visitor.arm || !sameVisit(search.row, row) || (recordedAt(row) < search.time && !(row.search_link === 'typed_results' && search.row.searchMode === 'typed' && search.time - recordedAt(row) <= 60000))) {
      exclude(visitor.arm, 'excludedClicks', 'noMatchingSearch'); continue;
    }
    arm.linkedClickEvents++;
    const key = productKey(row);
    let chain = chains.get(key);
    if (!chain) {
      chain = { arm: visitor.arm, search: search.row, clicks: [], added: false };
      chains.set(key, chain); arm.clickedProducts++; product(row)[visitor.arm].clicked++;
    }
    chain.clicks.push(row);
  }
  for (const row of carts) {
    if (row.event_type !== 'add_to_cart_confirmed') continue;
    const visitor = eligible(row); if (!visitor) continue;
    const dedup = row.event_id || row._id?.toString();
    if (dedup && seenCarts.has(String(dedup))) continue;
    if (dedup) seenCarts.add(String(dedup));
    const arm = groups[visitor.arm]; arm.cartEvents++;
    if (!identifier(row.search_id) || !productIdentity(row, aliases)) { exclude(visitor.arm, 'excludedCarts', 'missingIds'); continue; }
    if (row.search_link === 'none') { exclude(visitor.arm, 'excludedCarts', 'unconfirmedSearchOrigin'); continue; }
    const chain = chains.get(productKey(row));
    const clickId = identifier(row.click_id);
    const matched = chain?.arm === visitor.arm && sameVisit(chain.search, row) && chain.clicks.some(click => sameVisit(click, row)
      && recordedAt(click) <= recordedAt(row)
      && (!row.click_id || (clickId && [identifier(click.event_id), click._id?.toString()].includes(clickId))));
    if (!matched) { exclude(visitor.arm, 'excludedCarts', 'noMatchingClick'); continue; }
    arm.linkedCartEvents++;
    if (!chain.added) { chain.added = true; arm.addedProducts++; product(row)[visitor.arm].added++; }
  }
  for (const arm of Object.values(groups)) {
    arm.productCartRate = complete ? ratio(arm.addedProducts, arm.clickedProducts) : null;
    arm.clickLinkCoverage = ratio(arm.linkedClickEvents, arm.clickEvents);
    arm.cartLinkCoverage = ratio(arm.linkedCartEvents, arm.cartEvents);
  }
  return { groups, topProducts: [...productTotals.values()].sort((a, b) => (b.semantix.clicked + b.native.clicked) - (a.semantix.clicked + a.native.clicked) || a.productId.localeCompare(b.productId)).slice(0, 30) };
}

export function summarizeTakeover({ exposures, queries, clicks, carts, products = [], checkouts = [] }, { from, to, cohortFrom = from, complete = true }) {
  const start = +new Date(from), end = +new Date(to), cohortStart = +new Date(cohortFrom);
  const inside = row => at(row) >= start && at(row) < end;
  const cohortRows = rows => rows.filter(row => recordedAt(row) >= cohortStart && recordedAt(row) < end);
  const visitors = new Map();
  // A newly tagged search can assign a returning browser without reading any pre-reset exposure.
  for (const row of cohortRows([...exposures, ...queries.filter(row => GROUPS.includes(group(row)))])) {
    const key = id(row); if (!key) continue;
    let visitor = visitors.get(key);
    if (!visitor) visitors.set(key, visitor = { first: at(row), groups: new Set() });
    visitor.first = Math.min(visitor.first, at(row));
    visitor.groups.add(group(row) || 'unknown');
  }
  // Exclude the whole browser ID when recorded evidence disagrees about its variant.
  for (const row of cohortRows([...queries, ...clicks, ...carts, ...checkouts])) {
    if (group(row) && visitors.has(id(row))) visitors.get(id(row)).groups.add(group(row));
  }
  const stable = new Map(); let conflictingVisitors = 0;
  for (const [key, visitor] of visitors) {
    if (visitor.groups.size !== 1) { conflictingVisitors++; continue; }
    const arm = [...visitor.groups][0];
    if (GROUPS.includes(arm)) stable.set(key, { ...visitor, arm });
  }
  const make = () => ({ exposed: new Set(), searchers: new Set(), searches: 0, elapsed: [], queryRows: 0, taggedQueries: 0, searchesWithId: 0 });
  const arms = { semantix: make(), native: make() }, queryMap = new Map(), daily = new Map();
  const activity = timestamp => { const key = day(timestamp); if (!daily.has(key)) daily.set(key, { day: key, semantixSearches: 0, nativeSearches: 0 }); return daily.get(key); };
  let exposureEvents = 0, includedExposureEvents = 0, unattributedSearches = 0;
  for (const row of exposures.filter(inside)) {
    exposureEvents++;
    const visitor = stable.get(id(row));
    if (visitor && group(row) === visitor.arm) { arms[visitor.arm].exposed.add(id(row)); includedExposureEvents++; }
  }
  for (const row of queries.filter(inside)) {
    const key = id(row), visitor = stable.get(key);
    if (!visitor || at(row) < visitor.first) { unattributedSearches++; continue; }
    const arm = arms[visitor.arm];
    arm.searches++; arm.searchers.add(key); arm.queryRows++;
    if (group(row) === visitor.arm) arm.taggedQueries++;
    if (row.search_id) arm.searchesWithId++;
    if (Number.isFinite(row.elapsedMs)) arm.elapsed.push(row.elapsedMs);
    activity(row.timestamp)[`${visitor.arm}Searches`]++;
    const query = normalize(row.query);
    if (!query) continue;
    if (!queryMap.has(query)) queryMap.set(query, { query, semantix: 0, native: 0 });
    queryMap.get(query)[visitor.arm]++;
  }
  const funnel = productFunnel({ queries, clicks, carts, products }, stable, { start, end, complete });
  const result = {};
  for (const name of GROUPS) {
    const a = arms[name];
    result[name] = { exposedVisitors: a.exposed.size, searches: a.searches, searchers: a.searchers.size,
      ...funnel.groups[name],
      queryTagCoverage: ratio(a.taggedQueries, a.queryRows), searchIdCoverage: ratio(a.searchesWithId, a.queryRows),
      medianElapsedMs: percentile(a.elapsed, .5), p95ElapsedMs: percentile(a.elapsed, .95), latencySamples: a.elapsed.length,
      purchases: null, revenue: null };
  }
  const exposed = result.semantix.exposedVisitors + result.native.exposedVisitors;
  return { groups: result,
    observedSplit: { semantix: ratio(result.semantix.exposedVisitors, exposed), native: ratio(result.native.exposedVisitors, exposed), visitors: exposed },
    topProducts: funnel.topProducts,
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
    topQueries: [...queryMap.values()].sort((a, b) => b.semantix + b.native - a.semantix - a.native).slice(0, 20),
    measurement: { status: complete ? 'collecting' : 'incomplete', productAttribution: 'confirmed-search-product-v2', complete, exposureEvents, includedExposureEvents,
      exposureCoverage: ratio(includedExposureEvents, exposureEvents), conflictingVisitors, unattributedSearches, purchaseTracking: false,
      note: complete ? 'תוצאות ראשוניות המבוססות על פעילות שניתן לשייך בעקביות. עדיין אין מסקנה על יתרון של אחת הקבוצות.' : 'חלק מהנתונים טרם הושלמו. שיעורי הביצועים יוצגו לאחר השלמת העדכון.' } };
}

export async function readTakeoverAnalytics(client, dbName, { now = new Date(), useCache = true, ...rangeOptions } = {}) {
  if (dbName !== 'steimatzky') throw Object.assign(new Error('הניסוי אינו זמין בחנות זו'), { status: 404 });
  if (Object.keys(rangeOptions).length) throw Object.assign(new Error('תקופת המדידה קבועה; אין אפשרות לבחור נתונים היסטוריים'), { status: 400 });
  const cacheKey = `${dbName}:${TAKEOVER_MEASUREMENT_ID}`;
  const cached = cache.get(cacheKey);
  if (useCache && cached && Date.now() - cached.createdAt < 60000) return cached.promise;
  const load = async () => {
    const db = client.db(dbName);
    const [accounts, head, collections] = await Promise.all([
      client.db('users').collection('users').find({ dbName }, { projection: { _id: 0, 'credentials.siteConfig.abTests': 1, 'credentials.siteConfigUpdatedAt': 1 }, maxTimeMS: 5000 }).limit(30).toArray(),
      db.collection('semantix_module').findOne({ _id: 'steimatzky:head' }, { projection: { _id: 0, revision: 1, digest: 1, publishedAt: 1 }, maxTimeMS: 5000 }),
      db.listCollections({}, { nameOnly: true }).toArray(),
    ]);
    const configs = accounts.map(a => ({ test: a.credentials?.siteConfig?.abTests?.[TEST], updatedAt: a.credentials?.siteConfigUpdatedAt })).filter(a => a.test);
    if (!configs.length) throw Object.assign(new Error('הגדרת הניסוי אינה זמינה כרגע'), { status: 503 });
    const configSignature = value => JSON.stringify({ enabled: value.enabled !== false, sticky: value.sticky !== false, variants: value.variants?.map(v => ({ id: v.id, weight: v.weight })), pins: value.pins || {} });
    if (configs.some(c => configSignature(c.test) !== configSignature(configs[0].test))) throw Object.assign(new Error('הגדרת חלוקת התנועה נמצאת בעדכון. נסו לרענן בהמשך.'), { status: 503 });
    const { test } = configs[0];
    const totalWeight = (test.variants || []).reduce((sum, v) => sum + Math.max(0, Number(v.weight) || 0), 0);
    if (!totalWeight || !GROUPS.every(g => test.variants?.some(v => v.id === g))) throw Object.assign(new Error('חלוקת התנועה אינה זמינה כרגע'), { status: 503 });
    const from = new Date(TAKEOVER_MEASUREMENT_START);
    const to = new Date(now);
    const cohortFrom = from;
    if (+from >= +to) throw Object.assign(new Error('הניסוי עודכן כעת. הנתונים יהיו זמינים לאחר תחילת המדידה.'), { status: 503 });
    const existing = new Set(collections.map(c => c.name));
    const timeFilter = field => ({ $or: [{ [field]: { $gte: cohortFrom, $lt: to } }, { [field]: { $gte: cohortFrom.toISOString(), $lt: to.toISOString() } }] });
    const dateFilter = timeFilter('timestamp');
    const projection = { card_path: 1, product_url: 1, searchMode: 1, _id: 1, timestamp: 1, received_at: 1, event_type: 1, event_id: 1, interaction_type: 1, session_id: 1, sessionId: 1, visit_id: 1, ab_tests: 1, search_id: 1, product_id: 1, click_id: 1, search_link: 1, source: 1, query: 1, elapsedMs: 1 };
    const sources = {};
    async function read(name, extra = {}, sourceKey = name) {
      if (!existing.has(name)) { sources[sourceKey] = { available: false, truncated: false, rows: 0 }; return []; }
      const eventWindow = name === 'product_clicks' ? { $or: [timeFilter('received_at'), { $and: [{ received_at: { $exists: false } }, dateFilter] }] } : dateFilter;
      const rows = await db.collection(name).find({ $and: [eventWindow, extra] }, { projection, maxTimeMS: 20000 }).sort({ timestamp: -1 }).limit(MAX_ROWS + 1).toArray();
      sources[sourceKey] = { available: true, truncated: rows.length > MAX_ROWS, rows: Math.min(rows.length, MAX_ROWS) };
      return rows.slice(0, MAX_ROWS);
    }
    // Bounded reads; no index creation, writes or calls to the search endpoint.
    async function readCheckoutEvidence() {
      if (!existing.has('tracking_events')) return [];
      // Only the existence of a contradictory tag matters here, not every intercepted request.
      const rows = await db.collection('tracking_events').aggregate([
        { $match: { $and: [dateFilter, { event_type: 'checkout', [`ab_tests.${TEST}`]: { $exists: true } }] } },
        { $project: { key: { $ifNull: ['$session_id', '$sessionId'] }, arm: `$ab_tests.${TEST}`, timestamp: 1 } },
        { $group: { _id: { key: '$key', arm: '$arm' }, timestamp: { $min: '$timestamp' } } },
        { $limit: MAX_ROWS + 1 },
      ], { maxTimeMS: 20000 }).toArray();
      sources.checkoutEvidence = { available: true, truncated: rows.length > MAX_ROWS, rows: Math.min(rows.length, MAX_ROWS) };
      return rows.slice(0, MAX_ROWS).map(r => ({ session_id: r._id.key, timestamp: r.timestamp, ab_tests: { [TEST]: r._id.arm } }));
    }
    const [exposures, queries, carts, clicks, checkouts] = await Promise.all([
      read('tracking_events', { event_type: 'ab_exposure' }, 'exposures'), read('queries'), read('tracking_events', { event_type: 'add_to_cart_confirmed' }, 'confirmedCarts'), read('product_clicks'), readCheckoutEvidence(),
    ]);
    const productIds = [...new Set([...clicks, ...carts].map(r => identifier(r.product_id)).filter(Boolean))];
    const skus = [...new Set([...clicks, ...carts].flatMap(r => [skuFromPath(r.card_path || r.product_url), /^\d{9}$/.test(identifier(r.product_id)) ? identifier(r.product_id) : '']).filter(Boolean))];
    let products = [];
    const identityLimit = 5000;
    sources.productIdentity = { available: existing.has('products'), truncated: productIds.length > identityLimit || skus.length > identityLimit, rows: 0 };
    if (existing.has('products') && (productIds.length || skus.length)) {
      const ids = productIds.slice(0, identityLimit);
      const idsWithNumbers = [...ids, ...ids.filter(v => /^\d+$/.test(v)).map(Number).filter(Number.isSafeInteger)];
      products = await db.collection('products').find({ $or: [{ id: { $in: ids } }, { sku: { $in: skus.slice(0, identityLimit) } }, { 'siteCard.productId': { $in: idsWithNumbers } }] },
        { projection: { _id: 0, id: 1, sku: 1, name: 1, title: 1, ItemName: 1, 'siteCard.name': 1, 'siteCard.sku': 1, 'siteCard.productId': 1 }, maxTimeMS: 15000 }).limit(identityLimit + 1).toArray();
      sources.productIdentity.truncated ||= products.length > identityLimit;
      sources.productIdentity.rows = Math.min(products.length, identityLimit);
      products = products.slice(0, identityLimit);
    }
    const complete = Object.values(sources).every(s => s.available && !s.truncated);
    const summary = summarizeTakeover({ exposures, checkouts, queries, carts, clicks, products }, { from, to, cohortFrom, complete });
    return { experiment: { key: TEST, label: 'ניסוי החיפוש החכם', active: test.enabled !== false,
      configuredSplit: Object.fromEntries(GROUPS.map(g => [g, test.variants.find(v => v.id === g).weight / totalWeight])),
      revision: head?.revision || null, configurationUpdatedAt: configs[0].test.updatedAt || configs[0].updatedAt || null },
      window: { from: from.toISOString(), to: to.toISOString(), cohortFrom: cohortFrom.toISOString(), measurementId: TAKEOVER_MEASUREMENT_ID, locked: true, timeZone: 'Asia/Jerusalem' },
      generatedAt: to.toISOString(), ...summary, measurement: { ...summary.measurement, cartSource: 'tracking_events:add_to_cart_confirmed', startedAt: from.toISOString(), historicalAccess: false } };
  };
  const promise = load();
  if (useCache) { if (cache.size >= 12) cache.delete(cache.keys().next().value); cache.set(cacheKey, { createdAt: Date.now(), promise }); }
  try { return await promise; } catch (error) { if (cache.get(cacheKey)?.promise === promise) cache.delete(cacheKey); throw error; }
}
