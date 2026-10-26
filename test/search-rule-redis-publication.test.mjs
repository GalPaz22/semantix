import test from 'node:test';
import assert from 'node:assert/strict';
import { publishSearchRulesToRedis } from '../lib/search-rule-redis-publication.js';

function fixture(rules = []) {
  const reads = [], commands = [], connections = [];
  const accounts = [{ apiKey: 'own-a', credentials: { dbName: 'own' } }, { apiKey: 'own-b' },
    { apiKey: 'foreign-key', credentials: { dbName: 'foreign' } }];
  const client = { db: name => ({ collection: collection => ({
    async findOne(filter) { reads.push({ name, collection, filter }); return { redisUrl: 'redis://private-password@cache.example.test:123' }; },
    find(filter) { reads.push({ name, collection, filter }); return {
      sort() { return this; }, limit() { return this; }, async toArray() { return name === 'users' ? accounts : rules; },
    }; },
  }) }) };
  const redis = {
    isOpen: true, on() {}, async connect() {}, async disconnect() { this.isOpen = false; },
    async set(key, value, options) { commands.push(['lock', key, options]); return 'OK'; },
    async eval() { commands.push(['unlock']); },
    multi() { return {
      set(...args) { commands.push(['set', ...args]); return this; },
      del(...args) { commands.push(['del', ...args]); return this; },
      async exec() { commands.push(['exec']); },
    }; },
  };
  const connect = options => { connections.push(options); return redis; };
  return { client, redis, connect, reads, commands, connections };
}

test('publishes current tenant rules for every own key, giving merchant edits precedence', async () => {
  const merchant = { _id: 'merchant', merchantQuery: 'wine', condition: { mode: 'queryMatch', patterns: ['wine'], matchType: 'exact' }, patch: { pinnedResults: [{ query: 'wine', productIds: ['pin-2', 'pin-1'] }], excludedProductIds: ['excluded'] } };
  const agent = { _id: 'agent', patch: { productBoosts: { promoted: 2 } } };
  const f = fixture([merchant, agent]);
  assert.equal(await publishSearchRulesToRedis(f.client, 'own', { connect: f.connect, env: {} }), true);
  const query = f.reads.find(row => row.collection === 'rules').filter;
  assert.deepEqual(query, { status: 'active', $or: [{ dbName: 'own' }, { dbName: { $exists: false }, tenantApiKey: { $in: ['own-a', 'own-b'] } }] });
  const writes = f.commands.filter(row => row[0] === 'set');
  assert.deepEqual(writes.map(row => row[1]), ['rules:active:own-a', 'rules:active:own-b']);
  const wire = JSON.parse(writes[0][2]);
  assert.deepEqual(wire.map(row => row.id), ['agent', 'merchant']);
  assert.deepEqual(wire[1].patch, merchant.patch);
  assert.equal(writes[0].length, 3); // Persist; no two-minute expiry.
  assert.deepEqual(f.commands.filter(row => row[0] === 'del').map(row => row[1]), ['store-config:own-a', 'store-config:own-b', 'store-config-db:own']);
  assert.equal(f.redis.isOpen, false);
  assert.equal(JSON.stringify(f.commands).includes('private-password'), false);
  assert.deepEqual(f.reads[0].filter, { _id: 'saved-search-rules', enabled: true, searchOrigin: 'https://api.semantix-ai.com' });
});

test('removing the last layout publishes an empty snapshot and invalidates cached legacy pins', async () => {
  const f = fixture();
  assert.equal(await publishSearchRulesToRedis(f.client, 'own', { connect: f.connect, env: {} }), true);
  assert.deepEqual(f.commands.filter(row => row[0] === 'set').map(row => row[2]), ['[]', '[]']);
  assert.equal(f.commands.at(-1)[0], 'unlock');
});

test('unconfigured and failed connections never claim publication or expose credentials', async () => {
  const f = fixture();
  assert.equal(await publishSearchRulesToRedis(f.client, 'own', { env: { SEARCH_RULES_REDIS_URL: 'https://invalid.test' }, connect: f.connect }), false);
  assert.equal(f.connections.length, 0);
  f.redis.connect = async () => { throw Error('private-password'); };
  assert.equal(await publishSearchRulesToRedis(f.client, 'own', { connect: f.connect, env: {} }), false);
  assert.equal(f.commands.filter(row => row[0] === 'set').length, 0);
});

test('failed atomic publication does not report success', async () => {
  const f = fixture();
  f.redis.multi = () => ({ set() { return this; }, del() { return this; }, async exec() { throw Error('offline'); } });
  assert.equal(await publishSearchRulesToRedis(f.client, 'own', { connect: f.connect, env: {} }), false);
  assert.equal(f.redis.isOpen, false);
});

test('a stalled connection times out without allowing late publication', async () => {
  const f = fixture();
  let finish;
  f.redis.connect = () => new Promise(resolve => { finish = resolve; });
  const result = await publishSearchRulesToRedis(f.client, 'own', { connect: f.connect, env: {}, timeoutMs: 20 });
  assert.equal(result, false);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.commands.filter(row => row[0] === 'set').length, 0);
  assert.equal(f.redis.isOpen, false);
});
