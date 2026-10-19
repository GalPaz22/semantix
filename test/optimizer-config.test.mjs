import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizerServiceConfig } from '../lib/optimizer-config.js';
test('production needs a remote HTTPS optimizer and its authentication secret', () => {
  for (const url of [undefined, 'http://127.0.0.1:4400', 'https://localhost:4400', 'http://optimizer.example.com', 'https://user:secret@optimizer.example.com']) {
    assert.throws(() => optimizerServiceConfig({ NODE_ENV: 'production', OPTIMIZER_SERVICE_URL: url, OPTIMIZER_OPS_PASSWORD: 'configured' }), { status: 503 });
  }
  assert.throws(() => optimizerServiceConfig({ NODE_ENV: 'production', OPTIMIZER_SERVICE_URL: 'https://optimizer.example.com' }), { status: 503 });
  assert.equal(optimizerServiceConfig({ NODE_ENV: 'production', OPTIMIZER_SERVICE_URL: 'https://optimizer.example.com', OPTIMIZER_OPS_PASSWORD: 'configured' }).endpoint, 'https://optimizer.example.com');
});
test('development retains its local service default', () => {
  assert.equal(optimizerServiceConfig({ NODE_ENV: 'development' }).endpoint, 'http://127.0.0.1:4400');
});
