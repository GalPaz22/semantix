import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { getDashboardCampaigns, legacyCampaign } from '../lib/dashboard-campaigns.js';

test('promoted experiments retain their historical measurement and discard private snapshot fields', () => {
  const record = { _id: new ObjectId(), name: 'Saved experiment', status: 'promoted', targeting: { patterns: ['watch'] } };
  const result = legacyCampaign(record, 'experiment', { asOf: '2026-10-21', arms: [{ arm: 'v1', sessions: 10, clickRate: null, atcRate: 0, privateSessionIds: ['secret'] }] });
  assert.equal(result.status, 'applied');
  assert.equal(result.previousTest, true);
  assert.equal(result.snapshot.arms[0].clickRate, null);
  assert.equal(result.snapshot.arms[0].atcRate, 0);
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(legacyCampaign({ ...record, status: 'active', condition: { patterns: ['query'] } }, 'rule').status, 'applied');
});

test('campaign reads scope each source to the store, keep live proposals unbounded and restrict snapshot IDs', async () => {
  const id = new ObjectId();
  const reads = [];
  const client = { db(name) {
    assert.equal(name, 'control_plane');
    return { collection(collection) { return {
      find(query) {
        assert.equal(query.dbName, 'store-a');
        const read = { collection, query, limit: null }; reads.push(read);
        const rows = collection === 'proposals' && query.status.$in.includes('running') ? [{ _id: id, title: 'Older live campaign', status: 'running', tenantApiKey: 'secret', createdAt: new Date('2026-01-01') }] : collection === 'experiments' ? [{ _id: id, name: 'Legacy', status: 'running' }] : [];
        return { sort() { return this; }, limit(n) { read.limit = n; return this; }, async toArray() { return rows; } };
      },
      aggregate(pipeline) {
        assert.equal(collection, 'experiment_metrics');
        assert.deepEqual(pipeline[0], { $match: { experimentId: { $in: [String(id)] } } });
        return { async toArray() { return []; } };
      },
    }; } };
  } };
  const data = await getDashboardCampaigns(client, 'store-a');
  assert.equal(data.proposals.find(p => p.title === 'Older live campaign')._id, String(id));
  assert.equal(data.proposals.find(p => p.title === 'Older live campaign').createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(JSON.stringify(data).includes('secret'), false);
  assert.equal(reads[0].limit, null);
  assert.equal(reads[1].limit, 30);
  assert.deepEqual(reads[2].query.layer, { $ne: 'weekly' });
});
