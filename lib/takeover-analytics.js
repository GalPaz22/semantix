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

export function summarizeTakeover({ exposures, queries, clicks, carts, checkouts = [] }, { from, to, cohortFrom = from, complete = true }) {
  const start = +new Date(from), end = +new Date(to), cohortStart = +new Date(cohortFrom);
  const inside = row => at(row) >= start && at(row) < end;
  const cohortRows = rows => rows.filter(row => at(row) >= cohortStart && at(row) < end);
  const visitors = new Map();
  for (const row of cohortRows(exposures)) {
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
  const make = () => ({ exposed: new Set(), searchers: new Set(), clickers: new Set(), carters: new Set(), searches: 0, clicks: 0, carts: 0, firstSearch: new Map(), elapsed: [], queryRows: 0, taggedQueries: 0, searchesWithId: 0 });
  const arms = { semantix: make(), native: make() }, queryMap = new Map(), daily = new Map();
  const activity = timestamp => { const key = day(timestamp); if (!daily.has(key)) daily.set(key, { day: key, semantixSearches: 0, nativeSearches: 0, semantixCarts: 0, nativeCarts: 0 }); return daily.get(key); };
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
    arm.firstSearch.set(key, Math.min(arm.firstSearch.get(key) ?? Infinity, at(row)));
    activity(row.timestamp)[`${visitor.arm}Searches`]++;
    const query = normalize(row.query);
    if (!query) continue;
    if (!queryMap.has(query)) queryMap.set(query, { query, semantix: 0, native: 0 });
    queryMap.get(query)[visitor.arm]++;
  }
  for (const [rows, kind] of [[clicks, 'click'], [carts, 'cart']]) for (const row of rows.filter(inside)) {
    const key = id(row), visitor = stable.get(key);
    if (!visitor || at(row) < visitor.first) continue;
    if (kind === 'cart' && group(row) !== visitor.arm) continue;
    const arm = arms[visitor.arm];
    if (at(row) < (arm.firstSearch.get(key) ?? Infinity)) continue;
    if (kind === 'click') { arm.clicks++; arm.clickers.add(key); }
    else { arm.carts++; arm.carters.add(key); activity(row.timestamp)[`${visitor.arm}Carts`]++; }
  }
  const result = {};
  for (const name of GROUPS) {
    const a = arms[name];
    result[name] = { exposedVisitors: a.exposed.size, searches: a.searches, searchers: a.searchers.size,
      clicksAfterSearch: a.clicks, clickersAfterSearch: a.clickers.size, cartEventsAfterSearch: a.carts, cartersAfterSearch: a.carters.size,
      clickRate: complete ? ratio(a.clickers.size, a.searchers.size) : null, cartRate: complete ? ratio(a.carters.size, a.searchers.size) : null,
      queryTagCoverage: ratio(a.taggedQueries, a.queryRows), searchIdCoverage: ratio(a.searchesWithId, a.queryRows),
      medianElapsedMs: percentile(a.elapsed, .5), p95ElapsedMs: percentile(a.elapsed, .95), latencySamples: a.elapsed.length,
      purchases: null, revenue: null };
  }
  const exposed = result.semantix.exposedVisitors + result.native.exposedVisitors;
  return { groups: result,
    observedSplit: { semantix: ratio(result.semantix.exposedVisitors, exposed), native: ratio(result.native.exposedVisitors, exposed), visitors: exposed },
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
    topQueries: [...queryMap.values()].sort((a, b) => b.semantix + b.native - a.semantix - a.native).slice(0, 20),
    measurement: { status: complete ? 'collecting' : 'incomplete', complete, exposureEvents, includedExposureEvents,
      exposureCoverage: ratio(includedExposureEvents, exposureEvents), conflictingVisitors, unattributedSearches, purchaseTracking: false,
      note: complete ? 'תוצאות ראשוניות המבוססות על פעילות שניתן לשייך בעקביות. עדיין אין מסקנה על יתרון של אחת הקבוצות.' : 'חלק מהנתונים טרם הושלמו. שיעורי הביצועים יוצגו לאחר השלמת העדכון.' } };
}

export async function readTakeoverAnalytics(client, dbName, { days = 7, now = new Date(), useCache = true } = {}) {
  if (dbName !== 'steimatzky') throw Object.assign(new Error('הניסוי אינו זמין בחנות זו'), { status: 404 });
  if (![1, 3, 7, 14].includes(Number(days))) throw Object.assign(new Error('טווח תאריכים לא תקין'), { status: 400 });
  const cacheKey = `${dbName}:${days}`;
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
    const requestedFrom = +now - Number(days) * 86400000;
    const changed = configs.map(c => c.test.updatedAt || c.updatedAt).filter(validDate).map(v => +new Date(v));
    // Compare the current edition and current allocation only; never mix a rollout change into a claimed lift.
    const from = new Date(Math.max(requestedFrom, validDate(head?.publishedAt) ? +new Date(head.publishedAt) : requestedFrom, ...changed));
    const to = new Date(now);
    const cohortFrom = new Date(Math.max(+from - 7 * 86400000, changed.length ? Math.max(...changed) : +from));
    if (+from >= +to) throw Object.assign(new Error('הניסוי עודכן כעת. הנתונים יהיו זמינים לאחר תחילת המדידה.'), { status: 503 });
    const existing = new Set(collections.map(c => c.name));
    const dateFilter = { $or: [{ timestamp: { $gte: cohortFrom, $lt: to } }, { timestamp: { $gte: cohortFrom.toISOString(), $lt: to.toISOString() } }] };
    const projection = { _id: 0, timestamp: 1, event_type: 1, session_id: 1, sessionId: 1, ab_tests: 1, search_id: 1, query: 1, elapsedMs: 1 };
    const sources = {};
    async function read(name, extra = {}) {
      if (!existing.has(name)) { sources[name] = { available: false, truncated: false, rows: 0 }; return []; }
      const rows = await db.collection(name).find({ $and: [dateFilter, extra] }, { projection, maxTimeMS: 20000 }).sort({ timestamp: -1 }).limit(MAX_ROWS + 1).toArray();
      sources[name] = { available: true, truncated: rows.length > MAX_ROWS, rows: Math.min(rows.length, MAX_ROWS) };
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
      read('tracking_events', { event_type: 'ab_exposure' }), read('queries'), read('cart', { event_type: 'add_to_cart' }), read('product_clicks'), readCheckoutEvidence(),
    ]);
    const complete = Object.values(sources).every(s => s.available && !s.truncated);
    const summary = summarizeTakeover({ exposures, checkouts, queries, carts, clicks }, { from, to, cohortFrom, complete });
    return { experiment: { key: TEST, label: 'ניסוי החיפוש החכם', active: test.enabled !== false,
      configuredSplit: Object.fromEntries(GROUPS.map(g => [g, test.variants.find(v => v.id === g).weight / totalWeight])),
      revision: head?.revision || null, configurationUpdatedAt: configs[0].test.updatedAt || configs[0].updatedAt || null },
      window: { from: from.toISOString(), to: to.toISOString(), cohortFrom: cohortFrom.toISOString(), requestedDays: Number(days), timeZone: 'Asia/Jerusalem' },
      generatedAt: to.toISOString(), ...summary };
  };
  const promise = load();
  if (useCache) { if (cache.size >= 12) cache.delete(cache.keys().next().value); cache.set(cacheKey, { createdAt: Date.now(), promise }); }
  try { return await promise; } catch (error) { if (cache.get(cacheKey)?.promise === promise) cache.delete(cacheKey); throw error; }
}
