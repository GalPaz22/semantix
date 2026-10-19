import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizerServiceConfig } from '../lib/optimizer-config.js';
test('production connects directly to Studio with its server-only customer token', () => {
  const config = optimizerServiceConfig({ NODE_ENV: 'production', STUDIO_CUSTOMER_API_TOKEN: 'private' });
  assert.equal(config.endpoint, 'https://tenant-studio.onrender.com');
  assert.equal(config.prefix, '/api/customer-dashboard');
  assert.deepEqual(config.headers, { 'X-Studio-Customer-Token': 'private' });
  assert.equal(config.password, undefined);
  for (const url of ['bad-url', 'http://127.0.0.1:4320', 'https://localhost:4320', 'http://studio.example.com', 'https://user:secret@studio.example.com']) {
    assert.throws(() => optimizerServiceConfig({ NODE_ENV: 'production', STUDIO_SERVICE_URL: url, STUDIO_CUSTOMER_API_TOKEN: 'private' }), { status: 503 });
  }
  assert.throws(() => optimizerServiceConfig({ NODE_ENV: 'production', OPTIMIZER_SERVICE_URL: 'https://legacy.example.com', OPTIMIZER_OPS_PASSWORD: 'legacy' }), { status: 503 });
  assert.equal(optimizerServiceConfig({ NODE_ENV: 'production', STUDIO_SERVICE_URL: 'https://studio.example.com', STUDIO_CUSTOMER_API_TOKEN: 'private' }).endpoint, 'https://studio.example.com');
});
test('development uses local Studio and still requires customer authentication', () => {
  assert.equal(optimizerServiceConfig({ NODE_ENV: 'development', STUDIO_CUSTOMER_API_TOKEN: 'private' }).endpoint, 'http://127.0.0.1:4320');
  assert.throws(() => optimizerServiceConfig({ NODE_ENV: 'development' }), { status: 503 });
});
