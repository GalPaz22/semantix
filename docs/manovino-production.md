# Customer dashboard production release

The Next.js customer dashboard connects directly to **tenant-studio**. Studio
serves analytics, products, saved shopper conversations and concierge settings
under `/api/customer-dashboard/*`, and executes customer management chat with
its existing `studioAgent`. No separate optimizer deployment or optimizer
credentials are required for the four customer panels.

## Deploy

1. Deploy `tenant-studio` with `dbName` dashboard support first, retaining its existing persistent
   `STUDIO_DATA_DIR`, customer projects and model credentials.
2. Deploy the `semantix` frontend from main (Node.js 24).
3. Keep `dashboard-server` deployed with live merchant ranking, concierge
   transcripts and per-message prompt settings. It serves the shopper search/chat.

In **both Vercel and tenant-studio**, set the same private
`STUDIO_CUSTOMER_API_TOKEN`. In Vercel Production, set
`STUDIO_SERVICE_URL=https://tenant-studio.onrender.com` (or the actual Studio
HTTPS origin). This is also the frontend's production default. The token is
server-only; the operator Studio token is not accepted. Redeploy after changing
environment variables. Existing MongoDB/NextAuth/OAuth settings stay in place.
`OPTIMIZER_SERVICE_URL` and `OPTIMIZER_OPS_PASSWORD` are not used by this dashboard.

Customer requests are scoped by the logged-in user's stored `dbName`, not their
API key. Next.js sends that database name to Studio with the private service
token. Studio keeps legacy `tenant` key calls for older frontends during rollout;
the new frontend requires the Studio update before deployment. Search engine
publication can still use the store's existing private integration keys internally.

Studio uses `STUDIO_DASHBOARD_MONGODB_URI`, falling back to `MONGODB_URI`, for the
same customer/control-plane database that the frontend and search service use.
Analytics and history are deterministic reads; they need neither a Studio project
nor Redis. Product changes and concierge edits are store scoped. Shared Redis is
optional for analytics, but configure the search engine's production `REDIS_URL`
on Studio for immediate cache clearing and publication of existing exact-query
rules. Studio refreshes those saved rules every 30 seconds; no scheduled model or
catalog changes are started.

## Customer chat

Studio needs the existing store project on persistent storage. Mano Vino's local
project is `2b3f29d3-1caf-4193-a527-d7da17bbae85`. Restore it on the deployed
Studio before using management chat. If several projects share the same dbName,
set `STUDIO_CUSTOMER_PROJECTS={"manoVino":"2b3f29d3-1caf-4193-a527-d7da17bbae85"}`.
The project must actually belong to that database. Customer messages never include
private operator conversations.

History, progress and pending proposals stay in the existing Mongo collections.
Questions do not publish changes. Approving a draft checks store ownership and
its original project revision. Product promotion, visibility and pin requests
remain pending until approved in the dashboard. Stop requests and per-store run
leases are shared through Mongo; a restarted instance does not silently lose history.

## Verification

- Studio: `npm test`.
- Frontend: `npm run test:optimizer` and `npm run build`.
- With production Studio credentials configured, run
  `node scripts/verify-production-dashboard.mjs --store=manoVino`.
  This checks service authentication, scope, catalog consistency and history using
  read-only operations; it does not send model messages or modify products.

The October 19, 2026 read-only check through Studio returned 3,408 Beautics
products, 2,296 identified search sessions in 30 days and 869 historical concierge
records. Mano Vino returned 2,324 products and 1,802 search sessions. These are
point-in-time checks; the dashboard reads current data. Historical records without
saved message text cannot be reconstructed. Tracking gaps remain explicit, and
rates are suppressed when their required coverage is unavailable.
