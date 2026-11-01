import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { getProductPromotionCampaigns, promotionWindows, summarizePromotion } from '../lib/product-promotion-campaigns.js';

const applied = '2026-10-25T10:05:57.579Z';
const now = new Date('2026-11-01T10:05:57.579Z');
const id = new ObjectId(), proposalId = new ObjectId();
const products = [{ _id: id, id: 48138, name: 'מזח סוביניון בלאן' }];
const sources = Object.fromEntries(['queries', 'product_clicks', 'cart', 'checkout_events'].map(name => [name, { status: 'ok' }]));
const event = extra => ({ timestamp: '2026-10-26T10:00:00Z', ...extra });

test('windows anchor at application, have equal duration, and never include pre-approval activity as after', () => {
  const windows = promotionWindows(applied, new Date('2026-10-26T10:05:57.579Z'));
  assert.equal(windows.after.from, applied);
  assert.equal(+new Date(windows.before.to) - +new Date(windows.before.from), +new Date(windows.after.to) - +new Date(windows.after.from));
  const later = promotionWindows(applied, new Date('2026-11-15T10:05:57.579Z'));
  assert.equal(later.before.to, applied);
  assert.equal(later.after.from, '2026-11-08T10:05:57.579Z');
  assert.equal(promotionWindows(undefined, now), null);
  assert.equal(promotionWindows('2027-01-01', now), null);
});

test('cohorts match exact product IDs/names, deduplicate stable events/orders and exclude previews and time boundaries', () => {
  const rows = {
    queries: [event({ deliveredProducts: ['מזח סוביניון בלאן'] }), event({ deliveredProducts: ['מארז מזח'] })],
    product_clicks: [event({ product_id: '48138', event_id: 'click' }), event({ product_id: '48138', event_id: 'click' }),
      event({ product_id: String(id) }), event({ product_name: 'מזח סוביניון בלאן' }),
      event({ product_id: '999', product_name: 'מזח סוביניון בלאן' }), event({ product_id: '48138', session_id: 'internal-test' }),
      event({ product_id: '48138', timestamp: now.toISOString() }), event({ product_id: '48138', timestamp: '2026-10-24T00:00:00Z' })],
    cart: [event({ product_id: 48138, event_type: 'add_to_cart' }), event({ product_id: 48138, event_type: 'remove_from_cart' })],
    checkout_events: [event({ order_id: 'one', event_type: 'checkout_completed', products: [{ product_id: 48138 }] }),
      event({ order_id: 'one', event_type: 'checkout_completed', products: [{ product_id: 48138 }] }),
      event({ order_id: 'unpaid', event_type: 'checkout_initiated', products: [{ product_id: 48138 }] }),
      event({ order_id: 'other', event_type: 'checkout_completed', products: [{ product_id: '999' }] })],
  };
  const result = summarizePromotion(rows, products, promotionWindows(applied, now).after, sources);
  assert.equal(result.searchAppearances, 1);
  assert.equal(result.searches, 2);
  assert.equal(result.clicks, 3);
  assert.equal(result.carts, 1);
  assert.equal(result.reportedOrders, 1);
  assert.equal(JSON.stringify(result).includes('internal-test'), false);
  assert.equal('conversionRate' in result, false);
});

test('missing, failed and truncated sources remain unavailable while a complete empty source is zero', () => {
  const result = summarizePromotion({}, products, promotionWindows(applied, now).after, {
    queries: { status: 'truncated' }, product_clicks: { status: 'ok' }, cart: { status: 'missing' }, checkout_events: { status: 'unavailable' },
  });
  assert.equal(result.searchAppearances, null);
  assert.equal(result.clicks, 0);
  assert.equal(result.carts, null);
  assert.equal(result.reportedOrders, null);
});

test('the reader scopes approvals/audits to the store, verifies current boosts and handles BSON and ISO commerce dates', async () => {
  const reads = [];
  const cursor = data => ({ sort() { return this; }, limit() { return this; }, toArray: async () => data });
  const client = { db(name) {
    assert.ok(['control_plane', 'store-a'].includes(name));
    return {
      listCollections: () => cursor(Object.keys(sources).map(name => ({ name }))),
      collection(collection) { return { find(filter, options) {
        reads.push({ name, collection, filter, options });
        if (name === 'control_plane') {
          assert.equal(filter.dbName, 'store-a');
          if (collection === 'proposals') return cursor([{ _id: proposalId, boostChange: { term: 'מזח', level: 2, products: [{ _id: String(id), name: products[0].name }] } }]);
          assert.deepEqual(filter.proposalId.$in, [String(proposalId)]);
          return cursor([{ proposalId: String(proposalId), appliedAt: applied }]);
        }
        if (collection === 'products') return cursor([{ ...products[0], boost: 2, stockStatus: 'instock' }]);
        assert.ok(filter.$or[0].timestamp.$gte instanceof Date);
        assert.equal(typeof filter.$or[1].timestamp.$gte, 'string');
        return cursor(collection === 'cart' ? [event({ product_id: 48138 })] : []);
      } }; },
    };
  } };
  const [campaign] = await getProductPromotionCampaigns(client, 'store-a', { now });
  assert.equal(campaign.status, 'applied');
  assert.equal(campaign.currentCount, 1);
  assert.equal(campaign.availableCount, 1);
  assert.equal(campaign.measurement.before.carts, 0);
  assert.equal(campaign.measurement.after.carts, 1);
  assert.equal(campaign.appliedAt, applied);
  assert.equal(JSON.stringify(campaign).includes(String(id)), false);
  assert.equal(reads.length, 7);
});
