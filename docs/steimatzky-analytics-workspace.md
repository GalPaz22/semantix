# Steimatzky A/B analytics workspace

`/dashboard/client` uses the authenticated account's current `users.users` store assignment. When it resolves to `steimatzky`, the workspace is analytics-only. Administrators can preview it with `/dashboard/client?store=steimatzky&panel=analytics`; customer accounts cannot select another store with query parameters.

## Data and presentation

- `GET /api/customer-dashboard/dashboard` returns lightweight store metadata and the workspace policy for this tenant, without contacting Tenant Studio or loading editing tools.
- `GET /api/customer-dashboard/dashboard/ab-test` reads live data only from the fixed measurement start **2026-11-02T10:27:07.000Z (12:27:07 Israel)** onward, when the corrected add-to-cart button went live. The earlier start was retired because that button sent the wrong product until then, in the Semantix arm only. The server rejects range/date parameters, including `days`, `from` and `to`. The UI has no historical date selector. `lib/takeover-measurement.js` stores this durable boundary; deployments and module publications do not reset it. Existing events are preserved in MongoDB.
- No pre-start exposure, search, click, cart or checkout evidence is read or used for linking. A returning browser can be assigned from its new directly tagged search; an older exposure is never necessary or imported.
- Confirmed cart outcomes come exclusively from `steimatzky.tracking_events` with `event_type: add_to_cart_confirmed`. `cart.add_to_cart` button/request intents never enter the numerator or confirmed cart coverage.
- Product conversion uses a browser + search + canonical product chain: logged search → result click → confirmed add of that product. Product catalog IDs and Magento IDs are reconciled with `products.id`, `products.sku` and `products.siteCard.productId`. A stored SKU in `card_path` / product path is recognized only if the catalog resolves it; conflicting or ambiguous mappings are rejected. Names and arbitrary URL equality are never identity evidence.
- `results_page`, `autocomplete` and `typed_results` are recognized. Typed-result clicks require the matching typed search; its asynchronous log can follow the click by at most 60 seconds. All stages remain inside the new period. Click/add order uses server receipt time when available; explicit click IDs and recorded visit IDs must agree.
- A result card can add to the cart without a click. Such a confirmed add with `search_link` `results_page` or `typed_results` needs its logged search of the same browser, visit and arm; it then counts in both numerator and denominator and as `directAddedProducts`.
- Each browser/search/product combination counts once, even with repeated clicks, confirmed adds, quantities or retries. Rate = confirmed added combinations / combinations clicked or added directly. An empty denominator displays no rate.
- The primary view shows only product conversion for both arms and product counts and catalog names. Current traffic split and measurement coverage remain available as secondary details. No overall visitor conversion is displayed.
- Pinned, fallback, unknown and conflicting assignments are excluded from the two-arm comparison. Configured allocation and observed allocation are labeled separately. Missing and truncated sources suppress rates, rather than becoming zeros.
- The dashboard gives Semantix brand prominence and shows its absolute activity first. Both variants' performance remains visible with consistent definitions. No winner, uplift, revenue, or purchase result is manufactured.
- Browser responses contain aggregates, internal product keys, catalog names and query strings, not API credentials, visitor/search/click IDs, IP addresses or raw event documents. Results are cached privately in process for up to 60 seconds; browser and intermediary caching are disabled.

## Temporary lock

`lib/customer-dashboard-access.js` is the single store policy. The customer proxy and its `/api/optimizer` compatibility path allow only dashboard metadata and A/B analytics for Steimatzky. Other workspace operations return HTTP 423. Locked panels are disabled and not mounted, including when their URL is opened directly.

Legacy customer paths for product updates, category boosts, pinned results, API key access/rotation, onboarding changes and manual reprocessing also enforce the lock. Administrative back-office operations and independent catalog ingestion are not disabled by this customer-workspace policy. Other stores retain their existing behavior.

## Verification

```sh
node --test test/takeover-analytics.test.mjs test/dashboard-store-session.test.mjs test/dashboard-analytics.test.mjs test/optimizer-access.test.mjs test/search-rule-publication.test.mjs test/search-rule-redis-publication.test.mjs
NEXT_DEMO_DIST_DIR=.next-takeover-build node node_modules/next/dist/bin/next build
node scripts/verify-takeover-dashboard.mjs
```

For local authenticated browser verification, start Next on port 3134 with `NEXT_DEMO_DIST_DIR=.next-takeover-preview`, then run `scripts/verify-takeover-ui.mjs`. It creates a short-lived local JWT in memory for an existing Steimatzky account and performs real read requests. It does not write account/session records or change experiment data. The mutation probes are blocked before body parsing; their intentionally invalid JSON cannot apply a change if the lock regresses. Browser artifacts are written to `TAKEOVER_QA_OUTPUT`.

Tests cover the immutable reset boundary, blocked historical range requests, confirmed versus intent events, canonical product mappings, typed-result logging lag, counting and time boundaries, asymmetric attribution, conflicting/pinned/fallback cohorts, missing sources, scoped access, legacy lock guards, authenticated API responses, unauthorized requests, deep links, background tool requests and responsive layout.

The product table displays catalog names only, with a neutral unavailable-name label when the catalog has no name. Internal product/SKU keys remain for grouping and attribution and are never rendered in the table.
