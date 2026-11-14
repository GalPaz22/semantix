// A fixed reporting boundary requested by the customer. Never derive this from
// deploy time, a rolling date range, or the latest search module publication.
export const TAKEOVER_MEASUREMENT_START = '2026-11-02T10:27:07.000Z';
export const TAKEOVER_MEASUREMENT_ID = 'steimatzky-search-products-2026-11-02-after-cart-fix';

// One entry per store with a search experiment. start is the moment its split went live; the rest says how the
// store's product addresses and SKUs look, so clicks, carts and orders resolve to the same product.
export const TAKEOVER_STORES = {
  steimatzky: {
    start: TAKEOVER_MEASUREMENT_START, measurementId: TAKEOVER_MEASUREMENT_ID,
    name: 'סטימצקי', site: 'steimatzky.co.il', eyebrow: 'STEIMATZKY × SEMANTIX',
    hosts: ['steimatzky.co.il', 'www.steimatzky.co.il'],
    // Product pages end in the 9-digit SKU, and a product_id of that shape is the SKU itself.
    skuPattern: /^\d{9}$/, productIdIsSku: true, lowercaseSku: false,
  },
  rikushet: {
    // 10% of shoppers to Semantix from this moment (studio rollout, 14.11.2026).
    start: '2026-11-14T14:36:58.684Z', measurementId: 'rikushet-search-2026-11-14-split-10',
    name: 'ריקושט', site: 'rikushet.co.il', eyebrow: 'RIKUSHET × SEMANTIX',
    hosts: ['rikushet.co.il', 'www.rikushet.co.il'],
    // Product pages end in the SKU (digits, or letters with an underscore); clicks and carts carry Magento's entity
    // id and orders the SKU in capitals, so SKUs compare in lower case.
    skuPattern: /^[a-z0-9][a-z0-9_-]{3,40}$/, productIdIsSku: false, lowercaseSku: true,
  },
};

export function takeoverStore(dbName) {
  const store = Object.hasOwn(TAKEOVER_STORES, dbName) ? TAKEOVER_STORES[dbName] : null;
  if (!store) throw Object.assign(new Error('הניסוי אינו זמין בחנות זו'), { status: 404 });
  return store;
}
