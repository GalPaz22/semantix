import { writeFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import nextEnv from '@next/env';
import { readTakeoverAnalytics } from '../lib/takeover-analytics.js';
nextEnv.loadEnvConfig(process.cwd());
const uri = process.env.STUDIO_DASHBOARD_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) throw Error('MONGODB_URI is required');
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 4, retryWrites: false });
const date = process.argv.find(a => a.startsWith('--at='))?.slice(5), output = process.argv.find(a => a.startsWith('--output='))?.slice(9);
try {
  await client.connect(); const started = Date.now();
  const report = await readTakeoverAnalytics(client, 'rikushet', { useCache: false, ...(date ? { now: new Date(date) } : {}) });
  if (report.purchases?.version !== 'exact-product-same-visit-24h-v1' || !report.purchases.complete) throw Error('Exact-product purchase measurement is incomplete');
  if (output) await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ verified: true, ms: Date.now() - started, revision: report.experiment.revision, split: report.experiment.configuredSplit,
    observedUntil: report.generatedAt, groups: report.purchases.groups, typed: report.purchases.typed, totals: report.purchases.totals, coverage: report.purchases.coverage, diagnostics: report.purchases.diagnostics }, null, 2));
} finally { await client.close(); }
