import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { MongoClient } from 'mongodb';
import { encode } from 'next-auth/jwt';
import { TAKEOVER_MEASUREMENT_START } from '../lib/takeover-measurement.js';
import nextEnv from '@next/env';

// A short-lived local QA session for an existing store record. No account or session record is written.
// Mutating API probes use bodies that cannot perform writes if the policy regresses.
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TAKEOVER_QA_URL || 'http://127.0.0.1:3134';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local QA URL required');
const output = process.env.TAKEOVER_QA_OUTPUT || '/tmp/takeover-qa';
await mkdir(output, { recursive: true });
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: 1, retryWrites: false });
let browser;
try {
  await client.connect();
  const user = await client.db('users').collection('users').findOne({ dbName: 'steimatzky' }, { projection: { _id: 1 }, maxTimeMS: 5000 });
  if (!user) throw Error('Steimatzky account missing');
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET, maxAge: 600, token: { sub: String(user._id), id: String(user._id), name: 'סטימצקי', email: 'takeover-qa@internal.semantix', isCredentialsUser: true, onboardingComplete: true, dbName: 'not-the-authority' } });
  const headers = { cookie: `next-auth.session-token=${token}` };
  const checks = [];
  async function expect(path, status, authenticated = true, init = {}) {
    const response = await fetch(base + path, { ...init, headers: { ...(authenticated ? headers : {}), ...init.headers }, redirect: 'error', signal: AbortSignal.timeout(60000) });
    assert.ok((Array.isArray(status) ? status : [status]).includes(response.status), `${init.method || 'GET'} ${path}: ${response.status}`);
    checks.push({ path, method: init.method || 'GET', status: response.status });
    return response.json();
  }
  await expect('/api/customer-dashboard/dashboard/ab-test', 401, false);
  const metadata = await expect('/api/customer-dashboard/dashboard?store=other-store', 200);
  assert.equal(metadata.store.dbName, 'steimatzky');
  assert.equal(metadata.access.mode, 'analytics-only');
  const live = await expect('/api/customer-dashboard/dashboard/ab-test', 200);
  assert.equal(live.experiment.key, 'semantix_takeover');
  assert.equal(live.window.from, TAKEOVER_MEASUREMENT_START);
  assert.equal(live.window.cohortFrom, TAKEOVER_MEASUREMENT_START);
  assert.equal(live.window.locked, true);
  assert.equal(live.measurement.cartSource, 'tracking_events:add_to_cart_confirmed');
  assert.equal(live.measurement.productAttribution, 'confirmed-search-product-v2');
  assert.ok(live.groups.semantix.addedProducts <= live.groups.semantix.clickedProducts);
  assert.ok(live.groups.native.addedProducts <= live.groups.native.clickedProducts);
  await expect('/api/customer-dashboard/dashboard/products', 423);
  await expect('/api/customer-dashboard/dashboard/catalog-sync', [404, 423]); // Unavailable tools may be absent from the deployed allowlist.
  await expect('/api/optimizer/dashboard/products', 423);
  await expect('/api/customer-dashboard/agent/run', 423, true, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  await expect('/api/customer-dashboard/dashboard/pins', 423, true, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{' });
  await expect('/api/pinned-results', 423, true, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  await expect('/api/api-key', 423);
  for (const query of ['days=90', 'days=1', 'days=14', 'from=2020-01-01', 'start=2020-01-01', 'to=2030-01-01']) await expect(`/api/customer-dashboard/dashboard/ab-test?${query}`, 400);
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage(), pageErrors = [], requests = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('request', request => { if (request.url().includes('/api/customer-dashboard/')) requests.push(new URL(request.url()).pathname); });
  await page.setCookie({ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' });
  await page.evaluateOnNewDocument(() => localStorage.setItem('cookieConsent', JSON.stringify({ necessary: true, analytics: false, marketing: false })));
  await page.setViewport({ width: 1440, height: 1060 });
  await page.goto(base + '/dashboard/client?panel=products', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForSelector('[data-testid="takeover-analytics"] table', { timeout: 60000 });
  assert.ok(page.url().includes('panel=analytics'), 'a locked deep link returns to analytics');
  const navigation = await page.$$eval('nav button', buttons => buttons.map(b => ({ text: b.textContent.trim(), disabled: b.disabled })));
  assert.equal(navigation.filter(b => b.disabled).length, 6);
  assert.equal(navigation.find(b => b.text === 'אנליטיקות').disabled, false);
  assert.ok(requests.every(p => ['/api/customer-dashboard/dashboard', '/api/customer-dashboard/dashboard/ab-test'].includes(p)), 'locked tools are never mounted or fetched');
  const text = await page.$eval('[data-testid="takeover-analytics"]', el => el.innerText);
  assert.ok(text.includes('החיפוש הקיים') && text.includes('שיעור הוספה מאושרת לסל מתוך המוצרים שהוקלקו'));
  assert.ok(text.includes('רכישות והכנסות אינן חלק מהמדדים'));
  assert.ok(text.includes('כיסוי הקישור') && text.includes('שם המוצר'));
  const main = await page.$eval('[data-testid=product-conversion-summary]', el => el.innerText);
  assert.ok(main.includes('המרת המוצר שהוקלק מהחיפוש') && main.includes('באישור החנות'));
  assert.ok(!main.includes('מבקרים') && !main.includes('גולשים'));
  assert.ok(text.includes('התקופה קבועה'));
  assert.ok(!text.includes('24 שעות') && !text.includes('14 ימים'));
  assert.ok(!text.includes('מחפשים שהגיעו לעגלה'));
  assert.ok(!text.includes('sku:') && !text.includes('online:iw:IL:'));
  for (const product of live.topProducts.filter(row => row.productName)) assert.ok(text.includes(product.productName));
  assert.ok(!text.includes('תקלה') && !text.includes('פאדיחה'));
  await page.screenshot({ path: output + '/takeover-preview.png', fullPage: false });
  await page.screenshot({ path: output + '/takeover-desktop.png', fullPage: true });
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile fits without page overflow');
  await page.screenshot({ path: output + '/takeover-mobile.png', fullPage: true });
  assert.deepEqual(pageErrors, []);
  const result = { ok: true, apiChecks: checks, revision: live.experiment.revision, configuredSplit: live.experiment.configuredSplit, browser: { lockedPanels: 6, deepLinkProtected: true, backgroundToolRequests: 0, mobileFits: true, consoleErrors: pageErrors }, screenshotPaths: [output + '/takeover-preview.png', output + '/takeover-desktop.png', output + '/takeover-mobile.png'] };
  await writeFile(output + '/takeover-verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser?.close(); await client.close(); }
