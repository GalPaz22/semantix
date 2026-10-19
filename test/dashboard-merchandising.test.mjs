import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { getDashboardMerchandising, saveDashboardMerchandising } from '../lib/dashboard-merchandising.js';
const id = n => new ObjectId(n.toString(16).padStart(24, '0'));
const clone = value => value instanceof ObjectId ? new ObjectId(value) : value instanceof Date ? new Date(value) : Array.isArray(value) ? value.map(clone) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const equal = (a, b) => a instanceof ObjectId || b instanceof ObjectId ? String(a) === String(b) : a === b;
const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === '$or') return value.some(option => matches(row, option));
  if (value && typeof value === 'object' && !(value instanceof ObjectId)) {
    if ('$type' in value) return typeof row[key] === value.$type;
    if ('$in' in value) return value.$in.some(item => equal(row[key], item));
  }
  return equal(row[key], value);
});
const setPath = (row, path, value, remove = false) => {
  const keys = path.split('.'), leaf = keys.pop(); let target = row;
  for (const key of keys) target = target[key] ||= {};
  if (remove) delete target[leaf]; else target[leaf] = clone(value);
};
function fixture() {
  let data = {
    'users.users': [{ _id: id(1), dbName: 'store-a', platform: 'woocommerce', credentials: { pinnedResults: [{ query: 'watch, שעון', productIds: [String(id(10))], enabled: true }] } }, { _id: id(2), dbName: 'store-a', credentials: { pinnedResults: [] } }, { _id: id(3), dbName: 'store-b', credentials: { pinnedResults: [] } }],
    'control_plane.rules': [{ _id: id(20), dbName: 'store-a', merchantQuery: 'venu', patch: { pinnedResults: [{ productIds: ['102'] }] }, status: 'active' }, { _id: id(21), dbName: 'store-a', name: 'Agent rule', status: 'active' }, { _id: id(22), dbName: 'store-b', merchantQuery: 'private', patch: {}, status: 'active' }],
    'store-a.products': [{ _id: id(10), id: 101, name: 'Watch A', image: 'https://example.com/a.png' }, { _id: id(11), id: 102, name: 'Watch B' }],
    'control_plane.catalog_change_audits': [],
  };
  let failAudit = false;
  const mutate = (key, filter, update, many) => {
    let n = 0;
    for (const row of data[key]) if (matches(row, filter) && (many || !n)) {
      for (const [path, value] of Object.entries(update.$set || {})) setPath(row, path, value);
      for (const path of Object.keys(update.$unset || {})) setPath(row, path, null, true);
      n++;
    }
    return { matchedCount: n };
  };
  const client = { db: name => ({ collection: collection => {
    const key = `${name}.${collection}`; data[key] ||= [];
    return {
      find: filter => ({ sort() { return this; }, async toArray() { return clone(data[key].filter(row => matches(row, filter))); } }),
      updateMany: async (filter, update) => mutate(key, filter, update, true),
      updateOne: async (filter, update) => mutate(key, filter, update, false),
      deleteMany: async filter => { data[key] = data[key].filter(row => !matches(row, filter)); },
      insertOne: async row => { if (failAudit && collection === 'catalog_change_audits') throw Error('Audit unavailable'); data[key].push(clone(row)); },
    };
  } }), startSession: () => ({ async withTransaction(run) { const before = clone(data); try { return await run(); } catch (error) { data = before; throw error; } }, async endSession() {} }) };
  return { client, get data() { return data; }, failAudit: () => { failAudit = true; } };
}
test('arrangement loads both admin and previous dashboard rules, hydrated with store-owned catalog documents', async () => {
  const f = fixture(), result = await getDashboardMerchandising(f.client, 'store-a');
  assert.equal(result.pinnedResults.length, 2); assert.equal(result.revision.length, 64);
  assert.equal(result.pinnedResults[1].ruleId, String(id(20)));
  assert.deepEqual(result.pinnedResults[1].productIds, [String(id(11))]);
  assert.equal(result.pinnedResults[1].products[0].name, 'Watch B');
  assert.ok(!JSON.stringify(result).includes('private'));
});
test('one save synchronizes admin rules across store accounts, retains exact-rule identities, and leaves agent and other-store rules alone', async () => {
  const f = fixture(), initial = await getDashboardMerchandising(f.client, 'store-a');
  initial.pinnedResults[0].productIds = [String(id(11)), String(id(10))];
  initial.pinnedResults[0].products = [{ _id: String(id(11)), name: 'Untrusted name' }];
  initial.pinnedResults[1].enabled = false;
  await saveDashboardMerchandising(f.client, { dbName: 'store-a', actor: 'owner', body: initial });
  const users = f.data['users.users']; assert.deepEqual(users[0].credentials.pinnedResults, users[1].credentials.pinnedResults);
  assert.equal(users[0].credentials.pinnedResults[0].products[0].name, 'Watch B');
  assert.deepEqual(users[2].credentials.pinnedResults, []);
  assert.equal(f.data['control_plane.rules'].find(rule => String(rule._id) === String(id(20))).status, 'disabled');
  assert.equal(f.data['control_plane.rules'].find(rule => String(rule._id) === String(id(21))).name, 'Agent rule');
  assert.equal(f.data['control_plane.rules'].find(rule => String(rule._id) === String(id(22))).merchantQuery, 'private');
  assert.equal(f.data['control_plane.catalog_change_audits'][0].appliedBy, 'owner');
});
test('stale versions and foreign rule or product identities fail before any saved changes', async () => {
  for (const kind of ['stale', 'rule', 'product']) {
    const f = fixture(), initial = await getDashboardMerchandising(f.client, 'store-a');
    if (kind === 'stale') initial.revision = '0'.repeat(64);
    if (kind === 'rule') initial.pinnedResults[1].ruleId = String(id(22));
    if (kind === 'product') initial.pinnedResults[0].productIds = [String(id(999))];
    const before = clone(f.data);
    await assert.rejects(saveDashboardMerchandising(f.client, { dbName: 'store-a', actor: 'owner', body: initial }));
    assert.deepEqual(f.data, before);
  }
});
test('an audit failure rolls back the whole multi-collection save', async () => {
  const f = fixture(), initial = await getDashboardMerchandising(f.client, 'store-a'), before = clone(f.data);
  initial.pinnedResults = []; f.failAudit();
  await assert.rejects(saveDashboardMerchandising(f.client, { dbName: 'store-a', actor: 'owner', body: initial }), /Audit unavailable/);
  assert.deepEqual(f.data, before);
});
test('shared accounts carrying credentials from another store retain their original pins', async () => {
  const f = fixture();
  f.data['users.users'].push({ _id: id(4), dbName: 'store-a', credentials: { dbName: 'store-b', pinnedResults: [{ query: 'other store', productIds: [] }] } });
  const original = clone(f.data['users.users'][3]);
  const initial = await getDashboardMerchandising(f.client, 'store-a');
  initial.pinnedResults = [];
  await saveDashboardMerchandising(f.client, { dbName: 'store-a', actor: 'owner', body: initial });
  assert.deepEqual(f.data['users.users'][3], original);
  assert.deepEqual(f.data['users.users'][0].credentials.pinnedResults, []);
});
