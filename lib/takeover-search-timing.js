// Only the server-stamped request start can precede the asynchronous query log.
// Legacy rows retain their original timestamp; no inferred or client clock backfill.
export function hasServerSearchStart(row) {
  if (row.search_started_at == null) return false;
  const started = +new Date(row.search_started_at), logged = +new Date(row.timestamp);
  return Number.isFinite(started) && Number.isFinite(logged) && started <= logged;
}
export const searchStartedAt = row => +new Date(hasServerSearchStart(row) ? row.search_started_at : row.timestamp);
