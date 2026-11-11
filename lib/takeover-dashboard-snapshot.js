// This is a saved reporting snapshot, independent of live event collection and
// experiment allocation. Refreshes and deployments must never regenerate it.
export const TAKEOVER_SNAPSHOT_ID = 'search-cart-week-2026-11-11';
const WEEK_MS = 7 * 24 * 3600000;

export async function readFrozenTakeoverAnalytics(client, dbName) {
  if (dbName !== 'steimatzky') throw Object.assign(new Error('הניסוי אינו זמין בחנות זו'), { status: 404 });
  const saved = await client.db(dbName).collection('dashboard_snapshots').findOne(
    { _id: TAKEOVER_SNAPSHOT_ID },
    { projection: { _id: 0, report: 1, frozenAt: 1 }, maxTimeMS: 5000 },
  );
  const window = saved?.report?.searchConversion?.window;
  if (!saved?.report?.measurement?.complete || !saved.report.searchConversion?.complete || !saved.frozenAt
    || Date.parse(window?.observedUntil) - Date.parse(window?.from) !== WEEK_MS) {
    throw Object.assign(new Error('תמונת המצב הנעולה אינה זמינה כרגע'), { status: 503 });
  }
  return { ...structuredClone(saved.report), snapshot: { id: TAKEOVER_SNAPSHOT_ID, mode: 'frozen', periodDays: 7, frozenAt: saved.frozenAt } };
}
