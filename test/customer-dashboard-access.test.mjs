import test from 'node:test';
import assert from 'node:assert/strict';
import { customerDashboardAccess, customerDashboardOperationAllowed, assertCustomerWorkspaceWritable } from '../lib/customer-dashboard-access.js';

test('Shipi locks chatbot tools, including direct reads, mutations and streams', () => {
  assert.deepEqual(customerDashboardAccess('shipi'), { mode: 'standard', lockedPanels: ['agent'] });
  for (const [method, path] of [
    ['GET', 'agent/runs'], ['GET', 'agent/runs/012345678901234567890123/stream'],
    ['POST', 'agent/run'], ['POST', 'agent/runs/012345678901234567890123/stop'],
    ['GET', 'concierge/settings'], ['PUT', 'concierge/settings'], ['GET', 'concierge/conversations'],
  ]) assert.equal(customerDashboardOperationAllowed('shipi', method, path), false, `${method} ${path}`);
});

test('Shipi keeps analytics, products, campaigns and search tools available; other stores keep their policy', () => {
  for (const [method, path] of [
    ['GET', 'dashboard'], ['GET', 'dashboard/products'], ['GET', 'dashboard/campaigns'],
    ['GET', 'optimization/weekly-review'], ['POST', 'dashboard/search'], ['PUT', 'dashboard/pins'],
  ]) assert.equal(customerDashboardOperationAllowed('shipi', method, path), true);
  assert.doesNotThrow(() => assertCustomerWorkspaceWritable('shipi'));
  assert.equal(customerDashboardOperationAllowed('manoVino', 'POST', 'agent/run'), true);
  assert.equal(customerDashboardOperationAllowed('rikushet', 'POST', 'agent/run'), false);
  assert.equal(customerDashboardOperationAllowed('steimatzky', 'GET', 'dashboard'), true);
});
