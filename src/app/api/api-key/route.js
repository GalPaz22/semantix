import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import { getUserBySession } from "/lib/getUserBySession";
import crypto from "crypto";

const unauth = () => NextResponse.json({ error: "Unauthorised" }, { status: 401 });

/* GET – return current key */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauth();

  const client = await clientPromise;
  const db = client.db("users");
  const user = await getUserBySession(db, session.user, { apiKey: 1 });

  return NextResponse.json({ key: user?.apiKey ?? "" });
}

/* POST – create + persist a new key */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauth();

  const client = await clientPromise;
  const db = client.db("users");
  const user = await getUserBySession(db, session.user, { _id: 1 });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newKey = crypto.randomBytes(16).toString("hex");
  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { apiKey: newKey } }
  );

  return NextResponse.json({ key: newKey });
}
