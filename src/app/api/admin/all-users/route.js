import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "../../../../../lib/mongodb";

const adminEmail = "galpaz2210@gmail.com";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (session.user.email !== adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("users");
    const users = await db.collection("users").find(
      {},
      { projection: { name: 1, email: 1, active: 1, createdAt: 1, "credentials.dbName": 1, onboardingComplete: 1 } }
    ).toArray();

    const result = users
      .map(u => ({
        id: u._id.toString(),
        name: u.name || u.email || "Unknown",
        email: u.email,
        dbName: u.credentials?.dbName || null,
        active: u.active !== false,
        onboardingComplete: u.onboardingComplete || false,
        createdAt: u.createdAt || null,
      }))
      .filter(u => u.dbName) // only users with a store DB
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return NextResponse.json({ users: result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
