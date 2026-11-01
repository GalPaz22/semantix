import { writeFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import nextEnv from '@next/env';
import { readTakeoverAnalytics } from '../lib/takeover-analytics.js';

nextEnv.loadEnvConfig(process.cwd());
const output = process.argv.find(a => a.startsWith('--output='))?.slice(9);
const client = new MongoClient(process.env.MONGODB_URI, { appName: 'takeover-dashboard-readiness', serverSelectionTimeoutMS: 10000, maxPoolSize: 3, retryWrites: false });
try {
  await client.connect();
  const started = Date.now();
  const report = await readTakeoverAnalytics(client, 'steimatzky', { useCache: false });
  for (const arm of Object.values(report.groups)) if (arm.cartRate != null && (arm.cartRate < 0 || arm.cartRate > 1)) throw Error('Invalid cart rate');
  if (output) await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, durationMs: Date.now() - started, revision: report.experiment.revision, split: report.experiment.configuredSplit, window: report.window, measurement: report.measurement, groups: report.groups }));
} finally { await client.close(); }
