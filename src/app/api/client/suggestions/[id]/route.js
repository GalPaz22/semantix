import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { authorizeTenantDb, tenantApiKey } from "/lib/tenant";
import { optimizer } from "/lib/optimizer";

// apply: live for everyone now · test: A/B test · dismiss: reject
const ACTIONS = {
  apply: (id) => [`/proposals/${id}/apply`, {}],
  test: (id) => [`/proposals/${id}/approve`, { start: true }],
  dismiss: (id) => [`/proposals/${id}/reject`, {}],
};

/* POST /api/client/suggestions/:id  { action, note?, dbName?(admin) } */
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { action, note, dbName } = await req.json();
    const tenant = await authorizeTenantDb(session, dbName);
    if (tenant.error) return tenant.error;
    if (!ACTIONS[action] || !/^[a-f0-9]{24}$/i.test(params.id)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const apiKey = await tenantApiKey(tenant);
    if (!apiKey) return Response.json({ error: "Store is not connected to the optimizer" }, { status: 404 });

    const [path, extra] = ACTIONS[action](params.id);
    const by = session.user.email || session.user.name || "client";
    const res = await optimizer(path, {
      method: "POST",
      body: { ...extra, by: `client:${by}`, tenant: apiKey, ...(action === "dismiss" && note ? { note: String(note).slice(0, 500) } : {}) },
    });
    if (!res.ok) {
      const status = res.status === 404 || res.status === 409 ? res.status : 502;
      return Response.json({ error: res.data?.error || "The change could not be completed" }, { status });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[API client/suggestions/:id] Error:", error);
    return Response.json({ error: "The change could not be completed" }, { status: 500 });
  }
}
