import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { authorizeTenantDb, tenantApiKey } from "/lib/tenant";
import { optimizer, optimizerConfigured } from "/lib/optimizer";
import { demoSuggestions, suggestionsDemoEnabled } from "/lib/suggestions-demo";

export const dynamic = "force-dynamic";

const MAX_SUGGESTIONS = 3;
// Patch keys the optimizer can apply without a test (engine/promote.ts).
const PERMANENT_KEYS = ["softCategoriesBoost", "pinnedResults", "categoryAssociation", "productBoosts"];

function toSuggestion(p) {
  const variant = p.draftExperiment?.arms?.find((a) => a.key !== "control");
  const isCatalog = p.kind === "catalogFilter";
  return {
    id: String(p._id),
    kind: isCatalog ? "catalog" : "ranking",
    title: p.draftExperiment?.name || (isCatalog ? `סינון חדש: ${p.catalogChange?.filter}` : "הצעה לשיפור"),
    summary: p.clientSummary || p.hypothesis,
    queries: p.draftExperiment?.targeting?.patterns || [],
    productCount: isCatalog ? p.catalogChange?.productIds?.length || 0 : null,
    canApply: isCatalog || Object.keys(variant?.patch || {}).some((k) => PERMANENT_KEYS.includes(k)),
    canTest: !isCatalog,
    createdAt: p.createdAt,
  };
}

async function testStatus(exp) {
  const { data } = await optimizer(`/experiments/${exp._id}/metrics`).catch(() => ({ data: {} }));
  const latest = data?.latest;
  const started = exp.statusHistory?.find((h) => h.status === "running")?.at;
  const stats = latest?.stats || {};
  const winProb = stats.probBestConv ?? stats.probBestClick ?? null;
  return {
    id: String(exp._id),
    title: exp.name,
    status: exp.status,
    startedAt: started || null,
    appliedAt: exp.statusHistory?.find((h) => h.status === "promoted")?.at || null,
    sessions: (latest?.arms || []).reduce((s, a) => s + (a.sessions || 0), 0),
    winProbability: winProb,
    winMetric: stats.probBestConv != null ? "conversion" : stats.probBestClick != null ? "clicks" : null,
  };
}

/* GET /api/client/suggestions[?dbName=<admin only>] */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const tenant = await authorizeTenantDb(session, searchParams.get("dbName") || undefined);
    if (tenant.error) return tenant.error;
    if (suggestionsDemoEnabled()) return Response.json(await demoSuggestions(tenant.dbName));
    if (!optimizerConfigured()) return Response.json({ available: false, suggestions: [], tests: [] });

    const apiKey = await tenantApiKey(tenant);
    if (!apiKey) return Response.json({ available: false, suggestions: [], tests: [] });

    const q = encodeURIComponent(apiKey);
    const [proposals, experiments] = await Promise.all([
      optimizer(`/proposals?status=pending&tenant=${q}`),
      optimizer(`/experiments?tenant=${q}`),
    ]);
    if (!proposals.ok) throw new Error(`optimizer proposals: ${proposals.status}`);

    const suggestions = (proposals.data || []).slice(0, MAX_SUGGESTIONS).map(toSuggestion);
    const recent = (experiments.ok ? experiments.data : [])
      .filter((e) => ["running", "paused", "completed", "promoted"].includes(e.status))
      .slice(0, 5);
    const tests = await Promise.all(recent.map(testStatus));

    return Response.json({ available: true, suggestions, tests });
  } catch (error) {
    console.error("[API client/suggestions] Error:", error);
    return Response.json({ error: "Failed to load suggestions" }, { status: 500 });
  }
}
