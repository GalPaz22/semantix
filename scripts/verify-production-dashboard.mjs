import { createRequire } from 'node:module';
import { MongoClient } from 'mongodb';
import { optimizerServiceConfig } from '../lib/optimizer-config.js';
import { headlineConversion } from '../lib/dashboard-analytics.js';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const store = process.argv.find(arg => arg.startsWith('--store='))?.slice(8) || 'manoVino';
let client;
try {
  const config = optimizerServiceConfig({ ...process.env, NODE_ENV: 'production' });
  if (!process.env.MONGODB_URI) throw Error('MONGODB_URI is required');
  client = await MongoClient.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const account = await client.db('users').collection('users').findOne({ dbName: store }, { projection: { dbName: 1 } });
  if (!account) throw Error('Store is not connected');
  const read = async (path, authenticated = true) => {
    const url = new URL(`${config.prefix}/${path}`, config.endpoint);
    if (authenticated) url.searchParams.set('dbName', account.dbName);
    const response = await fetch(url, { headers: config.headers, signal: AbortSignal.timeout(60000), redirect: 'error' });
    if (!response.ok) throw Error(`Readiness check failed for ${path}: HTTP ${response.status}`);
    return response.json();
  };
  const health = await read('health');
  if (!health.ok || health.engine !== 'tenant-studio') throw Error('Production dependencies are not ready');
  const unauthenticated = await fetch(new URL(`${config.prefix}/dashboard`, config.endpoint), { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (unauthenticated.status !== 401) throw Error('Studio dashboard authentication is not enforced');
  const dashboard = await read('dashboard');
  if (dashboard.store?.dbName !== store || dashboard.report?.dbName !== store) throw Error('Dashboard store scope mismatch');
  const products = await read('dashboard/products');
  if (!Array.isArray(products.products) || products.stats?.total !== dashboard.report.catalog?.products) throw Error('Catalog and analytics do not agree');
  const runs = await read('agent/runs');
  if (!Array.isArray(runs)) throw Error('Conversation history is unavailable');
  const conversion = headlineConversion(dashboard.report);
  console.log(JSON.stringify({ ready: true, store, endpoint: config.endpoint, generatedAt: dashboard.report.generatedAt, catalog: dashboard.report.catalog, searchSessions: dashboard.report.funnel.sessions.searched, headline: conversion ? { label: conversion.label, sessions: conversion.count, percent: +(conversion.rate * 100).toFixed(1) } : null, conversationHistory: true, tracking: dashboard.report.tracking.map(issue => issue.code) }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await client?.close(); }
