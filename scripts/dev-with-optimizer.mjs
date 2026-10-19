import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { usesLocalOptimizer, waitForOptimizer } from './local-optimizer-health.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
nextEnv.loadEnvConfig(root, true);
const children = new Set();
let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  const timer = setTimeout(() => process.exit(code), 1500);
  timer.unref();
  process.exitCode = code;
};
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
function launch(args, { required = true } = {}) {
  const child = spawn(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit' });
  children.add(child);
  child.once('error', error => { console.error(error.message); stop(1); });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!stopping && (required || signal || code !== 0)) stop(signal ? 1 : code || 0);
  });
  return child;
}
try {
  const serviceUrl = process.env.OPTIMIZER_SERVICE_URL || 'http://127.0.0.1:4400';
  if (usesLocalOptimizer(serviceUrl)) {
    // Reusing all services is a successful one-shot launcher run.
    launch(['scripts/start-local-optimizer.mjs'], { required: false });
    console.log('Preparing local dashboard services…');
    await waitForOptimizer(serviceUrl);
  }
  if (!stopping) launch(['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)]);
} catch (error) {
  console.error(error.message);
  stop(1);
}
