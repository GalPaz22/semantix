import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMerchandisingRules } from '../lib/merchandising-config.js';
const id = '1234567890abcdef12345678';
const rule = (extra = {}) => ({ query: '  שעון  לנשים, VENU, venu ', productIds: [id, id], enabled: true, ...extra });
test('admin-style grouped phrases are normalized and product order is preserved', () => {
  assert.deepEqual(normalizeMerchandisingRules([rule()]), [{ query: 'שעון לנשים, venu', productIds: [id], enabled: true }]);
});
test('invalid identities, query collisions and unbounded rule sets are rejected', () => {
  for (const input of [[rule({productIds:['foreign-product']})], [rule({enabled:'true'})], [rule({query:''})], [rule(),rule()], Array(101).fill(rule()), [rule({productIds:Array(21).fill(id)})]]) assert.throws(() => normalizeMerchandisingRules(input));
});
test('existing exact rules keep their identity and cannot expand silently to several phrases', () => {
  assert.deepEqual(normalizeMerchandisingRules([rule({ruleId:id,query:' Venu '})])[0], {ruleId:id,matchType:'exact',query:'venu',productIds:[id],enabled:true});
  assert.throws(() => normalizeMerchandisingRules([rule({ruleId:id})]));
  assert.throws(() => normalizeMerchandisingRules([rule({ruleId:'not-an-id',query:'venu'})]));
});
