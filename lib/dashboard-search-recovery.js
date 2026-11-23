// Audited aggregates from the Shipi report, observed through 23 November 2026.
// This is a fixed report, independent of the overview's rolling date selector.
// No order/customer identifiers or claims of incremental revenue are included.
const shipi = {
  version: 'shipi-native-zero-purchases-2026-11-23',
  dbName: 'shipi',
  amount: 3480,
  currency: 'ILS',
  orders: 26,
  queryCount: 31,
  matchedOrderLines: 34,
  generatedAt: '2026-11-23T10:21:20.316Z',
  window: {
    from: '2026-11-16T06:31:31.000Z',
    cohortThrough: '2026-11-22T10:21:20.316Z',
    observedUntil: '2026-11-23T10:21:20.316Z',
    followUpHours: 24,
  },
  nativeCheck: { date: '2026-11-23', checkedQueries: 98, zeroResultQueries: 31 },
  attribution: 'same-session-query-injected-click-delivered-product-paid-order-line',
  comparison: 'current-native-html-zero-results',
  incrementalRevenue: null,
};

// Call only with the store identity resolved by the authenticated server route.
export function getSearchRecoverySnapshot(dbName) {
  return dbName === 'shipi' ? structuredClone(shipi) : null;
}
