# Beautics concierge management

Open **צ׳אטבוט → שיחות לקוחות** for saved shopper conversations, or
**צ׳אטבוט → הוראות לקונסיירז׳** to edit the shopper bot's instructions.
The existing tenant-studio search-management assistant remains a separate tab.

## Release

Deploy all three repositories from main:

- `semantix`: customer dashboard and authenticated optimizer proxy.
- `tenant-studio`: store-scoped analytics, history/settings and management chat behind customer-service authentication.
- `dashboard-server`: reads saved instructions on each shopper message and records full transcripts.

Deploy Studio and the search server before the frontend. No database migration is required. Use the existing shared MongoDB and matching `STUDIO_CUSTOMER_API_TOKEN` on Studio and the frontend. Set `STUDIO_SERVICE_URL` on the frontend; no separate optimizer is required.

## Settings and history

- Instructions extend the existing base prompt and Beautics-specific guidance.
  Store background and an optional advanced base-prompt override are also editable.
- Saves update matching store accounts in a transaction with an audit record.
  A revision prevents overwriting changes saved by another editor.
  Clearing the advanced override restores the default prompt, including legacy fields.
- Activation is preserved: saving instructions never enables another store or API key.
  The search server bypasses its store-config cache for these prompt fields on each turn.
- History comes from the authenticated store's `concierge_conversations` collection.
  Search, date/content filters and 25-row pagination are supported. Transcript text
  is complete; raw model/tool payloads, costs and session identifiers stay internal.
- An October 19, 2026 read-only check found **869 Beautics conversation records,
  zero with saved message text**. These historical records appear as activity
  metadata. Their missing messages cannot be recovered by this feature. Full
  transcripts require new conversations after the updated search server is deployed.

## Dashboard performance

The analytics overview includes **ביצועי הקונסיירז׳** for
`woo-beautics-shop-co-il`. The authenticated dashboard response adds live,
aggregate-only data from that store's MongoDB, using the report's exact date
window (7/30/90 days). Other stores are unaffected; Studio requires no change.

`session_id` is a persistent browser ID in this store. Visits are reconstructed
with gaps of more than 30 minutes between observed searches, clicks, successful
carts, checkout events, activations and recorded conversation turns. Multiple
activations count once per visit. Only actions after its first activation count;
each stage is independent. Cart counts require `woocommerce_add_to_cart`, and
purchases require `checkout_completed` from `woocommerce_order_completed` with
a deduplicated order ID. Only `vis-` browser IDs participate in attribution.

The cards show gross recorded order amounts after activation, visits, recorded
cart/purchase rates and visits with dialogue. Amounts include the entire paid
order in the same visit, not just recommended items, without refund adjustment.
Each order ID counts once. Amounts are summed in integer minor units and grouped
by currency without currency conversion. Orders missing a valid nonnegative
amount or currency are excluded from the sum with explicit coverage; if all
amounts are missing the card shows unavailable instead of zero.
They describe subsequent activity in the same visit, including products outside
the chat. They do not claim direct chat clicks, confirmed reading or causal lift.
Identity coverage is available under **איך נספרים הביקורים**. Missing, failed or
truncated sources display an unavailable state instead of zero. No paid orders
in the window yields an unavailable purchase rate. Results are cached for up to
60 seconds, with bounded reads and no messages or shopper identifiers returned.

## Validation

Frontend: `npm run test:optimizer` and `npm run build`.
Studio: `npm test`.
Search server: `node --test concierge-settings.test.mjs tenants/beautics/concierge.test.mjs`.
The settings/history APIs were also verified against Beautics in read-only mode;
no production prompt edits or test conversations were created.
