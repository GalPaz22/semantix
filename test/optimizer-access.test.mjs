import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizerRouteAllowed, ownershipFilter, publicOptimizerData } from '../lib/optimizer-access.js';
const id='1234567890abcdef12345678';
test('proxy accepts scoped dashboard operations and rejects arbitrary admin and traversal paths',()=>{
  assert.equal(optimizerRouteAllowed('GET','dashboard'),true);
  assert.equal(optimizerRouteAllowed('PUT','dashboard/pins'),true);
  assert.equal(optimizerRouteAllowed('GET','dashboard/products'),true);
  assert.equal(optimizerRouteAllowed('PUT','dashboard/products/visibility'),true);
  assert.equal(optimizerRouteAllowed('POST','dashboard/products/visibility'),false);
  assert.equal(optimizerRouteAllowed('POST',`optimization/actions/${id}/execute`),true);
  assert.equal(optimizerRouteAllowed('POST',`agent/runs/${id}/stop`),true);
  assert.equal(optimizerRouteAllowed('GET','optimization/weekly-review'),true);
  assert.equal(optimizerRouteAllowed('POST','optimization/weekly-review'),true);
  assert.equal(optimizerRouteAllowed('DELETE','optimization/weekly-review'),false);
  assert.equal(optimizerRouteAllowed('GET','optimization/plans'),true);
  assert.equal(optimizerRouteAllowed('POST','optimization/plans'),false);
  for(const path of ['tenants','debug/republish','../tenants','optimization/actions/not-an-id/execute','rules/x/enable','agent/runs','dashboard/catalog/extra']) assert.equal(optimizerRouteAllowed('POST',path),false,path);
  assert.equal(optimizerRouteAllowed('GET','tenants'),false);
  assert.equal(optimizerRouteAllowed('DELETE','optimization/policy'),false);
});
test('ownership check includes the current store and its sibling keys only',()=>{
  const filter=ownershipFilter('store-a',['key-a','key-a-2']);
  assert.deepEqual(filter,{$or:[{dbName:'store-a'},{'draftExperiment.dbName':'store-a'},{'draftRule.dbName':'store-a'},{tenantApiKey:{$in:['key-a','key-a-2']}}]});
});
test('API keys and internal repair fingerprints never appear in nested browser data',()=>{
  const input={report:{tenantApiKey:'secret',dbName:'store-a',queries:[]},actions:[{apiKey:'secret',fingerprints:{id:'hash'},selectedProducts:[{id:42,name:'יין'}],draft:{tenantApiKey:'secret'}}]};
  const result=publicOptimizerData(input);
  assert.deepEqual(result,{report:{dbName:'store-a',queries:[]},actions:[{selectedProducts:[{id:42,name:'יין'}],draft:{}}]});
  assert.equal(input.report.tenantApiKey,'secret');
});
test('manual boost operation is available only as a store-scoped PUT', () => {
  assert.equal(optimizerRouteAllowed('PUT', 'dashboard/products/boost'), true);
  for (const method of ['GET', 'POST', 'DELETE']) assert.equal(optimizerRouteAllowed(method, 'dashboard/products/boost'), false);
});
test('arrangement supports scoped reads and saves without exposing internal publication operations', () => {
  assert.equal(optimizerRouteAllowed('GET', 'dashboard/merchandising'), true);
  assert.equal(optimizerRouteAllowed('PUT', 'dashboard/merchandising'), true);
  assert.equal(optimizerRouteAllowed('POST', 'dashboard/merchandising'), false);
  assert.equal(optimizerRouteAllowed('POST', 'dashboard/merchandising/publish'), false);
});
