import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

const adminEmail = "galpaz2210@gmail.com"; // Admin user email

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: unauth() };
  if (session.user.email !== adminEmail) {
    return { error: NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 }) };
  }
  return { session };
}

/**
 * GET /api/admin/pinned-results?apiKey=xxx
 * Admin-only. Returns the pinned/promoted results + dbName for the target user.
 */
export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get("apiKey");
    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    const user = await users.findOne({ apiKey });
    if (!user) {
      return NextResponse.json({ error: "User not found with provided API key" }, { status: 404 });
    }

    const pinnedResults = Array.isArray(user.credentials?.pinnedResults)
      ? user.credentials.pinnedResults
      : [];
    const dbName = user.credentials?.dbName || user.dbName || "";

    return NextResponse.json({ pinnedResults, dbName });
  } catch (err) {
    console.error("❌ Error in admin pinned-results GET:", err);
    return NextResponse.json({
      error: "Failed to fetch pinned results",
      details: err.message,
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/pinned-results
 * Admin-only. Update the pinned/promoted results for a target user.
 *
 * Body:
 * {
 *   "apiKey": "target-user-api-key",
 *   "pinnedResults": [
 *     { "query": "שעון לנשים", "productIds": ["<_id>", "<_id>"], "products": [...], "enabled": true }
 *   ]
 * }
 */
export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { apiKey, pinnedResults } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }
    if (!Array.isArray(pinnedResults)) {
      return NextResponse.json({
        error: "pinnedResults must be an array of { query, productIds } objects",
      }, { status: 400 });
    }

    // Validate + normalize each rule
    const cleaned = [];
    for (const rule of pinnedResults) {
      if (!rule || typeof rule.query !== "string" || rule.query.trim() === "") {
        return NextResponse.json({
          error: "Each rule must have a non-empty 'query' string",
        }, { status: 400 });
      }
      if (!Array.isArray(rule.productIds)) {
        return NextResponse.json({
          error: `Rule "${rule.query}" must have a 'productIds' array`,
        }, { status: 400 });
      }

      const productIds = rule.productIds
        .filter((id) => typeof id === "string" && id.trim() !== "")
        .map((id) => id.trim());

      // Lightweight display metadata for the admin UI (server matching only uses productIds).
      const products = Array.isArray(rule.products)
        ? rule.products
            .filter((p) => p && typeof p._id === "string")
            .map((p) => ({
              _id: p._id,
              name: typeof p.name === "string" ? p.name : "",
              image: typeof p.image === "string" ? p.image : "",
              price: p.price ?? "",
            }))
        : [];

      cleaned.push({
        query: rule.query.trim(),
        productIds,
        products,
        enabled: rule.enabled === false ? false : true,
      });
    }

    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    const result = await users.updateOne(
      { apiKey },
      {
        $set: {
          "credentials.pinnedResults": cleaned,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found with provided API key" }, { status: 404 });
    }

    console.log(`✅ [ADMIN] Updated pinned results for apiKey ${apiKey.substring(0, 8)}… (${cleaned.length} rules)`);

    return NextResponse.json({
      success: true,
      message: "Pinned results updated successfully",
      pinnedResults: cleaned,
    });
  } catch (err) {
    console.error("❌ Error in admin pinned-results POST:", err);
    return NextResponse.json({
      error: "Failed to update pinned results",
      details: err.message,
    }, { status: 500 });
  }
}
