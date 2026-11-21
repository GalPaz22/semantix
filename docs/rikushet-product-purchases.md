# Rikushet: observed purchases of products from search

The Rikushet experiment dashboard now leads with completed orders containing the
same catalog SKU as a product selected from a specific search. It does not use
the last search on an order, a previous search in the browser, or the value of
unrelated basket items as proof of a purchase from search. The existing
Steimatzky dashboard and its saved reporting period are unchanged.

`readTakeoverAnalytics` reads the existing tenant collections and passes the
bounded reporting window to `summarizePurchasedSearches`. No additional database
writes, search requests, tracking installation or experiment changes occur.
The authenticated route still resolves the database server-side. Product IDs
must resolve unambiguously to a catalog SKU, or a same-store product-page SKU
must exactly equal a recorded order-item SKU. Products missing from the feed
can therefore receive credit in either arm. Unknown bare entity IDs, foreign
hosts, different SKUs and catalog alias conflicts remain excluded; no name
matching is used.

A catalog record with an empty `sku` field is also supported when its `id`
exactly equals an SKU in the recorded order. This promotion requires the
same-store product path or the explicit internal order-item role; a bare
unknown Magento entity ID is still insufficient.

Each context is browser + visit + search ID. Duplicate search logs do not inflate
the denominator. A typed-pick log reusing an actual full-search context cannot
erase the full search; typed product actions still remain in their own lane.
Clicks and confirmed adds must refer to that context, visitor, visit and arm.
An order item must resolve to the same SKU, follow its action, and be in the
same visit and group within 24 hours of that search. The last qualifying touch
on that product wins; the order's unrelated last search does not receive credit.
Conflicting order retries and known cancelled/refunded/unpaid statuses are
excluded. Recorded order completion is not payment-ledger verification.

Only searches with a complete 24-hour observation opportunity enter the main
comparison. New searches are shown as pending. The start is no earlier than the
store's measurement boundary or its current experiment configuration change.
Typed selections are shown as order counts with no invented exposure denominator
or conversion rate. Orders spanning both lanes are deduplicated in the total.

Missing sources, insufficient identity/item coverage and empty denominators
produce `null`, displayed as a dash. The screen includes query-level counts,
matching product names, configured split, source coverage, timestamps and a
small-sample notice. A relative lift from an observed rate difference is
descriptive, not a significance or incremental-sales claim. Rikushet no longer
shows the monthly full-basket revenue projection as its primary result.

The money comparison shows only the reported value of matching order items, by
currency. It compares value per 100 mature full searches and the observed
difference at Semantix's search volume: `Semantix value - native value / native
searches * Semantix searches`. Browser allocation does not guarantee equal
search counts. Negative differences remain negative; missing monetary evidence
or an empty denominator suppresses the calculation. No currency conversion,
monthly extrapolation or incremental revenue/profit claim is made. Typed picks
show attributed value separately, without a fabricated exposure denominator.

Prices and quantities come from the tracked order items. The item subtotal is
proportionally capped at the reported order total, using integer cents and a
largest-remainder allocation once across the entire basket. Unrelated items and
an order total above the subtotal never increase search credit. The tracker has
no separate discount, tax or shipping fields: the displayed amount is reported
merchandise value, not verified net receipts or exact discount accounting.
Missing prices, quantities, totals or currencies are unavailable, never zero.

Validation:

- `npm run test:optimizer` — 164 passing tests, including negative attribution,
  monetary completeness, cent conservation, volume normalization, separate
  currencies, zero baselines and existing experiment/order tests.
- `npm run build` — production compilation and page generation.
- `node scripts/verify-search-purchase-dashboard.mjs` — read-only check using the
  configured Mongo URI; `--at=ISO` fixes the observation cutoff and `--output=PATH`
  saves an aggregate report. The verifier never saves shopper identifiers.
- Browser verification on actual aggregate Rikushet data: comparison cards,
  query filtering, purchase sorting and product evidence. Preview fixtures and
  routes are local-only and excluded from the release.

The same earlier audit cutoff reproduced six converting full searches versus
two, plus three typed-selection orders on Semantix (one overlapping order).
Denominators can change when delayed query logs arrive; no audited counts or
percentages are hardcoded into the dashboard.
