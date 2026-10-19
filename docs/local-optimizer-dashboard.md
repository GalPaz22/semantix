# Local customer dashboard

The customer dashboard at `/dashboard` and `/dashboard/client` uses the sibling `search-optimizer` project. `galpaz2210@gmail.com` keeps the existing management dashboard at `/dashboard`; its customer preview includes a store picker.

From `semantix-front-hebrew`, run `npm run dev`. When `OPTIMIZER_SERVICE_URL` points at the local optimizer on port 4400, the development launcher starts missing local services and waits for the optimizer and its database connection to become ready before starting Next.js. Existing services are reused. Remote optimizer URLs are left alone. `npm run optimizer:local` remains available for starting the services separately. Requires installed dependencies in all sibling projects and Redis (`redis-server`, already available on this machine).

| Service | Address |
| --- | --- |
| Dashboard | http://localhost:3000 |
| Optimizer API | http://127.0.0.1:4400 |
| Search engine (`dashboard-server`) | http://127.0.0.1:8080 |
| Product reprocessing (`onboarding-render`) | http://127.0.0.1:3001 |
| Redis | redis://127.0.0.1:6379 |

The frontend `.env.local` needs `OPTIMIZER_SERVICE_URL=http://127.0.0.1:4400` and `OPTIMIZER_OPS_PASSWORD` matching `OPS_PASSWORD` in `search-optimizer/.env`. These secrets stay on the server. The optimizer `.env` needs `REDIS_URL=redis://127.0.0.1:6379`, `SEARCH_SERVICE_URL=http://127.0.0.1:8080`, `REPROCESS_SERVICE_URL=http://127.0.0.1:3001`, and its existing MongoDB/model credentials. These settings are configured on this machine.

`ENABLE_CRONS=false` in the local optimizer disables scheduled reports, catalog work, and model runs. Active rule/experiment cache refresh continues so Redis TTLs do not expire during local use. The processing service also starts with scheduled full-store sync disabled. Reports and agent runs are available manually from the dashboard.

Analytics use the optimizer's conversion report, with 7/30/90-day ranges, real event counts, session funnels, measured purchases, query performance, and tracking issues. Missing measurements display `—`. Suggestions use persisted repairs, pending agent proposals, and real experiment measurements. Results use the local search engine and catalog; pinning, ordered pins and disabling rules persist in the optimizer. Query-specific exclusion of organic products is not supported by the optimizer's patch format, so there is no simulated remove button. The agent screen starts real runs and polls their progress, history, saved summary and monthly budget.

`/api/optimizer/*` authenticates with NextAuth, resolves the store from the signed-in account, injects the tenant identity on the server, limits available routes, verifies ownership of individual resources, and strips API keys from responses. The admin can explicitly select another store. Normal users cannot switch stores by editing request parameters.

**Local services still use the configured MongoDB database.** Clicking approve, execute, save pins, or start the agent performs real work and persists changes. Local Redis publishes ranking changes to the local search engine. Publishing local changes to an external search deployment needs its shared Redis configuration.

Validation: `npm run test:optimizer` in the frontend, plus `npm run build` and `npm test` in `search-optimizer`. The frontend production build must be run while the Next development server is stopped because both use `.next`.

The Products tab lists the complete store catalog with pagination, search and all/visible/hidden filters. Hide sets `hidden: true` on the exact Mongo product document; restore sets `hidden: false`. Visibility updates resolve the store on the server, invalidate dashboard reports and clear that store's simple-search cache. The existing search engine excludes hidden products.

## Reliable analytics, manual merchandising and chat

The live customer dashboard now includes:

- Search and event counts with the measured time window, Israel timezone, source coverage and prominent tracking warnings. Conversion percentages are suppressed when fewer than 70% of searches have session identifiers, their source was truncated/unavailable, or purchase session coverage is insufficient. Query-level rates also require 70% identifier coverage for that query. Counts remain visible. Both reports and agent tools apply these rules.
- Deduplicated daily purchases, consistent exclusion of suspected automated searches from the chart and the funnel, and separate direct/inferred order attribution. Unknown currencies are explicitly labelled.
- Three manual boost levels (and reset), multi-select operations on the current product page, and an “only promoted” filter. The server resolves exact product document identities in the authenticated store, validates the entire selection before changing it, keeps an audit of previous values, and clears the search cache. Hidden products must be restored before promotion; an existing promotion can still be removed while hidden.
- Query-specific ordered pin drafts, explicit save/discard, pins from the catalog, and an optimistic revision check to avoid overwriting another edit. Saved and published are reported separately. Catalog-only pinned products remain visible in the editing preview; removed/hidden pins are flagged.
- Persistent conversation history, streamed answers with polling recovery, read-only data questions, and review buttons for proposed promotions, visibility and pin rules. Changing the selected tenant remounts panel state to prevent mixing stores. Tab switching preserves the current conversation and ranking draft.

The integration also changes **both sibling services**. Deploy the frontend, `search-optimizer`, and `dashboard-server` together. The search server now applies live visibility, product boosts and exact-query pins to the new tenant engines **before** it saves pagination snapshots. New searches use updated commercial flags even while the engine's enriched catalog is cached. Existing pagination cursors retain their original result snapshot.

Optimizer previews include `X-Semantix-Preview: dashboard`; the search server excludes those requests from shopper search logs and rule-trigger counts. This requires the updated search server as well as the updated optimizer. Existing historical tracking gaps cannot be reconstructed from dashboard code.

Validation: `npm run test:optimizer` and `NEXT_DEMO_DIST_DIR=.next-validation npm run build` in the frontend; `npm run build` and `npm test` in `search-optimizer`; `node --test merchant-ranking.test.mjs search-logging.test.mjs tenants/beautics/*.test.mjs tenants/garmin/*.test.mjs` in `dashboard-server`. Tests use isolated in-memory fixtures for product writes and ranking/pagination, rather than changing a real store. A live read-only dashboard preview was also checked against the store's search logs.

## Four-panel dashboard and admin-style arrangement

The customer navigation now contains exactly Analytics, Search arrangement, Product management and Chatbot. Older suggestions/plans links open the chatbot; reviews and approvals remain available in chat.

Search arrangement reuses `PinnedResultsPanel`, the same component as the admin interface. It supports phrase chips, multiple phrases per group, a catalog picker modal with product images, ordered selected products and per-rule enable/delete controls. The scoped `/api/optimizer/dashboard/merchandising` endpoint hydrates real products and includes both existing admin configuration and prior exact-query dashboard rules. Saving uses a Mongo transaction, an optimistic revision, authenticated store ownership and an audit. Agent-authored rules are preserved. Existing exact-query rules retain their exact match semantics; admin phrases use the same Hebrew-aware matcher in legacy and new search engines.

The primary conversion card prefers checkout conversion and then cart conversion. It requires at least 100 identified search sessions, at least 10 converted sessions and sufficient measurement coverage. If neither stage qualifies it shows identified search sessions. Low rates are not relabelled and rates are never reconstructed from incomplete measurements; recorded counts and measured details remain available.
