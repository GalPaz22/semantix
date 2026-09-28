import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import { authorizeTenantDb } from "/lib/tenant";
import { clientSearchAnalytics } from "/lib/client-analytics";

export const dynamic = "force-dynamic";

/* GET /api/client/analytics?days=7|30|90[&dbName=<admin only>] */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const tenant = await authorizeTenantDb(session, searchParams.get("dbName") || undefined);
    if (tenant.error) return tenant.error;

    const days = [7, 30, 90].includes(Number(searchParams.get("days"))) ? Number(searchParams.get("days")) : 30;
    const client = await clientPromise;
    const data = await clientSearchAnalytics(client.db(tenant.dbName), { days });
    return Response.json(data);
  } catch (error) {
    console.error("[API client/analytics] Error:", error);
    return Response.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
