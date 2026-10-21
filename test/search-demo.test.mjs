import test from 'node:test';import assert from 'node:assert/strict';
import {moveDemoProduct,searchDemoBody} from '../lib/search-demo.js';import {optimizerRouteAllowed} from '../lib/optimizer-access.js';
const rows=[{_id:'1'},{_id:'2'},{_id:'3'}];
test('result order is stable, original results are not mutated and restores do not remain excluded',()=>{
 const moved=moveDemoProduct(rows,2,0);assert.deepEqual(moved.map(x=>x._id),['3','1','2']);assert.deepEqual(rows.map(x=>x._id),['1','2','3']);
 const data=searchDemoBody({query:'original query',revision:'version'},moved,[rows[1],{_id:'4'},{_id:'4'}]);assert.deepEqual(data.productIds,['3','1','2']);assert.deepEqual(data.excludedProductIds,['4']);assert.equal(data.query,'original query');
 assert.throws(()=>searchDemoBody({query:'x'},[{name:'unresolved'}],[]));assert.throws(()=>searchDemoBody({query:'x'},[rows[0],rows[0]],[]));
});
test('demo writes only its scoped layout operation',()=>{assert.equal(optimizerRouteAllowed('PUT','dashboard/search-layout'),true);assert.equal(optimizerRouteAllowed('GET','dashboard/search-layout'),false);assert.equal(optimizerRouteAllowed('PUT','dashboard/search-layout/foreign'),false);});
