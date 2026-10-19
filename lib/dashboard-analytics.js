// Counts remain useful when session attribution is incomplete; rates need coverage.
export function analyticsMeasurement(report) {
  const c = report?.funnel?.coverage || {};
  const sources = report?.sources || {};
  const available = name => sources[name]?.status === 'ok';
  const complete = name => available(name) && !sources[name].truncated;
  const sessionCoverage = c.queries ? c.queriesWithSession / c.queries : null;
  const searchRates = complete('queries') && sessionCoverage >= 0.7;
  const purchaseCoverage = c.purchases ? c.purchasesWithSession / c.purchases : null;
  const purchaseRates = searchRates && complete('checkout_events') && c.purchaseTracking === true
    && purchaseCoverage >= 0.7
    && !(c.purchases >= 20 && c.purchaseSessionsSeenBefore != null && c.purchaseSessionsSeenBefore < 0.3);
  return {
    searchCounts: available('queries'),
    resultCounts: available('queries') && c.queriesWithResultCount > 0,
    sessionCoverage,
    resultCoverage: c.queries ? c.queriesWithResultCount / c.queries : null,
    clickRates: searchRates && complete('product_clicks'),
    cartRates: searchRates && complete('cart'),
    checkoutRates: searchRates && complete('checkout_events') && c.checkoutTracking === true,
    purchaseRates,
    revenue: available('checkout_events') && c.purchaseTracking === true,
  };
}

// The overview highlights a rate only after enough identified shoppers reached that stage.
// Prefer checkout; otherwise cart. Raw counts and measurement quality remain in the detail view.
export function headlineConversion(report) {
  const measured = analyticsMeasurement(report);
  const funnel = report?.funnel;
  if (!funnel || funnel.sessions.searched < 100) return null;
  const candidates = [
    { stage: 'checkout', label: 'המרה לצ׳קאאוט מחיפוש', reliable: measured.checkoutRates, count: funnel.sessions.checkout, rate: funnel.rates.checkout, action: 'התחילו צ׳קאאוט' },
    { stage: 'cart', label: 'המרה לעגלה מחיפוש', reliable: measured.cartRates, count: funnel.sessions.carted, rate: funnel.rates.cart, action: 'הוסיפו מוצר לעגלה' },
  ];
  return candidates.find(candidate => candidate.reliable && candidate.count >= 10 && Number.isFinite(candidate.rate) && candidate.rate > 0) || null;
}
