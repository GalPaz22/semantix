import test from 'node:test';
import assert from 'node:assert/strict';
import { getSearchRecoverySnapshot } from '../lib/dashboard-search-recovery.js';

test('the audited Shipi amount is store scoped and preserves its fixed observation period', () => {
  const snapshot = getSearchRecoverySnapshot('shipi');
  assert.equal(snapshot.amount, 3480);
  assert.equal(snapshot.currency, 'ILS');
  assert.equal(snapshot.orders, 26);
  assert.equal(snapshot.queryCount, 31);
  assert.equal(snapshot.window.observedUntil, '2026-11-23T10:21:20.316Z');
  assert.equal(snapshot.incrementalRevenue, null);
  for (const store of ['rikushet', 'steimatzky', 'manoVino', '', null, undefined]) assert.equal(getSearchRecoverySnapshot(store), null);
});

test('one response cannot mutate the audited amount or period returned to another request', () => {
  const changed = getSearchRecoverySnapshot('shipi');
  changed.amount = 0;
  changed.window.from = '2030-01-01';
  const original = getSearchRecoverySnapshot('shipi');
  assert.equal(original.amount, 3480);
  assert.equal(original.window.from, '2026-11-16T06:31:31.000Z');
});
