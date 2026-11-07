const ARMS = ['semantix', 'native'];
const fraction = (n, d) => d ? n / d : null;
const amount = value => (typeof value === 'number' || (typeof value === 'string' && value.trim())) && Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value) * 100) : null;

// Credit matched merchandise only. Allocate an order-level discount proportionally;
// shipping or a higher order total never increases the credited product value.
export function matchedMerchandiseCents(order, matchedItems, financiallyConsistent = true) {
  if (!financiallyConsistent || String(order.currency || '').trim().toUpperCase() !== 'ILS') return null;
  const total = amount(order.total_price);
  if (total === null || !Array.isArray(order.items) || !order.items.length || !matchedItems.length) return null;
  const value = item => {
    const unit = amount(item.price), quantity = Number(item.quantity);
    return unit !== null && Number.isSafeInteger(quantity) && quantity > 0 ? unit * quantity : null;
  };
  const all = order.items.map(value), selected = matchedItems.map(value);
  if (all.some(v => v === null) || selected.some(v => v === null)) return null;
  const subtotal = all.reduce((s, v) => s + v, 0), matched = selected.reduce((s, v) => s + v, 0);
  if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(matched) || matched > subtotal) return null;
  return subtotal ? Math.round(matched * Math.min(1, total / subtotal)) : 0;
}

function clusterStats(rows) {
  const clusters = new Map();
  for (const row of rows) {
    const c = clusters.get(row.browser) || { n: 0, y: 0 };
    c.n++; c.y += Number(row.carted); clusters.set(row.browser, c);
  }
  const n = rows.length, y = rows.filter(r => r.carted).length, rate = fraction(y, n), count = clusters.size;
  return { n, y, rate, browsers: count, variance: count > 1 ? count / (count - 1) * [...clusters.values()].reduce((v, c) => v + (c.y - rate * c.n) ** 2, 0) / (n * n) : null };
}

// The public result contains aggregates only; raw search/browser/order IDs never leave this helper.
export function summarizeSearchConversion({ searches, chains, linkedOrders, start, end, complete, ordersComplete }) {
  const from = Math.max(start, end - 24 * 3600000), cutoff = Math.max(from, end - 2 * 3600000);
  const rows = new Map(); let autocompleteExcluded = 0, immatureExcluded = 0, ambiguousExcluded = 0, regularSearchesSinceStart = 0;
  for (const search of searches.values()) {
    if (search.time >= start && search.time < end && !search.ambiguous && !search.typed && search.row.searchMode !== 'typed') regularSearchesSinceStart++;
  }
  for (const [key, search] of searches) {
    if (search.time < from || search.time >= end) continue;
    if (search.ambiguous) { ambiguousExcluded++; continue; }
    if (search.typed || search.row.searchMode === 'typed') { autocompleteExcluded++; continue; }
    if (search.time > cutoff) { immatureExcluded++; continue; }
    rows.set(key, { browser: JSON.parse(key)[0], arm: search.arm, carted: false, ordered: false, productOrdered: false, knownCents: 0, knownOrderCents: 0, valuedOrders: 0, missingValueOrders: 0 });
  }
  for (const [key, chain] of chains) {
    const row = rows.get(JSON.stringify(JSON.parse(key).slice(0, 2)));
    if (row && chain.arm === row.arm && chain.added) row.carted = true;
  }
  for (const fact of linkedOrders) {
    const row = rows.get(fact.searchKey);
    if (!row || row.arm !== fact.arm) continue;
    row.ordered = true;
    if (!fact.matchedItems.length) continue;
    row.productOrdered = true;
    const cents = matchedMerchandiseCents(fact.row, fact.matchedItems, fact.financiallyConsistent);
    if (cents === null) row.missingValueOrders++;
    else { row.knownCents += cents; row.knownOrderCents += amount(fact.row.total_price); row.valuedOrders++; }
  }
  const groups = {}, stats = {}, finances = {};
  for (const arm of ARMS) {
    const rs = [...rows.values()].filter(row => row.arm === arm), s = clusterStats(rs);
    stats[arm] = s;
    groups[arm] = { searches: s.n, cartedSearches: s.y, searchCartRate: complete ? s.rate : null,
      orderingSearches: ordersComplete ? rs.filter(r => r.ordered).length : null,
      productOrderedSearches: ordersComplete ? rs.filter(r => r.productOrdered).length : null };
    finances[arm] = { matchedProductValue: ordersComplete ? rs.reduce((v, row) => v + row.knownCents, 0) / 100 : null,
      valuedOrders: ordersComplete ? rs.reduce((v, row) => v + row.valuedOrders, 0) : null,
      missingValueOrders: ordersComplete ? rs.reduce((v, row) => v + row.missingValueOrders, 0) : null };
  }
  const a = stats.semantix, b = stats.native, delta = a.rate !== null && b.rate !== null ? a.rate - b.rate : null;
  const enough = [a, b].every(s => s.browsers >= 30 && s.y >= 5 && s.n - s.y >= 5);
  const se = enough ? Math.sqrt(a.variance + b.variance) : null;
  const interval = se !== null ? [delta - 1.96 * se, delta + 1.96 * se] : null;
  const baselineCarted = [...rows.values()].filter(row => row.arm === 'native' && row.carted);
  const purchasedBaseline = baselineCarted.filter(row => row.productOrdered);
  const knownBaseline = purchasedBaseline.filter(row => row.valuedOrders > 0 && !row.missingValueOrders);
  const modelAvailable = complete && ordersComplete && delta !== null && b.y > 0 && purchasedBaseline.length >= 5 && knownBaseline.length === purchasedBaseline.length;
  const baselineValue = knownBaseline.reduce((v, row) => v + row.knownCents, 0) / 100;
  const valuePerCartedSearch = modelAvailable ? baselineValue / b.y : null;
  const extraCarts = complete && delta !== null ? a.n * delta : null;
  const volumeDays = (end - start) / 86400000;
  const monthlySearches = volumeDays >= 1 ? regularSearchesSinceStart / volumeDays * 30 : null;
  const baselineOrderValue = knownBaseline.reduce((v, row) => v + row.knownOrderCents, 0) / 100;
  const monthlyAvailable = modelAvailable && monthlySearches !== null;
  const monthlyExtraCarts = monthlyAvailable ? monthlySearches * delta : null;
  const monthlyProductEstimate = monthlyAvailable ? monthlyExtraCarts * valuePerCartedSearch : null;
  const monthlyOrderEstimate = monthlyAvailable ? monthlyExtraCarts * baselineOrderValue / b.y : null;
  return {
    complete, window: { from: new Date(from).toISOString(), to: new Date(cutoff).toISOString(), observedUntil: new Date(end).toISOString(), minimumFollowUpHours: 2 },
    groups, exclusions: { autocomplete: autocompleteExcluded, immature: immatureExcluded, ambiguous: ambiguousExcluded },
    comparison: { differencePP: complete && delta !== null ? 100 * delta : null, relativeLift: complete && b.rate ? a.rate / b.rate - 1 : null,
      interval95PP: complete && interval ? interval.map(v => v * 100) : null, extraCartedSearches: extraCarts, inference: 'descriptive-browser-clustered; attribution symmetry and causality not established' },
    financialImpact: { currency: 'ILS', observed: finances, incrementalRevenueStatus: 'not-established',
      monthlyProjection: { status: monthlyAvailable ? 'available' : 'insufficient-data', days: 30,
        volume: { from: new Date(start).toISOString(), to: new Date(end).toISOString(), observedDays: volumeDays, regularSearches: regularSearchesSinceStart, projectedSearches: monthlySearches, basis: 'all eligible regular searches in both experiment arms; average since measurement start' },
        extraCartedSearches: monthlyExtraCarts,
        matchedProductValueEstimate: monthlyProductEstimate,
        fullOrderValueEstimate: monthlyOrderEstimate,
        fullOrderValueInterval95: monthlyAvailable && interval ? interval.map(v => monthlySearches * v * baselineOrderValue / b.y) : null,
        baselineOrderValuePerPurchasedSearch: modelAvailable ? baselineOrderValue / purchasedBaseline.length : null,
        baselineCartToProductOrderRate: modelAvailable ? purchasedBaseline.length / b.y : null,
        assumption: '30-day projection over measured search traffic in both arms. Requires the observed cart uplift to persist and be causal, representative search volume, native purchase realization, and entire additional baskets to be incremental. Full order value includes products not proven to originate from search; it is a scenario, not measured incremental revenue.' },
      model: { status: modelAvailable ? 'available' : 'insufficient-data', estimate: modelAvailable ? extraCarts * valuePerCartedSearch : null,
        interval95: modelAvailable && interval ? interval.map(v => v * a.n * valuePerCartedSearch) : null,
        baselineCartedSearches: b.y, baselineCartedProductOrderedSearches: purchasedBaseline.length,
        baselineCartToProductOrderRate: modelAvailable ? purchasedBaseline.length / b.y : null,
        baselineValuePerPurchasedSearch: modelAvailable ? baselineValue / purchasedBaseline.length : null,
        scope: 'current Semantix search volume; same analysis window; no full-traffic or monthly extrapolation',
        assumption: 'If the observed cart-rate difference is causal and extra carted searches realize the native matched-product value per carted search.' } },
  };
}
