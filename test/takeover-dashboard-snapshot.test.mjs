import test from 'node:test';
import assert from 'node:assert/strict';
import { readFrozenTakeoverAnalytics, TAKEOVER_SNAPSHOT_ID } from '../lib/takeover-dashboard-snapshot.js';

test('saved rates and all supporting metrics stay fixed across refreshes without reading live events', async () => {
  const report = { generatedAt: '2026-11-11T07:13:15.976Z', measurement: { complete: true }, searchConversion: { complete: true, window: { from: '2026-11-04T07:13:15.976Z', to: '2026-11-11T05:13:15.976Z', observedUntil: '2026-11-11T07:13:15.976Z' }, comparison: { relativeLift: (20 / 100) / (100 / 600) - 1 }, groups: { semantix: { searches: 100, cartedSearches: 20 }, native: { searches: 600, cartedSearches: 100 } } } };
  let reads = 0;
  const client = { db(name) { assert.equal(name, 'steimatzky'); return { collection(name) { assert.equal(name, 'dashboard_snapshots'); return { async findOne(filter) { reads++; assert.deepEqual(filter, { _id: TAKEOVER_SNAPSHOT_ID }); return { report, frozenAt: '2026-11-11T07:20:00.000Z' }; } }; } }; } };
  const first = await readFrozenTakeoverAnalytics(client, 'steimatzky');
  assert.deepEqual(first.searchConversion, report.searchConversion);
  first.searchConversion.comparison.relativeLift = 100;
  const second = await readFrozenTakeoverAnalytics(client, 'steimatzky');
  assert.deepEqual(second.searchConversion, report.searchConversion);
  assert.equal(second.generatedAt, report.generatedAt);
  assert.equal(second.snapshot.mode, 'frozen');
  assert.equal(second.snapshot.periodDays, 7);
  assert.equal((second.searchConversion.comparison.relativeLift * 100).toFixed(1), '20.0');
  assert.equal(reads, 2);
});

test('a daily snapshot cannot be served as the weekly dashboard', async () => {
  const saved = { frozenAt: '2026-11-11T07:20:00.000Z', report: { measurement: { complete: true }, searchConversion: { complete: true, window: { from: '2026-11-10T07:13:15.976Z', observedUntil: '2026-11-11T07:13:15.976Z' } } } };
  const client = { db() { return { collection() { return { async findOne() { return saved; } }; } }; } };
  await assert.rejects(readFrozenTakeoverAnalytics(client, 'steimatzky'), e => e.status === 503);
});

test('missing or incomplete snapshot fails closed rather than switching to live results', async () => {
  for (const saved of [null, { report: { measurement: { complete: false } } }]) {
    const client = { db() { return { collection() { return { async findOne() { return saved; } }; } }; } };
    await assert.rejects(readFrozenTakeoverAnalytics(client, 'steimatzky'), e => e.status === 503);
  }
  await assert.rejects(readFrozenTakeoverAnalytics({ db() { throw Error('unexpected read'); } }, 'other'), e => e.status === 404);
});
