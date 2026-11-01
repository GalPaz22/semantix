import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { getProductPromotionCampaigns } from '../lib/product-promotion-campaigns.js';

const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const store = process.argv.find(arg => arg.startsWith('--store='))?.slice(8) || 'manoVino';
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
let client;
try {
  if (!process.env.MONGODB_URI) throw Error('MONGODB_URI is required');
  client = await MongoClient.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  if (!await client.db('users').collection('users').findOne({ dbName: store }, { projection: { _id: 1 } })) throw Error('Store is not connected');
  const campaigns = await getProductPromotionCampaigns(client, store);
  const report = { store, generatedAt: new Date().toISOString(),
    method: 'Recorded product activity in equal-duration windows before application and after application (latest seven days at most). Includes direct traffic; no causal attribution or verified payment claim.',
    campaigns };
  const json = JSON.stringify(report, null, 2);
  if (output) { await writeFile(output, json + '\n'); console.log(`Saved ${campaigns.length} promotion campaigns to ${output}`); }
  else console.log(json);
} catch (error) {
  // Connection/provider errors may contain credentials; keep terminal output safe.
  console.error(['Store is not connected', 'MONGODB_URI is required'].includes(error.message) ? error.message : 'Unable to read product promotion activity');
  process.exitCode = 1;
} finally { await client?.close(); }
