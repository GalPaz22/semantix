// Audited aggregates from the Shipi report, observed through 25 November 2026.
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

// Call only with the store identity resolved by the authenticated server route.
export function getSearchRecoverySnapshot(dbName) {
  return dbName === 'shipi' ? structuredClone(shipi) : null;
}
