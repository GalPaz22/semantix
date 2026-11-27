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

function fakeClient(data, dbName = 'garmin') {
  const pick = (rows, filter) => rows.filter((r) => {
    const s = filter?.session_id?.$in;
    if (s && !s.includes(r.session_id)) return false;
    if (filter?.event_type && r.event_type !== filter.event_type) return false;
    if (filter?.status && r.status !== filter.status) return false;
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
  return { db: (name) => { assert.equal(name, dbName); return { collection }; } };
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

test('a profile shows the searched products that came back, and the list can be limited to those', async () => {
  const item = (id, name, extra) => ({ product_id: id, name, url: `https://shop.example/${id}`, query: name, searched_at: at(1), restocked_at: at(5), ...extra });
  const client = fakeClient({ session_identities: [
    { session_id: 'a1', email: 'a@example.com', updated_at: at(9), back_in_stock: true, back_in_stock_products: [item('1', 'פלאם'), item('2', 'סנגריה', { url: 'javascript:alert(1)', restocked_at: at(7) })] },
    { session_id: 'a2', email: 'a@example.com', updated_at: at(8), back_in_stock: true, back_in_stock_products: [item('1', 'פלאם', { searched_at: at(3), query: 'פלם' })] },
    { session_id: 'b1', email: 'b@example.com', updated_at: at(10), back_in_stock: false, back_in_stock_products: [item('9', 'ישן')] },
    { session_id: 'c1', email: 'c@example.com', updated_at: at(6) },
  ], queries: [{ session_id: 'a1', query: 'x' }, { session_id: 'a2', query: 'y' }] }, 'manoVino');
  const every = await getDashboardProfiles(client, 'manoVino', {});
  assert.equal(every.total, 3);
  assert.deepEqual(every.restockCounts, { back: 1, waiting: 0 });
  assert.deepEqual(every.profiles.map((p) => p.backInStock.length), [0, 2, 0]);
  const only = await getDashboardProfiles(client, 'manoVino', { restock: 'back' });
  assert.equal(only.total, 1);
  const [a] = only.profiles;
  assert.deepEqual(a.backInStock.map((i) => i.id), ['2', '1'], 'newest restock first, one entry per product');
  assert.equal(a.backInStock[0].url, null, 'only web links');
  assert.equal(a.backInStock[1].query, 'פלם', 'the latest search of the product');
  assert.equal(a.activity.searches, 2);
  assert.ok(!JSON.stringify(only).includes('"rows"') && !JSON.stringify(only).includes('a1'), 'session ids stay internal');
});

test('a profile shows the sold-out products it still waits for, and the list can be limited to those', async () => {
  const watch = (session_id, id, extra) => ({ session_id, product_id: id, product_name: `יין ${id}`, product_url: `https://shop.example/${id}`, query: `q${id}`, last_searched_at: at(2), status: 'waiting', ...extra });
  const client = fakeClient({ session_identities: [
    { session_id: 'a1', email: 'a@example.com', updated_at: at(9) },
    { session_id: 'a2', email: 'a@example.com', updated_at: at(8), back_in_stock: true, back_in_stock_products: [{ product_id: '3', name: 'חזר' }] },
    { session_id: 'b1', email: 'b@example.com', updated_at: at(7) },
  ], restock_watches: [
    watch('a1', '1'), watch('a2', '1', { query: 'חדש', last_searched_at: at(4) }), watch('a1', '2', { last_searched_at: at(6), product_url: 'javascript:alert(1)' }),
    watch('a1', '3'), watch('b1', '4', { status: 'expired' }), watch('nobody', '5'),
  ] }, 'manoVino');
  const every = await getDashboardProfiles(client, 'manoVino', {});
  assert.deepEqual(every.restockCounts, { back: 1, waiting: 1 });
  assert.deepEqual(every.profiles.map((p) => p.waiting.length), [2, 0]);
  const only = await getDashboardProfiles(client, 'manoVino', { restock: 'waiting' });
  assert.equal(only.total, 1);
  const { waiting } = only.profiles[0];
  assert.deepEqual(waiting.map((i) => i.id), ['2', '1'], 'newest search first, one entry per product, a returned product is not waiting');
  assert.equal(waiting[0].url, null, 'only web links');
  assert.equal(waiting[1].query, 'חדש', 'the latest search of the product');
  assert.ok(!JSON.stringify(only).includes('a1'), 'session ids stay internal');
});

test('only Mano Vino shows the stock products and filters', async () => {
  const client = fakeClient({ session_identities: [
    { session_id: 'a1', email: 'a@example.com', updated_at: at(9), back_in_stock: true, back_in_stock_products: [{ product_id: '1', name: 'שעון' }] },
    { session_id: 'b1', email: 'b@example.com', updated_at: at(8) },
  ], restock_watches: [{ session_id: 'b1', product_id: '2', product_name: 'רצועה', status: 'waiting' }] });
  for (const restock of ['', 'back', 'waiting']) {
    const page = await getDashboardProfiles(client, 'garmin', { restock });
    assert.equal(page.restockCounts, null);
    assert.equal(page.total, 2, 'the filter is ignored');
    assert.deepEqual(page.profiles.map((p) => [p.backInStock, p.waiting]), [[[], []], [[], []]]);
  }
});
