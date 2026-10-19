# Mano Vino dashboard release

The release spans three repositories: `search-optimizer`, `dashboard-server` and this Next.js frontend. Deploy the backend and search engine before switching the frontend to this version.

## Hosting configuration

Use the existing Render services and production MongoDB. The optimizer's `render.yaml` defines its build and health checks. Required server-only secrets are `MONGODB_URI`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `OPS_PASSWORD`. **Use the same Redis deployment as the live search engine**, never the laptop Redis. Set `SEARCH_SERVICE_URL=https://api.semantix-ai.com`, `REPROCESS_SERVICE_URL=https://onboarding-lh63.onrender.com`, `NODE_ENV=production`, `ENABLE_CRONS=false`, `AGENT_NIGHTLY=false`. These flags keep dashboard requests and manual chat available without enabling unattended catalog changes or model runs. The initial agent monthly budget is $20 in the existing Blueprint; confirm the existing service's budget when configuring it.

In the Vercel frontend, set `OPTIMIZER_SERVICE_URL` to the actual deployed HTTPS optimizer URL and `OPTIMIZER_OPS_PASSWORD` to its `OPS_PASSWORD`. Apply to Production and Preview if testing a preview. Keep the existing MongoDB, NextAuth, OAuth and other application settings. Production `NEXTAUTH_URL` must be the actual frontend origin, such as `https://www.semantix.co.il`, never localhost. Redeploy after changing environment variables. No optimizer secrets are browser variables.

The optimizer refuses to start in production with missing dependencies, credentials or laptop service URLs. Its health endpoint returns 503 if MongoDB or shared Redis is unavailable. The frontend returns an explicit configuration error instead of silently connecting to localhost when its production optimizer settings are missing.

## Store-specific audit (19 October 2026)

A read-only report for the preceding 30 days found 2,324 products, 907 available products, 1,801 identified search sessions and 376 sessions reaching a cart after searching (20.9%). Search identifier coverage was about 75%. No checkout or purchase events were recorded in this period. The dashboard therefore highlights cart conversion and cart sessions, rather than an empty revenue card. These are a point-in-time audit; the page always reads a fresh report.

Leading actual searches include פלטר, ריף, בירה, zin and שאבלי. Chat suggestions use this store's current leading queries and opportunities. Existing manual pin groups cover פחית/פחיות and Portuguese red wine phrases; both are loaded from existing configuration. A legacy shared account has credentials for another store, so arrangement saves explicitly exclude accounts whose `credentials.dbName` conflicts with the current store. No historic events or existing pin groups were altered during verification.

## Verification and rollback

1. In `search-optimizer`: `npm run build && npm test && npm run ui:build`. Verify the remote `/api/health` reports connected MongoDB and Redis, and unauthenticated protected API calls return 401.
2. In `dashboard-server`: `node --test merchant-ranking.test.mjs search-logging.test.mjs tenants/manovino/*.test.mjs tenants/beautics/*.test.mjs tenants/garmin/*.test.mjs`. Deploy this engine version so live boosts, hidden products and pins apply before result pagination, and dashboard previews do not pollute shopper analytics.
3. In this repository: `npm run test:optimizer` and `NEXT_DEMO_DIST_DIR=.next-validation npm run build`. With the deployed environment configured, run `node scripts/verify-production-dashboard.mjs --store=manoVino`. This only reads the backend and store; it checks authentication, tenant scope, report/catalog consistency and chat history without changing products or starting a model run.
4. Sign in as the existing Mano Vino customer or select `manoVino` as an administrator. Verify all four panels, existing pins, real product images, mobile layout and one read-only chat question. Approve ranking changes only through the normal review controls. Verify a new live search after an intended manual edit; existing pagination snapshots retain their original order.

Keep the previous frontend and Render deployment identifiers before promotion. Roll back deployment versions if any tenant, authentication, catalog or analytics check fails. Changes are additive and require no destructive data migration. Existing tracking gaps cannot be reconstructed; checkout/order measurement needs the store integration to send those events before revenue can be shown.
