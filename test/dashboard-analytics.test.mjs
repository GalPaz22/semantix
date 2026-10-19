import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsMeasurement } from '../lib/dashboard-analytics.js';
const report = () => ({
  sources: Object.fromEntries(['queries', 'product_clicks', 'cart', 'checkout_events'].map(name => [name, { status: 'ok', truncated: false }])),
  funnel: { coverage: { queries: 100, queriesWithSession: 100, queriesWithResultCount: 100, purchases: 30, purchasesWithSession: 30, purchaseTracking: true, purchaseSessionsSeenBefore: 1 } },
});
test('missing sources and missing sessions never become a measured zero conversion', () => {
  const missing = analyticsMeasurement(null);
  assert.equal(missing.searchCounts, false); assert.equal(missing.cartRates, false); assert.equal(missing.purchaseRates, false);
  const r = report(); r.funnel.coverage.queriesWithSession = 44;
  const m = analyticsMeasurement(r);
  assert.equal(m.searchCounts, true); assert.equal(m.clickRates, false); assert.equal(m.cartRates, false); assert.equal(m.purchaseRates, false); assert.equal(m.revenue, true);
});
test('each rate requires its own complete source, preserving independently measured stages', () => {
  const r = report(); r.sources.cart.truncated = true;
  let m = analyticsMeasurement(r); assert.equal(m.cartRates, false); assert.equal(m.clickRates, true); assert.equal(m.purchaseRates, true);
  r.sources.checkout_events.status = 'unavailable'; m = analyticsMeasurement(r);
  assert.equal(m.revenue, false); assert.equal(m.purchaseRates, false);
});
test('purchase rates are suppressed for sparse or mismatched purchase sessions', () => {
  const r = report(); r.funnel.coverage.purchasesWithSession = 10;
  assert.equal(analyticsMeasurement(r).purchaseRates, false);
  r.funnel.coverage.purchasesWithSession = 30; r.funnel.coverage.purchaseSessionsSeenBefore = 0.1;
  assert.equal(analyticsMeasurement(r).purchaseRates, false);
});
test('zero-result counts require a reported result count and keep partial coverage explicit', () => {
  const r = report(); r.funnel.coverage.queriesWithResultCount = 0;
  assert.equal(analyticsMeasurement(r).resultCounts, false);
  r.funnel.coverage.queriesWithResultCount = 50;
  assert.equal(analyticsMeasurement(r).resultCounts, true); assert.equal(analyticsMeasurement(r).resultCoverage, 0.5);
});

test('headline prefers measured checkout conversion with an adequate sample', async () => {
  const { headlineConversion } = await import('../lib/dashboard-analytics.js');
  const r = report(); r.funnel.coverage.checkoutTracking = true;
  r.funnel.sessions = { searched: 500, checkout: 25, carted: 100 }; r.funnel.rates = { checkout: 0.05, cart: 0.2 };
  assert.equal(headlineConversion(r).stage, 'checkout');
});
test('headline falls back to cart when checkout is untracked, zero, or under-sampled', async () => {
  const { headlineConversion } = await import('../lib/dashboard-analytics.js');
  const r = report(); r.funnel.sessions = { searched: 500, checkout: 0, carted: 100 }; r.funnel.rates = { checkout: 0, cart: 0.2 };
  assert.equal(headlineConversion(r).stage, 'cart');
  r.funnel.coverage.checkoutTracking = true; r.funnel.sessions.checkout = 2; r.funnel.rates.checkout = 0.004;
  assert.equal(headlineConversion(r).stage, 'cart');
});
test('headline does not manufacture a rate from a sparse sample or a high percentage with poor coverage', async () => {
  const { headlineConversion } = await import('../lib/dashboard-analytics.js');
  const r = report(); r.funnel.sessions = { searched: 50, checkout: 20, carted: 40 }; r.funnel.rates = { checkout: 0.4, cart: 0.8 }; r.funnel.coverage.checkoutTracking = true;
  assert.equal(headlineConversion(r), null);
  r.funnel.sessions.searched = 500; r.funnel.coverage.queriesWithSession = 44;
  assert.equal(headlineConversion(r), null);
});
