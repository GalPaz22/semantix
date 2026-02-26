import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

const adminEmail = "galpaz2210@gmail.com";

/**
 * POST /api/admin/set-user-active
 * Body: { apiKey, active: true|false }
 */
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (session.user.email !== adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { apiKey, active } = await request.json();

    if (!apiKey) return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    if (typeof active !== 'boolean') return NextResponse.json({ error: "active must be boolean" }, { status: 400 });

    const client = await clientPromise;
    const users = client.db("users").collection("users");

    const result = await users.updateOne({ apiKey }, { $set: { active, updatedAt: new Date() } });

    if (result.matchedCount === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

    console.log(`✅ Admin set active=${active} for apiKey: ${apiKey}`);
    return NextResponse.json({ success: true, active });

  } catch (error) {
    console.error("❌ Error in set-user-active:", error);
    return NextResponse.json({ error: "Failed to update", details: error.message }, { status: 500 });
  }
}
