import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateMerchandiseCents, compareProductMoney } from '../lib/search-product-money.js';
const order = (prices, total, currency = 'ILS') => ({ currency, total_price: total, items: prices.map(price => ({ price, quantity: 1 })) });
const groups = (ours, native, a = 100, b = 200) => ({ semantix: { searches: a, value: ours === null ? null : [{ currency: 'ILS', amount: ours }] }, native: { searches: b, value: native === null ? null : [{ currency: 'ILS', amount: native }] } });
test('reported merchandise is capped proportionally at the order total; higher totals never add credit', () => {
  assert.deepEqual(allocateMerchandiseCents(order([40, 60], 50)), [2000, 3000]);
  assert.deepEqual(allocateMerchandiseCents(order([40, 60], 120)), [4000, 6000]);
  assert.deepEqual(allocateMerchandiseCents(order([0, 100], 90)), [0, 9000]);
});
test('penny allocation conserves the discounted order amount across searches and lanes', () => {
  const values = allocateMerchandiseCents(order([1, 1, 1], 1)); assert.deepEqual(values, [34, 33, 33]); assert.equal(values.reduce((a, b) => a + b, 0), 100);
});
test('unknown prices, quantities, totals and currencies are unavailable, never coerced to zero', () => {
  for (const value of [null, '', ' ', {}, NaN, -1]) assert.equal(allocateMerchandiseCents(order([value, 10], 10)), null);
  assert.equal(allocateMerchandiseCents(order([10], null)), null); assert.equal(allocateMerchandiseCents(order([10], 10, '')), null);
  const o = order([10], 10); o.items[0].quantity = .5; assert.equal(allocateMerchandiseCents(o), null);
});
test('financial difference compares equal search volume instead of raw totals', () => {
  const r = compareProductMoney(groups(100, 100), ['ILS'], true).rows[0];
  assert.equal(r.rawDifference, 0); assert.equal(r.semantix.per100Searches, 100); assert.equal(r.native.per100Searches, 50);
  assert.equal(r.expectedNativeAtSemantixVolume, 50); assert.equal(r.normalizedDifference, 50); assert.equal(r.relativeLift, 1);
});
test('negative differences remain negative and a zero baseline never yields infinite lift', () => {
  const r = compareProductMoney(groups(10, 100), ['ILS'], true).rows[0]; assert.equal(r.normalizedDifference, -40); assert.equal(r.relativeLift, -.8);
  const zero = compareProductMoney(groups(10, 0), ['ILS'], true).rows[0]; assert.equal(zero.normalizedDifference, 10); assert.equal(zero.relativeLift, null);
});
test('missing monetary evidence, empty denominators and incomplete sources suppress the difference', () => {
  for (const [g, complete] of [[groups(null, 100), true], [groups(100, 100, 0, 10), true], [groups(100, 100), false]]) assert.equal(compareProductMoney(g, ['ILS'], complete).rows[0].normalizedDifference, null);
});
test('currencies stay separate with no conversion or mixed sum', () => {
  const g = groups(100, 50, 100, 100); g.semantix.value.push({ currency: 'USD', amount: 10 }); g.native.value.push({ currency: 'USD', amount: 20 });
  const r = compareProductMoney(g, ['ILS', 'USD'], true); assert.equal(r.rows[0].normalizedDifference, 50); assert.equal(r.rows[1].normalizedDifference, -10); assert.equal(r.incrementalRevenueStatus, 'not-established');
});
