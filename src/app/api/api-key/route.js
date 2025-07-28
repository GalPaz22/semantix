import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import crypto from "crypto";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

/* ----------------------------------------------------------------- */
/*  GET – return current key                                         */
/* ----------------------------------------------------------------- */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauth();

  const client = await clientPromise;
  const db = client.db("users");
  const users = db.collection("users");
  const user = await users.findOne(
    { email: session.user.email },
    { projection: { apiKey: 1 } }
  );

  return NextResponse.json({ key: user?.apiKey ?? "" });
}

/* ----------------------------------------------------------------- */
/*  POST – create + persist a new key                                */
/* ----------------------------------------------------------------- */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauth();

  const client = await clientPromise;
  const db = client.db("users");
  const users = db.collection("users");

  // Generate a cheap 32‑hex‑chars random key
  const newKey = crypto.randomBytes(16).toString("hex");

  await users.updateOne(
    { email: session.user.email },
    { $set: { apiKey: newKey } },
    { upsert: true }
  );

  return NextResponse.json({ key: newKey });
}