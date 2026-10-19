import test from 'node:test';
import assert from 'node:assert/strict';
import { readStudioJson } from '../lib/studio-response.js';
test('hosting restarts are upstream failures and never a customer Invalid JSON error', async () => {
  for (const [body, status, expected] of [['<html>Restarting</html>', 503, 503], ['', 502, 502], ['<html>Not JSON</html>', 200, 502]]) {
    await assert.rejects(readStudioJson(new Response(body, { status })), error => error.status === expected && !(error instanceof SyntaxError));
  }
});
test('valid Studio data and structured errors remain intact', async () => {
  assert.deepEqual(await readStudioJson(Response.json({ error: 'Unauthorized' }, { status: 401 })), { error: 'Unauthorized' });
  assert.deepEqual(await readStudioJson(Response.json([{ id: 'conversation' }])), [{ id: 'conversation' }]);
});
