import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTakeover, readTakeoverAnalytics } from '../lib/takeover-analytics.js';
import { customerDashboardAccess, customerDashboardOperationAllowed, assertCustomerWorkspaceWritable } from '../lib/customer-dashboard-access.js';
import { assertCustomerWriteAccess } from '../lib/customer-workspace-guard.js';

const stamp = minute => `2026-11-01T00:${String(minute).padStart(2, '0')}:00.000Z`;
const event = (session, variant, minute, fields = {}) => ({ session_id: session, timestamp: stamp(minute), ...(variant ? { ab_tests: { semantix_takeover: variant } } : {}), ...fields });
const options = { from: stamp(10), to: stamp(50), cohortFrom: stamp(0) };

test('both groups use unique searcher outcomes after search, keeping native attribution distinct from direct tags', () => {
  const report = summarizeTakeover({
    exposures: [event('s', 'semantix', 0), event('n', 'native', 0), event('b', 'native', 0)],
    queries: [event('s', 'semantix', 12, { query: 'Book', search_id: 'one' }), event('s', 'semantix', 13, { query: 'Book' }), event('n', null, 12, { query: 'Book' }), event('b', null, 12, { query: 'Other' })],
    carts: [event('s', 'semantix', 11), event('s', 'semantix', 14), event('s', 'semantix', 15), event('n', 'native', 13)], clicks: [event('s', null, 14)],
  }, options);
  assert.equal(report.groups.semantix.searches, 2);
  assert.equal(report.groups.semantix.searchers, 1);
  assert.equal(report.groups.semantix.cartersAfterSearch, 1);
  assert.equal(report.groups.semantix.cartEventsAfterSearch, 2);
  assert.equal(report.groups.semantix.cartRate, 1);
  assert.equal(report.groups.native.cartRate, .5);
  assert.equal(report.groups.native.queryTagCoverage, 0);
  assert.equal(report.groups.semantix.searchIdCoverage, .5);
  assert.deepEqual(report.topQueries[0], { query: 'book', semantix: 2, native: 1 });
  assert.equal(report.groups.semantix.purchases, null);
  assert.ok(!JSON.stringify(report).includes('session_id'));
});

test('conflicts from any source exclude the whole ID; fallback and pinned traffic never inflate the control arm', () => {
  const report = summarizeTakeover({
    exposures: [event('mixed', 'semantix', 11), event('fallback', 'native:fallback', 11), event('qa', 'semantix:pinned', 11), event('n', 'native', 11)],
    queries: [event('mixed', 'semantix', 12), event('fallback', 'native:fallback', 12), event('qa', 'semantix:pinned', 12), event('n', null, 12)],
    clicks: [event('mixed', 'native', 13)], carts: [],
  }, options);
  assert.equal(report.measurement.conflictingVisitors, 1);
  assert.equal(report.groups.semantix.searchers, 0);
  assert.equal(report.groups.native.searchers, 1);
  assert.equal(report.groups.native.exposedVisitors, 1);
  assert.equal(report.measurement.exposureCoverage, .25);
});

test('window boundaries are exclusive, pre-exposure activity is excluded and returning browsers can use earlier exposure', () => {
  const report = summarizeTakeover({ exposures: [event('early', 'semantix', 1), event('late', 'native', 20)],
    queries: [event('early', null, 10), event('early', null, 50), event('late', null, 15)],
    clicks: [], carts: [event('early', 'semantix', 49), event('early', 'semantix', 50)],
  }, options);
  assert.equal(report.groups.semantix.searches, 1);
  assert.equal(report.groups.semantix.cartEventsAfterSearch, 1);
  assert.equal(report.groups.native.searches, 0);
});

test('empty and incomplete measurements do not fabricate conversion, revenue or a winning variant', () => {
  const report = summarizeTakeover({ exposures: [event('s', 'semantix', 11)], queries: [event('s', 'semantix', 12)], carts: [event('s', 'semantix', 13)], clicks: [] }, { ...options, complete: false });
  assert.equal(report.groups.semantix.cartRate, null);
  assert.equal(report.groups.native.cartRate, null);
  assert.equal(report.groups.semantix.revenue, null);
  assert.equal(report.measurement.status, 'incomplete');
  assert.equal(report.winner, undefined);
});

test('daily series uses the customer timezone rather than UTC day boundaries', () => {
  const report = summarizeTakeover({ exposures: [{ ...event('s', 'semantix', 0), timestamp: '2026-11-01T21:00:00Z' }],
    queries: [{ ...event('s', null, 0), timestamp: '2026-11-01T22:30:00Z' }], carts: [], clicks: [] }, { from: '2026-11-01T20:00:00Z', to: '2026-11-02T00:00:00Z' });
  assert.equal(report.daily[0].day, '2026-11-02');
});

function clientFixture({ accounts, missing = [], queryRows, failQueries = false } = {}) {
  const reads = [];
  const config = { enabled: true, sticky: false, updatedAt: stamp(0), variants: [{ id: 'semantix', weight: 10 }, { id: 'native', weight: 90 }] };
  const collections = ['tracking_events', 'queries', 'cart', 'product_clicks'].filter(n => !missing.includes(n));
  const rows = { tracking_events: [event('s', 'semantix', 11)], queries: queryRows || [event('s', 'semantix', 12, { query: 'A' })], cart: [event('s', 'semantix', 13)], product_clicks: [] };
  return { reads, db(name) {
    reads.push({ database: name });
    return { listCollections() { return { async toArray() { return collections.map(name => ({ name })); } }; }, collection(collection) {
      return {
        find(filter, opts) {
          reads.push({ name, collection, filter, opts });
          let limit = Infinity;
          return { sort() { return this; }, limit(n) { limit = n; return this; }, async toArray() {
            if (collection === 'queries' && failQueries) throw Error('source unavailable');
            return (name === 'users' ? (accounts || [{ credentials: { siteConfig: { abTests: { semantix_takeover: config } } } }]) : rows[collection] || []).slice(0, limit);
          } };
        },
        async findOne() { return { revision: 34, digest: 'fixture-digest', publishedAt: stamp(10) }; },
        aggregate() { return { async toArray() { return []; } }; },
      };
    } };
  } };
}

test('reader is bounded, uses the authenticated database, clamps to the current edition, and performs only reads', async () => {
  const client = clientFixture();
  const report = await readTakeoverAnalytics(client, 'steimatzky', { days: 7, now: new Date(stamp(50)), useCache: false });
  assert.equal(report.window.from, stamp(10));
  assert.deepEqual(report.experiment.configuredSplit, { semantix: .1, native: .9 });
  assert.equal(report.groups.semantix.cartRate, 1);
  assert.ok(client.reads.every(r => !r.database || ['users', 'steimatzky'].includes(r.database)));
  assert.ok(!JSON.stringify(report).includes('fixture-digest'));
});

test('other stores and invalid ranges are rejected before accessing data', async () => {
  const client = clientFixture();
  await assert.rejects(readTakeoverAnalytics(client, 'other', { useCache: false }), e => e.status === 404);
  await assert.rejects(readTakeoverAnalytics(client, 'steimatzky', { days: 90, useCache: false }), e => e.status === 400);
  assert.deepEqual(client.reads, []);
});

test('a missing source suppresses rates instead of recording missing cart activity as zero', async () => {
  const report = await readTakeoverAnalytics(clientFixture({ missing: ['cart'] }), 'steimatzky', { days: 1, now: new Date(stamp(50)), useCache: false });
  assert.equal(report.measurement.complete, false);
  assert.equal(report.groups.semantix.cartRate, null);
});

test('conflicting rollout configurations fail closed instead of choosing a flattering split', async () => {
  const account = weight => ({ credentials: { siteConfig: { abTests: { semantix_takeover: { variants: [{ id: 'semantix', weight }, { id: 'native', weight: 100 - weight }] } } } } });
  await assert.rejects(readTakeoverAnalytics(clientFixture({ accounts: [account(10), account(50)] }), 'steimatzky', { now: new Date(stamp(50)), useCache: false }), e => e.status === 503);
});

test('steimatzky is analytics-only for deep links and direct proxy calls, while other stores retain existing access', () => {
  assert.equal(customerDashboardAccess('steimatzky').mode, 'analytics-only');
  for (const path of ['dashboard', 'dashboard/ab-test']) assert.equal(customerDashboardOperationAllowed('steimatzky', 'GET', path), true);
  for (const [method, path] of [['GET', 'dashboard/products'], ['PUT', 'dashboard/pins'], ['POST', 'agent/run'], ['DELETE', 'rules/id'], ['GET', 'concierge/settings'], ['GET', 'dashboard/catalog-sync']]) assert.equal(customerDashboardOperationAllowed('steimatzky', method, path), false);
  assert.equal(customerDashboardOperationAllowed('other', 'PUT', 'dashboard/pins'), true);
  assert.throws(() => assertCustomerWorkspaceWritable('steimatzky'), e => e.status === 423);
  assert.throws(() => assertCustomerWorkspaceWritable({ $eq: 'steimatzky' }), e => e.status === 400);
  assert.doesNotThrow(() => assertCustomerWorkspaceWritable('other'));
});

test('legacy writes cannot bypass the lock by supplying another database or signed session store claims', async () => {
  const client = { db() { return { collection() { return { async findOne() { return { dbName: 'steimatzky', credentials: { dbName: 'other' } }; } }; } }; } };
  await assert.rejects(assertCustomerWriteAccess(client, { email: 'customer@example.test', dbName: 'other' }, 'other'), e => e.status === 423);
  await assert.rejects(assertCustomerWriteAccess({ db() { throw Error('should not read'); } }, {}, 'steimatzky'), e => e.status === 423);
});
