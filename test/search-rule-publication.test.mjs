import test from 'node:test';
import assert from 'node:assert/strict';
import { publishSavedSearchRules, saveSharedPinnedResults } from '../lib/search-rule-publication.js';
const ack = { available: true, published: true, dbName: 'own', mode: 'search-mongo', revision: 'a'.repeat(64), propagationSeconds: 15 };
function fixture() {
  const calls = [], saves = [];
  const client = { db: name => ({ collection: collection => ({
    find(filter) { calls.push({name,collection,filter}); return { sort() { return this; }, async toArray() { return [
      {apiKey:'wrong',platform:'woocommerce',credentials:{dbName:'foreign'}},
      {apiKey:'tracking'}, {apiKey:'private-search',platform:'woocommerce',credentials:{dbName:'own'}},
    ]; } }; },
    async updateMany(filter, update) { saves.push({filter,update}); return {matchedCount:2}; },
  }) }) };
  return {client,calls,saves};
}
test('save publication authenticates to the public search engine and verifies its store acknowledgement', async () => {
  const f=fixture(), seen=[];
  const result=await publishSavedSearchRules(f.client,'own',{request:async(url,init)=>{seen.push({url,init});return Response.json(ack);}});
  assert.equal(result.published,true);assert.equal(seen[0].url.href,'https://api.semantix-ai.com/rules/publication');
  assert.equal(seen[0].init.headers['x-api-key'],'private-search');assert.equal(seen[0].init.body,undefined);assert.equal(seen[0].init.redirect,'error');
  assert.equal(JSON.stringify(result).includes('private-search'),false);assert.deepEqual(f.calls[0].filter,{dbName:'own'});
});
test('missing, wrong-store and malformed acknowledgements never claim successful publication', async () => {
  for(const data of [{...ack,dbName:'foreign'},{...ack,published:false},{...ack,mode:'studio-redis'},{...ack,revision:null},{...ack,propagationSeconds:300}]){
    assert.equal((await publishSavedSearchRules(fixture().client,'own',{request:async()=>Response.json(data)})).published,false);
  }
  assert.equal((await publishSavedSearchRules(fixture().client,'own',{request:async()=>new Response('',{status:404})})).published,false);
});
test('transient publication failures retry, but persistent failures preserve the saved state', async()=>{
  let attempts=0;const f=fixture();
  const result=await publishSavedSearchRules(f.client,'own',{request:async()=>++attempts===1?new Response('',{status:503}):Response.json(ack)});
  assert.equal(attempts,2);assert.equal(result.published,true);
  attempts=0;assert.equal((await publishSavedSearchRules(f.client,'own',{request:async()=>{attempts++;throw Error('timeout');}})).published,false);assert.equal(attempts,2);
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline');};
  try{const saved=await saveSharedPinnedResults(f.client,'own',[{query:'wine',productIds:['product'],enabled:true}]);assert.equal(saved.published,false);assert.equal(f.saves.length,1);
    assert.deepEqual(f.saves[0].filter,{dbName:'own',$or:[{'credentials.dbName':'own'},{'credentials.dbName':{$exists:false}}]});assert.equal(f.saves[0].update.$set['credentials.pinnedResults'][0].query,'wine');
  }finally{globalThis.fetch=original;}
});
test('production configuration cannot send the private store key over HTTP',async()=>{
  let sent=false;const result=await publishSavedSearchRules(fixture().client,'own',{env:{NODE_ENV:'production',SEARCH_SERVICE_URL:'http://example.test'},request:async()=>{sent=true;return Response.json(ack);}});assert.equal(result.published,false);assert.equal(sent,false);
});

test('older search deployments automatically use the existing Vercel-to-Studio publication connection', async()=>{
 const seen=[];const result=await publishSavedSearchRules(fixture().client,'own',{env:{NODE_ENV:'production',STUDIO_SERVICE_URL:'https://studio.example.test',STUDIO_CUSTOMER_API_TOKEN:'private-studio-token'},request:async(url,init)=>{seen.push({url,init});return url.pathname==='/rules/publication'?new Response('',{status:404}):Response.json({published:true});}});
 assert.equal(result.published,true);assert.equal(seen.length,2);assert.equal(seen[1].url.origin,'https://studio.example.test');assert.equal(seen[1].url.searchParams.get('dbName'),'own');assert.equal(seen[1].init.headers['X-Studio-Customer-Token'],'private-studio-token');assert.equal(seen[1].init.headers['x-api-key'],undefined);assert.equal(seen[1].init.body,undefined);assert.equal(seen[1].init.redirect,'error');
 const failed=await publishSavedSearchRules(fixture().client,'own',{env:{NODE_ENV:'production',STUDIO_SERVICE_URL:'https://studio.example.test',STUDIO_CUSTOMER_API_TOKEN:'token'},request:async url=>url.pathname==='/rules/publication'?new Response('',{status:404}):Response.json({published:false})});assert.equal(failed.published,false);
});

test('older engines automatically receive saved rules through the configured shared Redis connection', async()=>{
 const f=fixture(), calls=[];
 const result=await publishSavedSearchRules(f.client,'own',{
  request:async url=>{calls.push(url.pathname);return new Response('',{status:404});},
  publishRedis:async(client,dbName)=>{assert.equal(client,f.client);assert.equal(dbName,'own');return true;},
 });
 assert.equal(result.published,true);assert.match(result.message,/15/);assert.deepEqual(calls,['/rules/publication']);
});
