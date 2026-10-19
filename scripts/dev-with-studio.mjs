import { spawn } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { optimizerServiceConfig } from '../lib/optimizer-config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
nextEnv.loadEnvConfig(root, true);
const children = new Set(); let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); process.exitCode = code; }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
function launch(args, cwd = root, env = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' }); children.add(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { children.delete(child); if (!stopping) stop(code || 0); }); return child;
}
try {
  const config = optimizerServiceConfig({ ...process.env, NODE_ENV: 'development' }), url = new URL(config.endpoint);
  const health = async () => { try { const result = await fetch(new URL(`${config.prefix}/health`, url), { headers: config.headers, signal: AbortSignal.timeout(3000) }); return result.ok && (await result.json()).engine === 'tenant-studio'; } catch { return false; } };
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !(await health())) {
    launch(['server.mjs'], join(dirname(root), 'tenant-studio'), { STUDIO_PORT: url.port || '4320' });
    const deadline = Date.now() + 45000;
    while (!stopping && Date.now() < deadline && !(await health())) await new Promise(done => setTimeout(done, 1000));
    if (stopping || !(await health())) throw Error('Local Tenant Studio is not ready. Restart Studio with the updated dashboard code and matching customer token.');
  }
  if (!stopping) launch(['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)]);
} catch (error) { console.error(error.message); stop(1); }
