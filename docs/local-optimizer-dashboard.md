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
checks its service token, the selected store key and each requested resource.
Manual arrangement writes use revision checking and an audit; other manual/agent
rules are retained. Changes apply to new searches, while existing pagination
cursors keep their original result snapshots.

See [production setup](manovino-production.md) for deployment and verification.
