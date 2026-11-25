import test from 'node:test';
import assert from 'node:assert/strict';
import { getSearchRecoverySnapshot } from '../lib/dashboard-search-recovery.js';

test('the audited Shipi amount is store scoped and preserves its fixed observation period', () => {
  const snapshot = getSearchRecoverySnapshot('shipi');
  assert.equal(snapshot.amount, 4134);
  assert.equal(snapshot.currency, 'ILS');
  assert.equal(snapshot.orders, 30);
  assert.equal(snapshot.queryCount, 35);
  assert.equal(snapshot.window.observedUntil, '2026-11-25T08:09:26.000Z');
  assert.equal(snapshot.incrementalRevenue, null);
  for (const store of ['rikushet', 'steimatzky', 'manoVino', '', null, undefined]) assert.equal(getSearchRecoverySnapshot(store), null);
});

test('one response cannot mutate the audited amount or period returned to another request', () => {
  const changed = getSearchRecoverySnapshot('shipi');
  changed.amount = 0;
  changed.window.from = '2030-01-01';
  const original = getSearchRecoverySnapshot('shipi');
  assert.equal(original.amount, 4134);
  assert.equal(original.window.from, '2026-11-16T06:31:31.000Z');
});

test('Yasha visibility value separates missing products from lower-ranked native products', () => {
  const snapshot = getSearchRecoverySnapshot('yashas-wood');
  assert.equal(snapshot.amount, 642);
  assert.equal(snapshot.breakdown.missingProduct + snapshot.breakdown.belowFirstPage, snapshot.amount);
  assert.equal(snapshot.evidence.reduce((sum, item) => sum + item.amount, 0), snapshot.amount);
  assert.equal(snapshot.evidence.filter(item => item.nativeRank === null).reduce((sum, item) => sum + item.amount, 0), snapshot.breakdown.missingProduct);
  assert(snapshot.evidence.filter(item => item.nativeRank !== null).every(item => item.nativeRank > 24));
  assert(snapshot.evidence.every(item => item.semantixRank <= 24));
  assert.equal(snapshot.nativeCheck.zeroResultQueries, 0);
  assert.notEqual(snapshot.comparison, 'current-native-html-zero-results');
  assert.equal(snapshot.incrementalRevenue, null);
});

test('Yasha snapshot changes cannot affect another store or future responses', () => {
  const changed = getSearchRecoverySnapshot('yashas-wood');
  changed.evidence[0].amount = 0;
  changed.breakdown.missingProduct = 0;
  assert.equal(getSearchRecoverySnapshot('yashas-wood').breakdown.missingProduct, 38);
  assert.equal(getSearchRecoverySnapshot('yashas-wood').evidence[0].amount, 38);
  assert.equal(getSearchRecoverySnapshot('shipi').amount, 4134);
  assert.equal(getSearchRecoverySnapshot('other'), null);
});
