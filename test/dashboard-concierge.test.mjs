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
