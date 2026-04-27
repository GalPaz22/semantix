import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import { getUserBySession } from "/lib/getUserBySession";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  console.log("[get-onboarding]", session.user.email || session.user.id);

  try {
    const client = await clientPromise;
    const db = client.db("users");

    const userDoc = await getUserBySession(db, session.user);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Strip sensitive fields before returning
    delete userDoc.password;
    delete userDoc.shopifyToken;
    delete userDoc.shopifyAccessToken;

    console.log("[get-onboarding] found:", userDoc.email || userDoc.username);
    return NextResponse.json({ onboarding: userDoc });

  } catch (error) {
    console.error("Error fetching onboarding details:", error);
    return NextResponse.json({ error: "Failed to fetch onboarding details" }, { status: 500 });
  }
}