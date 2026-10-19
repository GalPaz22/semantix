# Beautics concierge management

Open **צ׳אטבוט → שיחות לקוחות** for saved shopper conversations, or
**צ׳אטבוט → הוראות לקונסיירז׳** to edit the shopper bot's instructions.
The existing tenant-studio search-management assistant remains a separate tab.

## Release

Deploy all three repositories from main:

- `semantix`: customer dashboard and authenticated optimizer proxy.
- `search-optimizer`: store-scoped history/settings routes behind existing OPS authentication.
- `dashboard-server`: reads saved instructions on each shopper message and records full transcripts.

Deploy the optimizer and search server before the frontend. No new environment
variables or database migration are required. Use the existing shared MongoDB
and optimizer service credentials. `tenant-studio` needs no change for this feature.

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

## Validation

Frontend: `npm run test:optimizer` and `npm run build`.
Optimizer: `npm run build` and `npm test`.
Search server: `node --test concierge-settings.test.mjs tenants/beautics/concierge.test.mjs`.
The settings/history APIs were also verified against Beautics in read-only mode;
no production prompt edits or test conversations were created.
