import test from 'node:test';
import assert from 'node:assert/strict';
import { usesLocalOptimizer, waitForOptimizer } from '../scripts/local-optimizer-health.mjs';

test('local startup is restricted to the configured loopback optimizer, never remote deployments', () => {
  for (const url of ['http://127.0.0.1:4400', 'http://localhost:4400', 'http://[::1]:4400']) assert.equal(usesLocalOptimizer(url), true);
  for (const url of ['https://optimizer.example.com', 'http://localhost:5000', 'http://localhost.evil:4400', 'http://user:secret@localhost:4400', 'bad-url']) assert.equal(usesLocalOptimizer(url), false);
});
test('startup waits through connection failures and unavailable MongoDB before allowing the dashboard to start', async () => {
  let attempts = 0;
  await waitForOptimizer('http://127.0.0.1:4400', { timeoutMs: 2000, intervalMs: 1, fetchHealth: async url => {
    assert.equal(String(url), 'http://127.0.0.1:4400/api/health'); attempts++;
    if (attempts === 1) throw Error('connection refused');
    return { ok: true, json: async () => ({ ok: true, services: { mongodb: { connected: attempts >= 3 } } }) };
  } });
  assert.equal(attempts, 3);
});
test('unready services fail startup explicitly instead of opening a broken dashboard', async () => {
  await assert.rejects(waitForOptimizer('http://127.0.0.1:4400', { timeoutMs: 10, intervalMs: 1, fetchHealth: async () => ({ ok: false }) }), /did not become ready/);
});
