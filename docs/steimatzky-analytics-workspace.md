# Steimatzky A/B analytics workspace

`/dashboard/client` uses the authenticated account's current `users.users` store assignment. When it resolves to `steimatzky`, the workspace is analytics-only. Administrators can preview it with `/dashboard/client?store=steimatzky&panel=analytics`; customer accounts cannot select another store with query parameters.

## Data and presentation

- `GET /api/customer-dashboard/dashboard` returns lightweight store metadata and the workspace policy for this tenant, without contacting Tenant Studio or loading editing tools.
- `GET /api/customer-dashboard/dashboard/ab-test?days=7` reads the live `semantix_takeover` configuration and the current published module head. Supported ranges are 1, 3, 7 and 14 days.
- The effective range starts after both the current edition publication and latest recorded allocation update. A bounded earlier exposure window identifies returning browser IDs and inconsistent assignment. A module revision label alone is not an immutable per-request edition digest.
- Exposure, query, click and cart data come from the store's MongoDB collections. Generic intercepted `checkout` requests are used only as evidence of a conflicting variant, never as purchases.
- Each browser ID is counted once per outcome. Cart events must follow a recorded search and carry the matching variant. This is a recorded activity metric, not proof of successful checkout, purchase, attribution to a particular search, or causal uplift.
- Pinned, fallback, unknown and conflicting assignments are excluded from the two-arm comparison. Configured allocation and observed allocation are labeled separately. Missing and truncated sources suppress rates, rather than becoming zeros.
- The dashboard gives Semantix brand prominence and shows its absolute activity first. Both variants' performance remains visible with consistent definitions. The chart explicitly shows cumulative activity. No winner, uplift, revenue, or purchase result is manufactured.
- Browser responses contain aggregates and query strings, not API credentials, visitor IDs, IP addresses or raw event documents. Results are cached privately in process for up to 60 seconds; browser and intermediary caching are disabled.

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

Tests cover counting and time boundaries, asymmetric attribution, conflicting/pinned/fallback cohorts, missing sources, scoped access, legacy lock guards, authenticated API responses, unauthorized requests, deep links, background tool requests and responsive layout.
