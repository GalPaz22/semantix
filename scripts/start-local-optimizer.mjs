import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { mkdirSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = dirname(root);
const logDir = join(tmpdir(), 'semantix-local');
mkdirSync(logDir, { recursive: true });
const children = [];
const listening = port => new Promise(done => {
  const socket = createConnection({ host: '127.0.0.1', port });
  let settled = false;
  const finish = value => { if (settled) return; settled = true; socket.destroy(); done(value); };
  socket.once('connect', () => finish(true));
  socket.once('error', () => finish(false));
  socket.setTimeout(1000, () => finish(false));
});
const services = [
  { name: 'Redis', port: 6379, cmd: 'redis-server', args: ['--bind', '127.0.0.1', '--port', '6379', '--save', '', '--appendonly', 'no'], cwd: root },
  { name: 'Search', port: 8080, cmd: process.execPath, args: ['server.js'], cwd: join(desktop, 'dashboard-server'), env: { PORT: '8080', REDIS_URL: 'redis://127.0.0.1:6379', SKIP_INDEX_ENSURE: '1' } },
  { name: 'Reprocess', port: 3001, cmd: process.execPath, args: ['server.js'], cwd: join(desktop, 'onboarding-render'), env: { PORT: '3001', ENABLE_CRONS: 'false' } },
  { name: 'Optimizer', port: 4400, cmd: 'npm', args: ['run', 'dev'], cwd: join(desktop, 'search-optimizer'), env: { SEARCH_SERVICE_URL: 'http://127.0.0.1:8080', REPROCESS_SERVICE_URL: 'http://127.0.0.1:3001', REDIS_URL: 'redis://127.0.0.1:6379', ENABLE_CRONS: 'false' } },
];
for (const service of services) {
  let running = await listening(service.port);
  // A watched optimizer briefly releases its port while loading changed sources.
  if (!running && service.name === 'Optimizer') {
    for (let attempt = 0; attempt < 5 && !running; attempt++) {
      await new Promise(done => setTimeout(done, 1000));
      running = await listening(service.port);
    }
  }
  if (running) { console.log(`${service.name}: already running on ${service.port}`); continue; }
  const log = openSync(join(logDir, `${service.name.toLowerCase()}.log`), 'a');
  const child = spawn(service.cmd, service.args, { cwd: service.cwd, env: { ...process.env, ...service.env }, stdio: ['ignore', log, log] });
  children.push(child);
  child.once('error', error => { console.error(`${service.name}: ${error.message}`); process.exitCode = 1; });
  child.once('exit', code => { if (code) console.error(`${service.name} stopped (${code}); see ${logDir}`); });
  console.log(`${service.name}: starting on ${service.port}`);
}
console.log(`Local services configured. Logs: ${logDir}`);
console.log('Start the dashboard separately with npm run dev, then open http://localhost:3000/dashboard');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000).unref();
});
