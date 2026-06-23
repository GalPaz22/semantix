import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "../../../../../lib/mongodb";
import { getUserBySession } from "../../../../../lib/getUserBySession";
import {
  isImpactSnapshotStale,
  readImpactSnapshot,
  refreshImpactSnapshot,
} from "../../../../../lib/impact-analytics-cache";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action = "get", days = 30 } = await request.json();
    const safeDays = [1, 7, 30].includes(Number(days)) ? Number(days) : 30;
    const client = await clientPromise;
    const user = await getUserBySession(
      client.db("users"),
      session.user,
      { dbName: 1, credentials: 1 }
    );
    const dbName = user?.credentials?.dbName || user?.dbName;
    if (!dbName) {
      return Response.json({ error: "Analytics database not configured" }, { status: 404 });
    }

    if (action === "refresh") {
      const snapshot = await refreshImpactSnapshot(client, dbName, safeDays);
      return Response.json({
        snapshot: snapshot?.impact || null,
        meta: {
          generatedAt: snapshot?.generatedAt || null,
          stale: isImpactSnapshotStale(snapshot),
          refreshing: Boolean(snapshot?.refreshingUntil && new Date(snapshot.refreshingUntil) > new Date()),
        },
      });
    }

    let snapshot = await readImpactSnapshot(client, dbName, safeDays);
    if (!snapshot?.impact) {
      snapshot = await refreshImpactSnapshot(client, dbName, safeDays);
    }

    return Response.json({
      snapshot: snapshot?.impact || null,
      meta: {
        generatedAt: snapshot?.generatedAt || null,
        stale: isImpactSnapshotStale(snapshot),
        refreshing: Boolean(snapshot?.refreshingUntil && new Date(snapshot.refreshingUntil) > new Date()),
      },
    });
  } catch (error) {
    console.error("[Impact Cache] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
