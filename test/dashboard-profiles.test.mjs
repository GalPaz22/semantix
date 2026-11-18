import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardProfiles, mergeIdentities, profileFilter, orderItems } from '../lib/dashboard-profiles.js';

const at = (h) => new Date(Date.UTC(2026, 10, 16, h));

test('identities merge into one profile per customer; an order wins over an account', () => {
  const profiles = mergeIdentities([
    { session_id: 's1', email: 'Dana@Example.com', first_name: 'דנה', source: 'account', created_at: at(8), updated_at: at(9) },
    { session_id: 's2', email: 'dana@example.com', first_name: 'דנה כהן', phone: '0501234567', source: 'order', order_ids: ['77'], created_at: at(10), updated_at: at(11) },
    { session_id: 's3', phone: '0529999999', source: 'account', created_at: at(7), updated_at: at(7) },
    { session_id: '', email: 'ghost@example.com' },
  ]);
  assert.equal(profiles.length, 2);
  const [dana, phoneOnly] = profiles;
  assert.equal(dana.email, 'dana@example.com');
  assert.deepEqual(dana.sessions, ['s1', 's2']);
  assert.equal(dana.firstName, 'דנה כהן');
  assert.equal(dana.phone, '0501234567');
  assert.deepEqual(dana.orderIds, ['77']);
  assert.equal(dana.firstSeen, at(8).toISOString());
  assert.equal(dana.lastSeen, at(11).toISOString());
  assert.equal(phoneOnly.key, '0529999999');
});

test('search is literal and finds a phone however it is typed', () => {
  assert.deepEqual(profileFilter(''), {});
  const or = profileFilter('050-123').$or;
  assert.ok(or.some((c) => c.phone?.test('0501234567')));
  assert.ok(!or.some((c) => c.email?.test('anything')), 'not a regex');
  assert.throws(() => profileFilter('x'.repeat(121)));
});

function fakeClient(data) {
  const pick = (rows, filter) => rows.filter((r) => {
    const s = filter?.session_id?.$in;
    if (s && !s.includes(r.session_id)) return false;
    if (filter?.event_type && r.event_type !== filter.event_type) return false;
    return true;
  });
  const cursor = (rows) => ({ sort: () => cursor(rows), limit: (n) => cursor(rows.slice(0, n)), toArray: async () => rows });
  const collection = (name) => ({
    find: (filter) => cursor(pick(data[name] || [], filter)),
    aggregate: (stages) => ({ toArray: async () => {
      const counts = new Map();
      for (const r of pick(data[name] || [], stages[0].$match)) counts.set(r.session_id, (counts.get(r.session_id) || 0) + 1);
      return [...counts].map(([_id, n]) => ({ _id, n }));
    } }),
  });
  return { db: (name) => { assert.equal(name, 'garmin'); return { collection }; } };
}

test('a profile carries its sessions\' searches, orders and concierge chats, and only Garmin has profiles', async () => {
  const client = fakeClient({
    session_identities: [{ session_id: 'sess-a', email: 'dana@example.com', first_name: 'דנה', source: 'order', order_ids: ['500'], created_at: at(9), updated_at: at(10) }],
    queries: [{ session_id: 'sess-a', query: 'forerunner 265' }, { session_id: 'sess-a', query: 'forerunner 265' }, { session_id: 'sess-x', query: 'other' }],
    product_clicks: [{ session_id: 'sess-a' }],
    cart: [{ session_id: 'sess-a' }],
    checkout_events: [{ session_id: 'sess-a', event_type: 'checkout_completed', order_id: '500', order_total: 1699, cart_items: [{ product_name: 'Forerunner 265' }], created_at: at(10) }],
    concierge_conversations: [{ session_id: 'sess-a', conversation_id: 'cnv1', turns: 2, transcript: [{ message: 'מה ההבדל בין 265 ל-965?' }], updated_at: at(9) }],
  });
  const result = await getDashboardProfiles(client, 'garmin', {});
  assert.equal(result.total, 1);
  const [p] = result.profiles;
  assert.deepEqual(p.activity, { searches: 2, clicks: 1, cart: 1, orders: 1, conversations: 1 });
  assert.deepEqual(p.lastSearches, ['forerunner 265']);
  assert.equal(p.revenue, 1699);
  assert.equal(p.orders[0].items[0], 'Forerunner 265');
  assert.equal(p.conversations[0].preview, 'מה ההבדל בין 265 ל-965?');
  assert.ok(!JSON.stringify(result).includes('sess-a'), 'session ids stay internal');
  await assert.rejects(getDashboardProfiles(client, 'steimatzky', {}), /אינם זמינים/);
  await assert.rejects(getDashboardProfiles(client, 'garmin', { page: '0' }));
});

test('order lines show name, quantity and price, whatever the store calls the lines', () => {
  assert.deepEqual(orderItems({ products: [{ product_id: '1', product_name: 'קורבלי רוזה', quantity: 2, price: 42 }, { product_id: '2', product_name: 'נו רסין', quantity: 1, price: 49 }] }),
    ['קורבלי רוזה ×2 · ₪42', 'נו רסין · ₪49']);
  assert.deepEqual(orderItems({ cart_items: [{ product_name: 'Forerunner 265' }] }), ['Forerunner 265']);
  // No name on the line: the catalog fills it in; the id only when the catalog does not know it either.
  assert.deepEqual(orderItems({ products: [{ product_id: '7', quantity: 1 }, { product_id: '8' }] }, new Map([['7', { name: 'יין', price: 60 }]])), ['יין · ₪60', 'מוצר 8']);
});
