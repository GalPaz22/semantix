import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTakeover } from '../lib/takeover-analytics.js';

const at = minute => `2026-11-02T11:${String(minute).padStart(2, '0')}:00.000Z`;
const row = (minute, fields = {}) => ({ session_id: 'browser-s', visit_id: 'visit-s', search_id: 'search-s', timestamp: at(minute), ab_tests: { semantix_takeover: 'semantix' }, ...fields });
const order = (minute = 20, fields = {}) => row(minute, { event_type: 'checkout_completed', source: 'order-page', order_id: 'order-1', items: [{ id: '000000123', quantity: 3 }], ...fields });
const data = () => ({ exposures: [row(0)], queries: [row(11, { query: 'A book' })], clicks: [row(12, { product_id: '42', event_id: 'click-1', interaction_type: 'click', search_link: 'results_page' })], carts: [], products: [{ id: 'catalog-1', sku: '000000123', siteCard: { productId: '42' } }] });
const options = { from: at(10), cohortFrom: at(0), to: at(50), ordersAvailable: true };
const summarize = (orders, extra = {}, settings = {}) => summarizeTakeover({ ...data(), ...extra, orders }, { ...options, ...settings });

test('an order links by browser, explicit search, visit and canonical product; quantities and retries do not inflate products or orders', () => {
  const report = summarize([order(), order(21, { items: [{ id: '000000123', quantity: 9 }] })]);
  assert.equal(report.orders.groups.semantix.reportedOrders, 1);
  assert.equal(report.orders.groups.semantix.searchLinkedOrders, 1);
  assert.equal(report.orders.groups.semantix.productLinkedOrders, 1);
  assert.equal(report.orders.groups.semantix.purchasedProducts, 1);
  assert.equal(report.orders.groups.semantix.productPurchaseRate, 1);
  assert.equal(report.orders.coverage.duplicateEvents, 1);
  assert.equal(report.groups.semantix.productCartRate, 0);
  const json = JSON.stringify(report);
  for (const value of ['order-1', 'browser-s', 'visit-s', 'search-s', '"items"', '"order_id"']) assert.ok(!json.includes(value));
});

test('two orders can contain the same reached product but that product opportunity is purchased only once', () => {
  const report = summarize([order(), order(22, { order_id: 'order-2' })]);
  assert.equal(report.orders.groups.semantix.productLinkedOrders, 2);
  assert.equal(report.orders.groups.semantix.purchasedProducts, 1);
  assert.equal(report.orders.groups.semantix.productPurchaseRate, 1);
});

test('ordinary checkout requests and events without a real order number are not completed orders', () => {
  const report = summarize([order(20, { event_type: 'checkout' }), order(20, { event_type: 'checkout_initiated' }), order(20, { order_id: '' }), order(20, { source: 'cart-response' })]);
  assert.equal(report.orders.groups.semantix.reportedOrders, 0);
  assert.equal(report.orders.coverage.excluded.unsupportedEvent, 3);
  assert.equal(report.orders.coverage.excluded.missingOrderId, 1);
});

test('stale or missing search and visit identifiers never fall back to the latest browser search', () => {
  const report = summarize([
    order(20, { order_id: 'missing', search_id: undefined }),
    order(20, { order_id: 'wrong-search', search_id: 'other' }),
    order(20, { order_id: 'wrong-visit', visit_id: 'other' }),
    order(20, { order_id: 'no-visit', visit_id: undefined }),
  ]);
  assert.equal(report.orders.groups.semantix.reportedOrders, 4);
  assert.equal(report.orders.groups.semantix.searchLinkedOrders, 0);
  assert.equal(report.orders.groups.semantix.productLinkedOrders, 0);
  assert.equal(report.orders.groups.semantix.searchLinkCoverage, 0);
});

test('a search-linked order with unrelated, missing or same-named items does not prove the searched product was bought', () => {
  const report = summarize([order(20, { items: [{ id: 'other', name: 'A book' }, { name: 'A book' }] })]);
  assert.equal(report.orders.groups.semantix.searchLinkedOrders, 1);
  assert.equal(report.orders.groups.semantix.productLinkedOrders, 0);
  assert.equal(report.orders.groups.semantix.purchasedProducts, 0);
});

test('a confirmed direct add from the search can match an order without a product click', () => {
  const report = summarize([order()], { clicks: [], carts: [row(13, { event_type: 'add_to_cart_confirmed', event_id: 'cart-1', product_id: '42', search_link: 'results_page' })] });
  assert.equal(report.groups.semantix.clickedProducts, 1);
  assert.equal(report.orders.groups.semantix.productLinkedOrders, 1);
  assert.equal(report.orders.groups.semantix.productPurchaseRate, 1);
});

test('interactions after the order or without the matching visit cannot be used as product evidence', () => {
  for (const click of [row(25, { product_id: '42', search_link: 'results_page' }), row(12, { product_id: '42', search_link: 'results_page', visit_id: undefined })]) {
    const report = summarize([order()], { clicks: [click] });
    assert.equal(report.orders.groups.semantix.searchLinkedOrders, 1);
    assert.equal(report.orders.groups.semantix.productLinkedOrders, 0);
  }
});

test('conflicting duplicate order identities are excluded as a whole', () => {
  const report = summarize([order(), order(21, { ab_tests: { semantix_takeover: 'native' } })]);
  assert.equal(report.orders.groups.semantix.reportedOrders, 0);
  assert.equal(report.orders.groups.native.reportedOrders, 0);
  assert.equal(report.orders.coverage.excluded.conflictingDuplicate, 1);
});

test('fallback, pinned and contradictory order tags cannot become either comparison arm', () => {
  const report = summarize([order(20, { order_id: 'fallback', ab_tests: { semantix_takeover: 'native:fallback' } }), order(20, { order_id: 'pinned', ab_tests: { semantix_takeover: 'semantix:pinned' } }), order(20, { order_id: 'wrong', ab_tests: { semantix_takeover: 'native' } })]);
  assert.equal(report.orders.groups.semantix.reportedOrders, 0);
  assert.equal(report.orders.groups.native.reportedOrders, 0);
});

test('the existing measurement boundary applies to orders and all their supporting events', () => {
  const report = summarize([order(9), order(50), order(20, { created_at: at(51) })]);
  assert.equal(report.orders.groups.semantix.reportedOrders, 0);
  const oldSearch = summarize([order()], { queries: [row(9, { query: 'old' })] });
  assert.equal(oldSearch.orders.groups.semantix.searchLinkedOrders, 0);
});

test('unavailable orders suppress order metrics without hiding valid cart numbers', () => {
  const report = summarize([], {}, { ordersAvailable: false, ordersComplete: false });
  assert.equal(report.measurement.complete, true);
  assert.equal(report.orders.complete, false);
  assert.equal(report.orders.groups.semantix.reportedOrders, null);
  assert.equal(report.orders.groups.semantix.productPurchaseRate, null);
  assert.equal(report.groups.semantix.clickedProducts, 1);
  assert.equal(report.groups.semantix.productCartRate, 0);
});

test('empty denominators do not produce a zero or infinite purchase rate', () => {
  const report = summarize([order()], { clicks: [] });
  assert.equal(report.orders.groups.semantix.searchLinkedOrders, 1);
  assert.equal(report.orders.groups.semantix.productPurchaseRate, null);
  assert.equal(report.orders.groups.native.searchLinkCoverage, null);
});
