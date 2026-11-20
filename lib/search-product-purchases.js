import { allocateMerchandiseCents, compareProductMoney } from './search-product-money.js';
const DAY = 86400000;
const ARMS = ['semantix', 'native'];
const text = v => typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
const browser = r => text(r.session_id || r.sessionId);
const arm = r => r.ab_tests?.semantix_takeover;
const time = r => +new Date(r.received_at || r.created_at || r.timestamp);
const queryText = v => text(v).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
const contextKey = r => JSON.stringify([browser(r), text(r.visit_id), text(r.search_id)]);
const number = v => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
const ratio = (n, d) => d ? n / d : null;
const isBot = r => /bot\b|bot\/|crawl|spider|lighthouse|headless|facebookexternalhit|bingpreview|ahrefs|semrush/i.test(String(r.user_agent || ''));
const money = n => Math.round(n * 100) / 100;

// The purchase is credited through its merchandise, never through its last search_id or a preceding search alone.
// Raw identifiers remain inside this calculation. The result contains only aggregates and product names/SKUs.
export function summarizePurchasedSearches({ queries = [], clicks = [], carts = [], orders = [] }, {
  from, to, resolveProduct, pins = {}, complete = true, ordersAvailable = true,
}) {
  const start = +new Date(from), end = +new Date(to), cutoff = end - DAY;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || typeof resolveProduct !== 'function') throw Error('Invalid product measurement scope');
  const excludedBrowsers = new Set([...Object.keys(pins), ...[...clicks, ...carts, ...orders].filter(isBot).map(browser)]);
  const eligible = r => browser(r) && !excludedBrowsers.has(browser(r)) && !isBot(r) && time(r) >= start && time(r) < end;
  const diagnostics = { missingSearchContext: 0, ambiguousSearchContexts: 0, fallbackSearchRows: 0, duplicateClicks: 0, duplicateOrders: 0, conflictingOrders: 0,
    clickClaims: 0, unresolvedClickProducts: 0, rejectedClicks: 0, rejectedAdds: 0, recordedOrders: 0, ordersWithItemsAndVisit: 0 };
  const searches = new Map(); let queryRows = 0, identifiedRows = 0;
  for (const r of queries.filter(eligible)) {
    if (!ARMS.includes(arm(r))) { diagnostics.fallbackSearchRows++; continue; }
    queryRows++;
    if (!r.search_id || !r.visit_id || !queryText(r.query)) { diagnostics.missingSearchContext++; continue; }
    identifiedRows++;
    const key = contextKey(r), previous = searches.get(key);
    if (!previous) searches.set(key, { key, browser: browser(r), visit: r.visit_id, id: r.search_id, query: queryText(r.query), at: time(r), arm: arm(r), typed: r.searchMode === 'typed', fullAt: r.searchMode === 'typed' ? Infinity : time(r), typedAt: r.searchMode === 'typed' ? time(r) : Infinity, ambiguous: false });
    // A later typed-pick log may reuse an actual search id. It must not erase the real search from the denominator.
    else { previous.ambiguous ||= previous.arm !== arm(r) || previous.query !== queryText(r.query); previous.at = Math.min(previous.at, time(r)); previous.typed &&= r.searchMode === 'typed'; if (r.searchMode === 'typed') previous.typedAt = Math.min(previous.typedAt, time(r)); else previous.fullAt = Math.min(previous.fullAt, time(r)); }
  }
  for (const s of searches.values()) s.at = s.typed ? s.typedAt : s.fullAt;
  diagnostics.ambiguousSearchContexts = [...searches.values()].filter(s => s.ambiguous).length;
  const linkedSearch = r => {
    const base = searches.get(contextKey(r));
    const typedAction = r.search_link === 'typed_results' || r.search_link === 'autocomplete' || base?.typed;
    const s = base && { ...base, at: typedAction ? Math.min(base.typedAt, base.fullAt) : base.fullAt };
    return s && !s.ambiguous && s.arm === arm(r) && s.at <= time(r) + 60000
      && (!r.search_query || queryText(r.search_query) === s.query) ? s : null;
  };
  const evidence = [], clickById = new Map(), seenClicks = new Set();
  for (const r of [...clicks].sort((a, b) => time(a) - time(b)).filter(eligible)) {
    const id = text(r.event_id || r._id);
    if (id && seenClicks.has(id)) { diagnostics.duplicateClicks++; continue; }
    if (id) seenClicks.add(id);
    if (!['results_page', 'typed_results', 'autocomplete'].includes(r.search_link)) continue;
    diagnostics.clickClaims++;
    const s = linkedSearch(r), product = resolveProduct(r);
    if (!product) diagnostics.unresolvedClickProducts++;
    if (!s || !product) { diagnostics.rejectedClicks++; continue; }
    const lane = r.search_link === 'autocomplete' ? 'autocomplete' : r.search_link === 'typed_results' || s.typed ? 'typed' : 'results';
    const e = { row: r, search: s, product, lane, at: time(r), confirmed: false };
    evidence.push(e); if (id) clickById.set(id, e);
  }
  const seenAdds = new Set();
  for (const r of carts.filter(eligible)) {
    if (r.event_type !== 'add_to_cart_confirmed') continue;
    const id = text(r.event_id || r._id); if (id && seenAdds.has(id)) continue; if (id) seenAdds.add(id);
    const product = resolveProduct(r), click = r.search_link === 'clicked_result' ? clickById.get(text(r.click_id)) : null;
    const s = click ? click.search.key === contextKey(r) && click.search.arm === arm(r) ? click.search : null : linkedSearch(r); let lane;
    if (!product || !s) { if (r.search_link && r.search_link !== 'none') diagnostics.rejectedAdds++; continue; }
    if (r.search_link === 'clicked_result') {
      if (!click || click.search.key !== s.key || click.product !== product || click.at > time(r)) { diagnostics.rejectedAdds++; continue; }
      lane = click.lane;
    } else if (r.search_link === 'results_page' || r.search_link === 'typed_results') lane = r.search_link === 'typed_results' || s.typed ? 'typed' : 'results';
    else continue;
    evidence.push({ row: r, search: s, product, lane, at: time(r), confirmed: true });
  }
  const byBrowser = new Map();
  for (const e of evidence) { const rows = byBrowser.get(e.search.browser) || []; rows.push(e); byBrowser.set(e.search.browser, rows); }
  const orderRows = new Map();
  for (const o of orders.filter(eligible)) {
    if (o.event_type !== 'checkout_completed' || !o.order_id) continue;
    const id = text(o.order_id), rows = orderRows.get(id) || []; rows.push(o); orderRows.set(id, rows);
  }
  const lines = [];
  for (const [id, rows] of orderRows) {
    diagnostics.duplicateOrders += rows.length - 1;
    if (rows.some(o => /cancel|refund|void|unpaid|pending|failed/i.test(String(o.financial_status || o.status || '')))) continue;
    const signature = o => JSON.stringify([browser(o), o.visit_id, arm(o), o.currency, o.total_price, (o.items || []).map(i => [i.id, i.quantity, i.price]).sort()]);
    if (new Set(rows.map(signature)).size !== 1) { diagnostics.conflictingOrders++; continue; }
    const o = rows.sort((a, b) => time(a) - time(b))[0]; diagnostics.recordedOrders++;
    if (o.visit_id && Array.isArray(o.items) && o.items.length) diagnostics.ordersWithItemsAndVisit++;
    if (!o.visit_id || !ARMS.includes(arm(o))) continue;
    const touches = (byBrowser.get(browser(o)) || []).filter(e => e.search.visit === o.visit_id && e.search.arm === arm(o) && e.at <= time(o) && time(o) - e.search.at <= DAY);
    const allocation = allocateMerchandiseCents(o);
    for (const [index, item] of (Array.isArray(o.items) ? o.items : []).entries()) {
      if (number(item.quantity) !== null && number(item.quantity) <= 0) continue;
      const product = resolveProduct({ product_id: item.id, product_role: 'order_item' });
      if (!product) continue;
      const candidates = touches.filter(e => e.product === product).sort((a, b) => b.at - a.at || Number(b.confirmed) - Number(a.confirmed));
      const e = candidates[0]; if (!e) continue;
      const quantity = number(item.quantity);
      lines.push({ order: id, search: e.search, lane: e.lane, product, name: item.name || null, quantity,
        value: allocation === null ? null : allocation[index] / 100,
        currency: /^[A-Z]{3}$/.test(o.currency || '') ? o.currency : null,
        confirmed: candidates.some(c => c.search.key === e.search.key && c.confirmed) });
    }
  }
  const coverage = { searchContexts: ratio(identifiedRows, queryRows), productIdentity: diagnostics.clickClaims ? 1 - diagnostics.unresolvedClickProducts / diagnostics.clickClaims : null,
    orderItemsAndVisit: ratio(diagnostics.ordersWithItemsAndVisit, diagnostics.recordedOrders) };
  const measurable = complete && ordersAvailable && coverage.searchContexts >= .7 && coverage.orderItemsAndVisit >= .7
    && (coverage.productIdentity === null || coverage.productIdentity >= .7);
  const contexts = [...searches.values()].filter(s => !s.ambiguous && ARMS.includes(s.arm));
  function summary(name, lane = 'results', mature = true, query = null) {
    const qs = contexts.filter(s => s.arm === name && (!mature || (lane === 'results' ? s.at : Math.min(s.typedAt, s.fullAt)) <= cutoff) && (lane !== 'results' || !s.typed) && (!query || s.query === query));
    const keys = new Set(qs.map(s => s.key));
    const ls = lines.filter(l => l.search.arm === name && (!mature || l.search.at <= cutoff) && (lane === 'all' || l.lane === lane) && keys.has(l.search.key));
    const es = evidence.filter(e => keys.has(e.search.key) && (!mature || e.search.at <= cutoff) && (lane === 'all' || e.lane === lane));
    const values = new Map(); let unknownValues = 0;
    for (const l of ls) {
      if (l.value === null || !l.currency) { unknownValues++; continue; }
      const value = values.get(l.currency) || 0; values.set(l.currency, value + l.value);
    }
    const converted = new Set(ls.map(l => l.search.key)), orders = new Set(ls.map(l => l.order));
    return { searches: qs.length, browsers: new Set(qs.map(s => s.browser)).size, visits: new Set(qs.map(s => s.visit)).size,
      clickedSearches: new Set(es.filter(e => !e.confirmed).map(e => e.search.key)).size, cartedSearches: new Set(es.filter(e => e.confirmed).map(e => e.search.key)).size,
      purchasedSearches: measurable ? converted.size : null, orders: measurable ? orders.size : null, confirmedCartOrders: measurable ? new Set(ls.filter(l => l.confirmed).map(l => l.order)).size : null,
      purchaseRate: lane === 'results' && measurable ? ratio(converted.size, qs.length) : null, matchedOrderLines: measurable ? ls.length : null,
      value: unknownValues || !measurable ? null : [...values].map(([currency, amount]) => ({ currency, amount: money(amount) })), unknownValueLines: unknownValues,
      products: [...new Set(ls.map(l => l.name).filter(Boolean))].slice(0, 5) };
  }
  const groups = Object.fromEntries(ARMS.map(name => [name, summary(name)]));
  const typed = Object.fromEntries(ARMS.map(name => [name, { ...summary(name, 'typed'), searches: null }]));
  const totals = Object.fromEntries(ARMS.map(name => [name, summary(name, 'all')]));
  const recent = Object.fromEntries(ARMS.map(name => [name, { pendingSearches: contexts.filter(s => s.arm === name && !s.typed && s.at > cutoff).length }]));
  const queriesOut = [...new Set(contexts.filter(s => !s.typed && s.at <= cutoff).map(s => s.query))].map(query => ({ query, ...Object.fromEntries(ARMS.map(name => [name, summary(name, 'results', true, query)])) }))
    .sort((a, b) => b.semantix.searches + b.native.searches - a.semantix.searches - a.native.searches);
  const a = groups.semantix.purchaseRate, b = groups.native.purchaseRate;
  const financialComparison = compareProductMoney(groups, lines.filter(l => l.lane === 'results' && l.search.at <= cutoff).map(l => l.currency).filter(Boolean), measurable);
  const selectedQueries = [...new Map([...queriesOut.slice(0, 40), ...queriesOut.filter(q => q.semantix.purchasedSearches + q.native.purchasedSearches > 0).slice(0, 40)].map(q => [q.query, q])).values()];
  return { version: 'exact-product-same-visit-24h-v1', complete: measurable,
    window: { from: new Date(start).toISOString(), to: new Date(Math.max(start, cutoff)).toISOString(), observedUntil: new Date(end).toISOString(), followUpHours: 24 },
    groups, typed, totals, recent, queries: selectedQueries, distinctQueries: queriesOut.length, financialComparison,
    comparison: { relativeLift: a !== null && b > 0 ? a / b - 1 : null, differencePP: a !== null && b !== null ? (a - b) * 100 : null,
      convertedSearches: measurable ? groups.semantix.purchasedSearches + groups.native.purchasedSearches : null, interpretation: 'descriptive-not-causal' },
    coverage, diagnostics,
    method: 'Exact SKU verified by catalog or by a same-store product path matching a recorded order SKU; explicit search → product click or confirmed add → matching item in a completed order, same browser, visit and arm, within 24h. Last eligible touch per purchased item. Order search_id is not attribution evidence. Typed picks have no exposure denominator; no rate or revenue projection is computed for them.',
  };
}
