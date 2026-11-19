import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePurchasedSearches } from '../lib/search-product-purchases.js';
const DAY = 86400000, start = Date.parse('2026-11-16T12:00:00Z'), date = minutes => new Date(start + minutes * 60000).toISOString();
const resolveProduct = r => ({ entityA: 'sku:a', A: 'sku:a', entityB: 'sku:b', B: 'sku:b' }[r.product_id] || '');
const options = { from: new Date(start), to: new Date(start + 2 * DAY), resolveProduct };
function fixture() {
  const base = { session_id: 'browser', visit_id: 'visit', search_id: 'search', ab_tests: { semantix_takeover: 'semantix' } };
  return { queries: [{ ...base, query: 'תרמי', timestamp: date(0) }],
    clicks: [{ ...base, event_id: 'click', search_query: 'תרמי', search_link: 'results_page', product_id: 'entityA', timestamp: date(1) }],
    carts: [{ ...base, event_id: 'add', event_type: 'add_to_cart_confirmed', click_id: 'click', search_link: 'clicked_result', product_id: 'entityA', timestamp: date(2) }],
    orders: [{ ...base, event_type: 'checkout_completed', order_id: 'order', currency: 'ILS', total_price: 119, items: [{ id: 'A', name: 'חולצה', quantity: 2, price: 10 }, { id: 'B', name: 'מוצר אחר', quantity: 1, price: 99 }], timestamp: date(3) }] };
}
const run = data => summarizePurchasedSearches(data, options);
test('one search leads to the same catalog SKU, with only matching merchandise credited', () => {
  const p = run(fixture()), a = p.groups.semantix;
  assert.equal(p.complete, true); assert.equal(a.searches, 1); assert.equal(a.purchasedSearches, 1); assert.equal(a.confirmedCartOrders, 1); assert.equal(a.purchaseRate, 1);
  assert.deepEqual(a.value, [{ currency: 'ILS', amount: 20 }]); assert.deepEqual(a.products, ['חולצה']);
});
test('only the matched share of a discounted basket is credited to the search', () => {
  const d = fixture(); d.orders[0].total_price = 59.5; assert.deepEqual(run(d).groups.semantix.value, [{ currency: 'ILS', amount: 10 }]);
});
test('search then purchase of another product is not search-product conversion', () => { const d = fixture(); d.orders[0].items.shift(); assert.equal(run(d).groups.semantix.purchasedSearches, 0); });
test('the order last-search field cannot redirect product credit', () => {
  const d = fixture(); d.queries.push({ ...d.queries[0], search_id: 'unrelated', query: 'תיק', timestamp: date(2.5) }); d.orders[0].search_id = 'unrelated';
  const p = run(d); assert.equal(p.groups.semantix.purchasedSearches, 1); assert.equal(p.queries.find(q => q.query === 'תרמי').semantix.purchasedSearches, 1); assert.equal(p.queries.find(q => q.query === 'תיק').semantix.purchasedSearches, 0);
});
test('same browser in another visit or another arm is not a match', () => {
  for (const field of ['visit_id', 'session_id', 'ab_tests']) { const d = fixture(); d.orders[0][field] = field === 'ab_tests' ? { semantix_takeover: 'native' } : 'other'; assert.equal(run(d).groups.semantix.purchasedSearches, 0); }
});
test('duplicate query logs, clicks and orders count once', () => {
  const d = fixture(); d.queries.push({ ...d.queries[0] }); d.clicks.push({ ...d.clicks[0] }); d.orders.push({ ...d.orders[0] });
  const p = run(d); assert.equal(p.groups.semantix.searches, 1); assert.equal(p.groups.semantix.orders, 1); assert.deepEqual(p.groups.semantix.value, [{ currency: 'ILS', amount: 20 }]); assert.equal(p.diagnostics.duplicateClicks, 1);
});
test('conflicting order retries do not credit either identity', () => { const d = fixture(); d.orders.push({ ...d.orders[0], session_id: 'other' }); const p = run(d); assert.equal(p.groups.semantix.orders, null); assert.equal(p.diagnostics.conflictingOrders, 1); assert.equal(p.groups.semantix.purchaseRate, null); });
test('typed picks are separate, without an exposure denominator or purchase rate', () => {
  const d = fixture(); d.queries[0].searchMode = 'typed'; d.clicks[0].search_link = 'typed_results';
  const p = run(d); assert.equal(p.groups.semantix.searches, 0); assert.equal(p.groups.semantix.purchasedSearches, 0); assert.equal(p.typed.semantix.orders, 1); assert.equal(p.typed.semantix.searches, null); assert.equal(p.typed.semantix.purchaseRate, null); assert.equal(p.totals.semantix.orders, 1);
  assert.deepEqual(p.financialComparison.rows, []);
});
test('a typed-pick log cannot erase an actual full search with the same context', () => {
  const d = fixture(); d.queries.push({ ...d.queries[0], searchMode: 'typed', timestamp: date(.5) }); const p = run(d);
  assert.equal(p.groups.semantix.searches, 1); assert.equal(p.groups.semantix.purchasedSearches, 1); assert.equal(p.typed.semantix.orders, 0);
});
test('a later actual search cannot borrow the time or product action of an earlier typed pick', () => {
  const d = fixture(); d.queries[0].searchMode = 'typed'; d.queries.push({ ...d.queries[0], searchMode: 'text', timestamp: date(120) });
  const p = run(d); assert.equal(p.groups.semantix.purchasedSearches, 0);
  d.clicks[0].search_link = 'typed_results'; const q = summarizePurchasedSearches(d, { ...options, to: new Date(start + DAY + 30 * 60000) });
  assert.equal(q.groups.semantix.searches, 0); assert.equal(q.typed.semantix.orders, 1); assert.equal(q.recent.semantix.pendingSearches, 1);
});
test('every search needs 24h follow-up and an order within its own 24h window', () => {
  const d = fixture(), p = summarizePurchasedSearches(d, { ...options, to: new Date(start + 3600000) }); assert.equal(p.groups.semantix.searches, 0); assert.equal(p.recent.semantix.pendingSearches, 1);
  assert.deepEqual(p.financialComparison.rows, []);
  d.orders[0].timestamp = date(1500); assert.equal(run(d).groups.semantix.orders, 0);
});
test('missing identities, missing order items, unresolved products and incomplete reads are unknown, not zero rates', () => {
  for (const type of ['search', 'order', 'product', 'source']) { const d = fixture(); let opts = options;
    if (type === 'search') delete d.queries[0].visit_id;
    if (type === 'order') d.orders[0].items = [];
    if (type === 'product') d.clicks[0].product_id = 'unresolved';
    if (type === 'source') opts = { ...options, complete: false };
    const p = summarizePurchasedSearches(d, opts); assert.equal(p.groups.semantix.purchaseRate, null, type); assert.equal(p.groups.semantix.purchasedSearches, null, type);
  }
});
test('an action after an order and a cancelled order never count', () => {
  const d = fixture(); d.clicks[0].timestamp = date(5); d.carts[0].timestamp = date(6); assert.equal(run(d).groups.semantix.orders, 0);
  const cancelled = fixture(); cancelled.orders.push({ ...cancelled.orders[0], status: 'cancelled' }); assert.equal(run(cancelled).groups.semantix.orders, null);
});
test('confirmed direct cart from results is valid product evidence without inventing a click', () => {
  const d = fixture(); d.clicks = []; delete d.carts[0].click_id; d.carts[0].search_link = 'results_page';
  const a = run(d).groups.semantix; assert.equal(a.orders, 1); assert.equal(a.confirmedCartOrders, 1); assert.equal(a.clickedSearches, 0);
});
test('pinned browsers are excluded and raw identities never leave the report', () => {
  assert.equal(summarizePurchasedSearches(fixture(), { ...options, pins: { browser: 'semantix' } }).groups.semantix.searches, 0);
  const forbidden = new Set(['session_id', 'visit_id', 'search_id', 'order_id', 'event_id', 'click_id']);
  const walk = o => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { assert.ok(!forbidden.has(k)); walk(v); } }; walk(run(fixture()));
});
test('missing price remains unknown and low-frequency converting queries stay inspectable', () => {
  const d = fixture(); d.orders[0].items[0].price = null; for (let i = 0; i < 80; i++) for (let j = 0; j < 2; j++) d.queries.push({ ...d.queries[0], search_id: `popular-${i}-${j}`, query: `אחר ${i}` });
  const p = run(d); assert.equal(p.groups.semantix.value, null); assert.equal(p.groups.semantix.unknownValueLines, 1); assert.ok(p.queries.some(q => q.query === 'תרמי'));
});
