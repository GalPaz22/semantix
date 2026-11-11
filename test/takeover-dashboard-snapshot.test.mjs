import test from 'node:test';
import assert from 'node:assert/strict';
import { readFrozenTakeoverAnalytics, TAKEOVER_SNAPSHOT_ID } from '../lib/takeover-dashboard-snapshot.js';

test('saved rates and all supporting metrics stay fixed across refreshes without reading live events', async () => {
  const report = { generatedAt: '2026-11-11T07:13:15.976Z', measurement: { complete: true }, searchConversion: { complete: true, comparison: { relativeLift: -.02709713651528034 }, groups: { semantix: { searches: 802, cartedSearches: 107 }, native: { searches: 5440, cartedSearches: 746 } } } };
  let reads = 0;
  const client = { db(name) { assert.equal(name, 'steimatzky'); return { collection(name) { assert.equal(name, 'dashboard_snapshots'); return { async findOne(filter) { reads++; assert.deepEqual(filter, { _id: TAKEOVER_SNAPSHOT_ID }); return { report, frozenAt: '2026-11-11T07:20:00.000Z' }; } }; } }; } };
  const first = await readFrozenTakeoverAnalytics(client, 'steimatzky');
  assert.deepEqual(first.searchConversion, report.searchConversion);
  first.searchConversion.comparison.relativeLift = 100;
  const second = await readFrozenTakeoverAnalytics(client, 'steimatzky');
  assert.deepEqual(second.searchConversion, report.searchConversion);
  assert.equal(second.generatedAt, report.generatedAt);
  assert.equal(second.snapshot.mode, 'frozen');
  assert.equal(reads, 2);
});

test('missing or incomplete snapshot fails closed rather than switching to live results', async () => {
  for (const saved of [null, { report: { measurement: { complete: false } } }]) {
    const client = { db() { return { collection() { return { async findOne() { return saved; } }; } }; } };
    await assert.rejects(readFrozenTakeoverAnalytics(client, 'steimatzky'), e => e.status === 503);
  }
  await assert.rejects(readFrozenTakeoverAnalytics({ db() { throw Error('unexpected read'); } }, 'other'), e => e.status === 404);
});
