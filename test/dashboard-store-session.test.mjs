import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { getDashboardStoreBySession } from '../lib/getDashboardStoreBySession.js';

const id = n => new ObjectId(n.toString(16).padStart(24, '0'));
function fixture(rows) {
  const reads = [];
  return { reads, collection(name) {
    assert.equal(name, 'users');
    return { async findOne(query, options = {}) {
      reads.push({ query, options });
      const matches = rows.filter(row => Object.entries(query).every(([key, expected]) => {
        if (expected instanceof ObjectId) return row[key]?.equals(expected);
        if (expected && typeof expected === 'object') return typeof row[key] === expected.$type && row[key] !== expected.$ne;
        return row[key] === expected;
      }));
      if (options.sort) matches.sort((a, b) => Number(Boolean(b.platform)) - Number(Boolean(a.platform)) || String(a._id).localeCompare(String(b._id)));
      return matches[0] || null;
    } };
  } };
}

test('password login resolves its stored dbName without requiring any API key', async () => {
  const db = fixture([
    { _id: id(1), username: 'beautics', dbName: 'store-a', credentials: { dbName: 'store-a' } },
    { _id: id(2), dbName: 'store-a', apiKey: 'secondary-key' },
    { _id: id(3), dbName: 'store-b', platform: 'woocommerce', apiKey: 'other-store-secret' },
    { _id: id(4), dbName: 'store-a', platform: 'woocommerce', apiKey: 'store-a-key' },
  ]);
  const store = await getDashboardStoreBySession(db, { id: String(id(1)), email: 'beautics@internal.semantix', dbName: 'store-b', apiKey: 'other-store-secret' });
  assert.deepEqual(store, { dbName: 'store-a' });
  assert.equal(db.reads.length, 1);
});

test('Google and password accounts return only dbName, never their API key', async () => {
  for (const identity of [{ id: String(id(1)), email: 'merchant@internal.semantix' }, { email: 'owner@example.com' }]) {
    const db = fixture([
      { _id: id(1), email: 'owner@example.com', dbName: 'store-a', apiKey: 'original-key' },
      { _id: id(2), dbName: 'store-a', platform: 'shopify', apiKey: 'platform-key' },
    ]);
    assert.deepEqual(await getDashboardStoreBySession(db, identity), { dbName: 'store-a' });
    assert.equal(db.reads.length, 1);
  }
});

test('legacy nested assignment resolves without changing stored records', async () => {
  const rows = [
    { _id: id(1), email: 'owner@example.com', credentials: { dbName: 'store-a' } },
    { _id: id(2), dbName: 'store-a', apiKey: 'store-a-key' },
  ];
  const before = structuredClone(rows);
  assert.deepEqual(await getDashboardStoreBySession(fixture(rows), { email: 'owner@example.com' }), { dbName: 'store-a' });
  assert.deepEqual(structuredClone(rows), before);
});

test('top-level assignment takes precedence over old credentials for another store', async () => {
  const db = fixture([
    { _id: id(1), username: 'merchant', dbName: 'store-a', credentials: { dbName: 'store-b' } },
    { _id: id(2), dbName: 'store-a', apiKey: 'store-a-key' },
    { _id: id(3), dbName: 'store-b', platform: 'shopify', apiKey: 'other-store-secret' },
  ]);
  assert.deepEqual(await getDashboardStoreBySession(db, { id: String(id(1)) }), { dbName: 'store-a' });
});

test('assigned accounts can open their dashboard even when no store account has an API key', async () => {
  const db = fixture([
    { _id: id(1), username: 'merchant', dbName: 'unconnected-store' },
    { _id: id(2), dbName: 'unconnected-store', apiKey: '' },
    { _id: id(3), dbName: 'store-b', apiKey: 'other-store-secret' },
  ]);
  assert.deepEqual(await getDashboardStoreBySession(db, { id: String(id(1)) }), { dbName: 'unconnected-store' });
});

test('unknown and unassigned users cannot choose a store using session claims', async () => {
  for (const user of [null, { _id: id(1), username: 'unassigned' }]) {
    const db = fixture([...(user ? [user] : []), { _id: id(2), dbName: 'store-b', apiKey: 'other-store-secret' }]);
    assert.equal(await getDashboardStoreBySession(db, { id: String(id(1)), dbName: 'store-b', apiKey: 'other-store-secret' }), null);
    assert.ok(!db.reads.some(read => 'dbName' in read.query));
  }
});

test('old credentials sessions can still resolve their username when the ID is missing', async () => {
  const db = fixture([
    { _id: id(1), username: 'beautics', dbName: 'store-a' },
    { _id: id(2), dbName: 'store-a', apiKey: 'store-a-key' },
  ]);
  assert.deepEqual(await getDashboardStoreBySession(db, { email: 'beautics@internal.semantix' }), { dbName: 'store-a' });
});
