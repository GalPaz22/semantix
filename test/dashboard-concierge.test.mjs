import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAUTICS_DB, getDashboardConcierge, summarizeConciergeVisits } from '../lib/dashboard-concierge.js';

const start = Date.parse('2026-10-01T00:00:00Z');
const window = { from: new Date(start).toISOString(), to: new Date(start + 86400000).toISOString() };
const event = (minute, extra = {}) => ({ session_id: 'vis-browser', timestamp: new Date(start + minute * 60000), ...extra });
const fixture = () => ({ concierge_conversations: [], queries: [], product_clicks: [], cart: [], checkout_events: [] });
const paid = (minute, extra = {}) => event(minute, { event_type: 'checkout_completed', source: 'woocommerce_order_completed', order_id: 'order', ...extra });
const cart = (minute, extra = {}) => event(minute, { source: 'woocommerce_add_to_cart', event_type: 'add_to_cart', ...extra });

test('multiple activations count once per visit; later visits on the same browser are separate', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(1), event(2), event(80, { turns: 2 })];
  rows.cart = [cart(3), cart(4)];
  rows.checkout_events = [paid(5), paid(90, { order_id: 'second' })];
  const result = summarizeConciergeVisits(rows, window);
  assert.equal(result.visits, 2);
  assert.equal(result.cartVisits, 1);
  assert.equal(result.purchaseVisits, 2);
  assert.equal(result.engagedVisits, 1);
  assert.equal(result.cartRate, 0.5);
  assert.equal(result.purchaseRate, 1);
  assert.equal(result.coverage.identifiedConversations, 3);
  assert.ok(!JSON.stringify(result).includes('vis-browser'));
  assert.ok(!JSON.stringify(result).includes('second'));
});

test('orders in a later visit and commerce before activation are not credited', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(10)];
  rows.cart = [cart(1), cart(50)];
  rows.checkout_events = [paid(2), paid(51, { order_id: 'later' })];
  const result = summarizeConciergeVisits(rows, window);
  assert.equal(result.visits, 1);
  assert.equal(result.cartVisits, 0);
  assert.equal(result.purchaseVisits, 0);
  assert.equal(result.purchaseRate, 0);
});

test('observed activity and recorded chat turns bridge inactivity gaps', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(1, { turnsAt: [new Date(start + 25 * 60000)], hasMessage: true })];
  rows.product_clicks = [event(50)];
  rows.queries = [event(75)];
  rows.checkout_events = [paid(100)];
  const result = summarizeConciergeVisits(rows, window);
  assert.equal(result.visits, 1);
  assert.equal(result.purchaseVisits, 1);
  assert.equal(result.engagedVisits, 1);
});

test('only successful carts and deduplicated paid server orders count, with identified duplicate preferred', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(1), event(2, { session_id: 'internal-test' })];
  rows.cart = [cart(5, { source: 'browser' }), cart(6, { event_type: 'remove_from_cart' })];
  rows.checkout_events = [
    paid(3, { session_id: null }), paid(4), paid(90),
    paid(5, { order_id: 'thankyou', source: 'browser' }),
    paid(6, { order_id: null }), paid(7, { event_type: 'checkout_initiated', order_id: 'unpaid' }),
  ];
  const result = summarizeConciergeVisits(rows, window);
  assert.equal(result.visits, 1);
  assert.equal(result.cartVisits, 0);
  assert.equal(result.purchaseVisits, 1);
  assert.equal(result.coverage.paidOrders, 1);
  assert.equal(result.coverage.identifiedConversations, 1);
  assert.equal(result.coverage.conversations, 2);
});

test('missing paid tracking and no visits yield unavailable rates, and the window excludes future events', () => {
  const rows = fixture();
  assert.equal(summarizeConciergeVisits(rows, window).cartRate, null);
  rows.concierge_conversations = [event(1)];
  rows.checkout_events = [paid(1440)];
  assert.equal(summarizeConciergeVisits(rows, window).purchaseRate, null);
  assert.equal(summarizeConciergeVisits(rows, window).visits, 1);
  assert.throws(() => summarizeConciergeVisits(rows, { from: 'bad', to: window.to }));
});

test('visits activated before the selected window are not new concierge visits', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(-50), event(1)];
  rows.product_clicks = [event(-25)];
  rows.checkout_events = [paid(2)];
  assert.equal(summarizeConciergeVisits(rows, window).visits, 0);
});

test('the reader is Beautics-only and missing collections never become a measured zero', async () => {
  const client = { db(name) {
    assert.equal(name, BEAUTICS_DB);
    return { listCollections: () => ({ toArray: async () => [] }) };
  } };
  assert.equal(await getDashboardConcierge(client, 'another-store', window), null);
  assert.deepEqual(await getDashboardConcierge(client, BEAUTICS_DB, window), { status: 'unavailable' });
  assert.deepEqual(await getDashboardConcierge(client, BEAUTICS_DB, null), { status: 'unavailable' });
});

test('revenue sums distinct paid orders after activation in the same visit using exact cents', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(5), event(6)];
  rows.checkout_events = [
    paid(1, { order_id: 'before', order_total: 500, currency: 'ILS' }),
    paid(7, { order_id: 'a', order_total: '19.90', currency: 'ILS' }),
    paid(8, { order_id: 'a', order_total: 999, currency: 'ILS' }),
    paid(9, { order_id: 'b', order_total: 0.2, currency: 'ILS' }),
    paid(10, { order_id: 'unpaid', event_type: 'checkout_initiated', order_total: 500, currency: 'ILS' }),
    paid(11, { order_id: 'browser', source: 'browser', order_total: 500, currency: 'ILS' }),
    paid(12, { order_id: 'unknown', session_id: null, order_total: 500, currency: 'ILS' }),
    paid(90, { order_id: 'later', order_total: 500, currency: 'ILS' }),
    paid(1440, { order_id: 'future', order_total: 500, currency: 'ILS' }),
  ];
  const result = summarizeConciergeVisits(rows, window);
  assert.equal(result.purchaseVisits, 1);
  assert.deepEqual(result.revenue, { orders: 2, measuredOrders: 2, missingOrders: 0, totals: [{ currency: 'ILS', amount: 20.1, orders: 2 }] });
  assert.ok(!JSON.stringify(result).includes('unknown'));
});

test('revenue preserves currencies, legacy totals, zero amounts, and identified duplicate attribution', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(1)];
  rows.checkout_events = [
    paid(2, { session_id: null, order_total: 20, currency: 'ILS' }),
    paid(3, { order_total: 20, currency: 'ILS' }),
    paid(4, { order_id: 'usd', orderData: { total_price: '1,234.56', currency: 'USD' } }),
    paid(5, { order_id: 'eur', total: 0, currency: 'EUR' }),
  ];
  const result = summarizeConciergeVisits(rows, window);
  assert.deepEqual(result.revenue, { orders: 3, measuredOrders: 3, missingOrders: 0, totals: [
    { currency: 'EUR', amount: 0, orders: 1 },
    { currency: 'ILS', amount: 20, orders: 1 },
    { currency: 'USD', amount: 1234.56, orders: 1 },
  ] });
});

test('missing and invalid amounts or currencies stay explicit instead of silently becoming revenue', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(1)];
  rows.checkout_events = [
    paid(2, { order_id: 'missing' }),
    paid(3, { order_id: 'blank', order_total: ' ', currency: 'ILS' }),
    paid(4, { order_id: 'negative', order_total: -20, currency: 'ILS' }),
    paid(5, { order_id: 'invalid', order_total: 'bad', currency: 'ILS' }),
    paid(6, { order_id: 'currency', order_total: 100, currency: '₪' }),
  ];
  assert.deepEqual(summarizeConciergeVisits(rows, window).revenue, { orders: 5, measuredOrders: 0, missingOrders: 5, totals: [] });
  rows.checkout_events.push(paid(7, { order_id: 'measured', order_total: 42.5, currency: 'ILS' }));
  assert.deepEqual(summarizeConciergeVisits(rows, window).revenue, { orders: 6, measuredOrders: 1, missingOrders: 5, totals: [{ currency: 'ILS', amount: 42.5, orders: 1 }] });
});

test('unavailable purchase tracking differs from zero attributed orders', () => {
  const rows = fixture();
  rows.concierge_conversations = [event(1)];
  assert.equal(summarizeConciergeVisits(rows, window).revenue, null);
  rows.checkout_events = [paid(90, { order_total: 100, currency: 'ILS' })];
  assert.deepEqual(summarizeConciergeVisits(rows, window).revenue, { orders: 0, measuredOrders: 0, missingOrders: 0, totals: [] });
});

test('the scoped reader projects amounts and currencies without loading customer details', async () => {
  const rows = fixture();
  rows.concierge_conversations = [event(1)];
  rows.checkout_events = [paid(2, { order_total: 89.9, currency: 'ILS' })];
  const client = { db(name) {
    assert.equal(name, BEAUTICS_DB);
    return {
      listCollections: () => ({ toArray: async () => Object.keys(rows).map(name => ({ name })) }),
      collection(name) { return {
        findOne: async () => null,
        find(_filter, { projection }) {
          if (name === 'checkout_events') {
            for (const key of ['order_total', 'currency', 'orderData.total_price', 'orderData.currency']) assert.equal(projection[key], 1);
            assert.equal(projection.orderData, undefined);
            assert.equal(projection.email, undefined);
          }
          return { limit() { return this; }, toArray: async () => rows[name] };
        },
      }; },
    };
  } };
  assert.deepEqual((await getDashboardConcierge(client, BEAUTICS_DB, window)).revenue.totals, [{ currency: 'ILS', amount: 89.9, orders: 1 }]);
});
