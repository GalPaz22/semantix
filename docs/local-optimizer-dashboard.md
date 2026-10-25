# Local customer dashboard

Run `npm ci` in the frontend and `tenant-studio`. Configure matching private
`STUDIO_CUSTOMER_API_TOKEN` values in the frontend `.env.local` and Studio `.env`.
Set `STUDIO_SERVICE_URL=http://127.0.0.1:4320` in the frontend. Studio needs the
existing MongoDB and model settings, plus its customer projects in `STUDIO_DATA_DIR`.
Then run `npm run dev` in the frontend: it starts local Studio when needed and
checks the authenticated dashboard health endpoint before starting Next.js.

The dashboard connects directly to `/api/customer-dashboard/*` on Studio. Its four
panels provide measured analytics, admin-style result arrangement, product
visibility/boosts and the Studio management assistant. The chatbot panel also
contains saved shopper conversations and concierge instructions. No optimizer
server is needed. `/api/optimizer/*` is retained only as a frontend compatibility
alias and forwards to Studio as well.

The frontend session selects the store; browser-supplied API keys/database names
are ignored. Only the administrator can choose another store. Studio independently
checks its service token, the selected `dbName` and each requested resource.
Dashboard access does not require an API key on the login or store account.
The frontend reads the assignment from the user's current Mongo record and sends
`dbName` to Studio; only administrators can override the selected store.
Manual arrangement writes use revision checking and an audit; other manual/agent
rules are retained. Changes apply to new searches, while existing pagination
cursors keep their original result snapshots.

See [production setup](manovino-production.md) for deployment and verification.

Analytics includes a **התחלות צ׳קאאוט** count and daily chart option using recorded
`checkout_initiated` events. Repeated starts remain events; the search funnel
counts distinct attributed sessions separately. Completed purchases and revenue
retain their existing definitions. Missing checkout data is unavailable, and a
truncated source is explicitly shown as a lower bound.

The **קמפיינים פעילים** panel (`?panel=campaigns`, also accepts the former
`?panel=plans` link) shows running/applied weekly suggestions, legacy experiments
and saved search rules. Its authenticated `GET dashboard/campaigns` read selects
the store server-side and reads all live weekly suggestions separately from the
30-item weekly history. Weekly performance uses Studio's proposal monitor. Legacy
experiments show their latest saved snapshot and its timestamp; promoted tests
explicitly retain their earlier test measurements. Rules without independent
measurement, missing snapshots and partial tracking are shown as unavailable.
