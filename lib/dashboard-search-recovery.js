// Audited store-specific aggregates, observed through 25 November 2026.
// This is a fixed report, independent of the overview's rolling date selector.
// No order/customer identifiers or claims of incremental revenue are included.
const shipi = {
  version: 'shipi-native-zero-purchases-2026-11-25',
  dbName: 'shipi',
  amount: 4134,
  currency: 'ILS',
  orders: 30,
  queryCount: 35,
  matchedOrderLines: 38,
  generatedAt: '2026-11-25T08:09:26.000Z',
  window: {
    from: '2026-11-16T06:31:31.000Z',
    cohortThrough: '2026-11-24T08:09:26.000Z',
    observedUntil: '2026-11-25T08:09:26.000Z',
    followUpHours: 24,
  },
  nativeCheck: { date: '2026-11-25', checkedQueries: 137, zeroResultQueries: 35 },
  attribution: 'same-session-query-injected-click-delivered-product-paid-order-line',
  comparison: 'current-native-html-zero-results',
  incrementalRevenue: null,
};

const yasha = {
  version: 'yasha-native-product-discovery-2026-11-25',
  dbName: 'yashas-wood',
  amount: 642,
  currency: 'ILS',
  orders: 3,
  queryCount: 3,
  matchedOrderLines: 3,
  generatedAt: '2026-11-25T10:18:29.000Z',
  window: {
    from: '2026-11-18T10:18:29.000Z',
    cohortThrough: '2026-11-24T10:18:29.000Z',
    observedUntil: '2026-11-25T10:18:29.000Z',
    followUpHours: 24,
  },
  nativeCheck: { date: '2026-11-25', checkedAt: '2026-11-25T10:29:06.031Z', checkedQueries: 12, zeroResultQueries: 0 },
  breakdown: { missingProduct: 38, belowFirstPage: 604 },
  evidence: [
    { query: 'מונסטר', product: 'מאנסטר טראק', amount: 38, nativeRank: null, semantixRank: 3 },
    { query: 'מוט', product: 'מראת עמידה עגולה', amount: 512, nativeRank: 60, semantixRank: 7 },
    { query: 'אוטו', product: 'סט כלי רכב עירוניים', amount: 92, nativeRank: 38, semantixRank: 7 },
  ],
  attribution: 'same-session-explicit-search-visit-injected-click-server-cart-paid-order-line',
  comparison: 'current-native-purchased-product-visibility',
  incrementalRevenue: null,
};

// Call only with the store identity resolved by the authenticated server route.
export function getSearchRecoverySnapshot(dbName) {
  const snapshot = dbName === 'shipi' ? shipi : dbName === 'yashas-wood' ? yasha : null;
  return snapshot ? structuredClone(snapshot) : null;
}
