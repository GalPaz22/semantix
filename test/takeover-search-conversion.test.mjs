import test from 'node:test';
import assert from 'node:assert/strict';
import { matchedMerchandiseCents, summarizeSearchConversion } from '../lib/takeover-search-conversion.js';
import { summarizeTakeover } from '../lib/takeover-analytics.js';
import { hasServerSearchStart, searchStartedAt } from '../lib/takeover-search-timing.js';

const end = +new Date('2026-11-07T14:00:00Z'), start = end - 3 * 86400000;
const key = (browser, search) => JSON.stringify([browser, search]);
const chainKey = (browser, search, product) => JSON.stringify([browser, search, product]);
const item = (id, price, quantity = 1) => ({ id, price, quantity });
const order = (items, total_price, currency = 'ILS') => ({ items, total_price, currency, timestamp: new Date(end - 3 * 3600000 + 60000).toISOString() });
const options = { start, end, complete: true, ordersComplete: true };

test('search-to-cart counts distinct regular searches, not products, clicks, retries or autocomplete picks', () => {
  const searches = new Map([
    [key('s', 'one'), { arm: 'semantix', time: end - 3 * 3600000, row: {} }],
    [key('s', 'two'), { arm: 'semantix', time: end - 3 * 3600000, row: {} }],
    [key('s', 'three'), { arm: 'semantix', time: end - 3 * 3600000, row: {} }],
    [key('s', 'typed'), { arm: 'semantix', time: end - 3 * 3600000, row: {}, typed: true }],
    [key('s', 'young'), { arm: 'semantix', time: end - 3600000, row: {} }],
    [key('s', 'old'), { arm: 'semantix', time: end - 25 * 3600000, row: {} }],
  ]);
  const chains = new Map([
    [chainKey('s', 'one', 'a'), { arm: 'semantix', added: true, orderAdds: [{ at: end - 3 * 3600000 + 30000 }] }],
    [chainKey('s', 'one', 'b'), { arm: 'semantix', added: true, orderAdds: [{ at: end - 3 * 3600000 + 30000 }] }],
    [chainKey('s', 'two', 'c'), { arm: 'semantix', added: false }],
    [chainKey('s', 'typed', 'd'), { arm: 'semantix', added: true, orderAdds: [{ at: end - 3 * 3600000 + 30000 }] }],
  ]);
  const r = summarizeSearchConversion({ searches, chains, linkedOrders: [], ...options });
  assert.equal(r.groups.semantix.searches, 3);
  assert.equal(r.groups.semantix.cartedSearches, 1);
  assert.equal(r.groups.semantix.searchCartRate, 1 / 3);
  assert.equal(r.exclusions.autocomplete, 1);
  assert.equal(r.exclusions.immature, 1);
  for (const field of ['browser', 'searchKey', 'session_id', 'visit_id', 'order_id']) assert.ok(!JSON.stringify(r).includes(`"${field}":`));
});

test('merchandise value uses only matched lines, allocates discounts and never credits shipping', () => {
  const a = item('a', 50, 2), b = item('b', 100);
  assert.equal(matchedMerchandiseCents(order([a, b], 80), [a]), 4000);
  assert.equal(matchedMerchandiseCents(order([a, b], 250), [a]), 10000);
  assert.equal(matchedMerchandiseCents(order([item('free', 0)], 0), [item('free', 0)]), 0);
});

test('unknown, conflicting, invalid or non-ILS money is unavailable rather than fabricated', () => {
  const a = item('a', 20);
  for (const o of [order([a], null), order([a], 20, 'USD'), order([item('a', null)], 20), order([item('a', 20, -1)], 20)]) {
    assert.equal(matchedMerchandiseCents(o, o.items), null);
  }
  assert.equal(matchedMerchandiseCents(order([a], 20), [a], false), null);
});

function modelFixture({ semCarted = 5, missingBaselineValue = false, ordersComplete = true, fullBasket = false } = {}) {
  const searches = new Map(), chains = new Map(), linkedOrders = [];
  for (const [arm, n, carted] of [['semantix', 10, semCarted], ['native', 20, 6]]) {
    for (let i = 0; i < n; i++) {
      const browser = `${arm}-${i}`, search = 'search';
      searches.set(key(browser, search), { arm, time: end - 3 * 3600000, row: {} });
      if (i < carted) chains.set(chainKey(browser, search, 'a'), { arm, added: true, orderAdds: [{ at: end - 3 * 3600000 + 30000 }] });
      if (arm === 'native' && i < 6) {
        const a = item('a', 25);
        linkedOrders.push({ arm, searchKey: key(browser, search), row: order(fullBasket ? [a, item('other', 100)] : [a], fullBasket ? 125 : 25, missingBaselineValue && i === 0 ? 'USD' : 'ILS'), matchedItems: [a], financiallyConsistent: true });
      }
    }
  }
  return summarizeSearchConversion({ searches, chains, linkedOrders, ...options, ordersComplete });
}

test('financial scenario uses observed extra carts and native purchased-product value, without rollout extrapolation', () => {
  const r = modelFixture();
  assert.equal(r.comparison.extraCartedSearches, 2);
  assert.equal(r.financialImpact.model.baselineCartToProductOrderRate, 1);
  assert.equal(r.financialImpact.model.baselineValuePerPurchasedSearch, 25);
  assert.equal(r.financialImpact.model.estimate, 50);
  assert.equal(r.financialImpact.incrementalRevenueStatus, 'not-established');
  assert.equal(r.financialImpact.observed.native.matchedProductValue, 150);
});

test('negative differences remain negative; missing financial coverage suppresses the estimate', () => {
  assert.equal(modelFixture({ semCarted: 0 }).financialImpact.model.estimate, -75);
  assert.equal(modelFixture({ missingBaselineValue: true }).financialImpact.model.estimate, null);
  const unavailable = modelFixture({ ordersComplete: false });
  assert.equal(unavailable.groups.semantix.searchCartRate, .5);
  assert.equal(unavailable.financialImpact.model.status, 'insufficient-data');
  assert.equal(unavailable.financialImpact.observed.native.matchedProductValue, null);
});

test('integration deduplicates monetary order retries and rejects conflicting reported amounts', () => {
  const t = offset => new Date(end - (4 * 3600000) + offset * 60000).toISOString();
  const base = { session_id: 's', search_id: 'search', visit_id: 'visit', ab_tests: { semantix_takeover: 'semantix' } };
  const bought = item('42', 30), row = { ...base, timestamp: t(4), created_at: t(4), event_type: 'checkout_completed', source: 'order-page', order_id: 'order', items: [bought], total_price: 30, currency: 'ILS' };
  const input = { exposures: [{ ...base, timestamp: t(0) }], queries: [{ ...base, timestamp: t(1), query: 'book', searchMode: 'text' }], clicks: [],
    carts: [{ ...base, timestamp: t(2), event_type: 'add_to_cart_confirmed', product_id: '42', search_link: 'results_page' }], orders: [row, { ...row }] };
  const opts = { from: new Date(start).toISOString(), to: new Date(end).toISOString(), ordersAvailable: true };
  const normal = summarizeTakeover(input, opts).searchConversion;
  assert.equal(normal.groups.semantix.cartedSearches, 1);
  assert.equal(normal.groups.semantix.productOrderedSearches, 1);
  assert.equal(normal.financialImpact.observed.semantix.valuedOrders, 1);
  assert.equal(normal.financialImpact.observed.semantix.matchedProductValue, 30);
  const conflict = summarizeTakeover({ ...input, orders: [row, { ...row, total_price: 50 }] }, opts).searchConversion;
  assert.equal(conflict.financialImpact.observed.semantix.matchedProductValue, 0);
  assert.equal(conflict.financialImpact.observed.semantix.missingValueOrders, 1);
});


test('monthly projection scales both arms by measured days and distinguishes full baskets from matched products', () => {
  const r = modelFixture({ fullBasket: true }), m = r.financialImpact.monthlyProjection;
  assert.equal(m.status, 'available');
  assert.equal(m.volume.regularSearches, 30);
  assert.equal(m.volume.observedDays, 3);
  assert.equal(m.volume.projectedSearches, 300);
  assert.equal(m.extraCartedSearches, 60);
  assert.equal(m.matchedProductValueEstimate, 1500);
  assert.equal(m.fullOrderValueEstimate, 7500);
  assert.equal(m.baselineOrderValuePerPurchasedSearch, 125);
  assert.ok(m.assumption.includes('entire additional baskets to be incremental'));
  assert.equal(r.financialImpact.incrementalRevenueStatus, 'not-established');
});

test('monthly projection preserves negative outcomes and requires complete financial coverage', () => {
  const negative = modelFixture({ semCarted: 0 }).financialImpact.monthlyProjection;
  assert.equal(negative.fullOrderValueEstimate, -2250);
  assert.equal(modelFixture({ missingBaselineValue: true }).financialImpact.monthlyProjection.fullOrderValueEstimate, null);
  assert.equal(modelFixture({ ordersComplete: false }).financialImpact.monthlyProjection.status, 'insufficient-data');
});


test('every search has exactly two hours of cart and order follow-up in both arms', () => {
  const searches=new Map(),chains=new Map(),linkedOrders=[];
  for(const arm of ['semantix','native']) for(const [name,offset] of [['boundary',7200000],['late',7200001],['before',-1]]) {
    const browser=arm+name,time=end-4*3600000,sk=key(browser,'s');
    searches.set(sk,{arm,time,row:{}});
    chains.set(chainKey(browser,'s','a'),{arm,added:true,orderAdds:[{at:time+offset}]});
    const a=item('a',20);linkedOrders.push({arm,searchKey:sk,row:{...order([a],20),timestamp:new Date(time+offset).toISOString()},matchedItems:[a]});
  }
  const r=summarizeSearchConversion({searches,chains,linkedOrders,...options});
  for(const arm of ['semantix','native']){assert.equal(r.groups[arm].cartedSearches,1);assert.equal(r.groups[arm].productOrderedSearches,1);assert.equal(r.financialImpact.observed[arm].matchedProductValue,20);}
  assert.equal(r.window.outcomeWindow,'fixed-per-search');assert.equal(r.window.followUpHours,2);
});

test('server request start repairs asynchronous log ordering without inventing timestamps for legacy rows', () => {
  const t=n=>new Date(end-4*3600000+n*1000).toISOString(),base={session_id:'s',search_id:'search',visit_id:'v',ab_tests:{semantix_takeover:'native'}};
  const query={...base,timestamp:t(10),search_started_at:t(0),searchMode:'text',query:'book'};
  const input={exposures:[],queries:[query],clicks:[{...base,timestamp:t(2),received_at:t(2),event_id:'click',interaction_type:'click',search_link:'results_page',product_id:'42'}],carts:[{...base,timestamp:t(4),event_id:'cart',event_type:'add_to_cart_confirmed',product_id:'42',click_id:'click',search_link:'clicked_result'}]};
  const opts={from:new Date(start).toISOString(),to:new Date(end).toISOString()};
  const fixed=summarizeTakeover(input,opts).searchConversion;
  assert.equal(fixed.groups.native.cartedSearches,1);assert.equal(fixed.timing.groups.native.serverStartedSearches,1);
  const {search_started_at,...legacy}=query;
  const old=summarizeTakeover({...input,queries:[legacy]},opts).searchConversion;
  assert.equal(old.groups.native.cartedSearches,0);assert.equal(old.timing.groups.native.legacyTimestampSearches,1);
  assert.equal(hasServerSearchStart({...query,search_started_at:t(11)}),false);
  assert.equal(searchStartedAt({...query,search_started_at:'invalid'}),Date.parse(t(10)));
});
