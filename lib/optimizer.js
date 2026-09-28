// Server-side client for the search-optimizer API. Never import from the
// browser: it carries the ops password.

const BASE = (process.env.OPTIMIZER_URL || "").replace(/\/$/, "");

export const optimizerConfigured = () => Boolean(BASE);

export async function optimizer(path, { method = "GET", body } = {}) {
  if (!BASE) throw new Error("OPTIMIZER_URL is not configured");
  const headers = { "Content-Type": "application/json" };
  const password = process.env.OPTIMIZER_OPS_PASSWORD;
  if (password) headers.Authorization = "Basic " + Buffer.from(`semantix:${password}`).toString("base64");
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
