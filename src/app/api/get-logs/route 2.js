import { NextResponse } from "next/server";
import clientPromise from "/lib/mongodb.js";

export async function GET(req) {
  const dbName = req.nextUrl.searchParams.get("dbName");
  if (!dbName) {
    return NextResponse.json({ error: "missing dbName" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const doc = await client
      .db("users")
      .collection("sync_status")
      .findOne({ dbName }, { projection: { _id: 0, logs: 1 } });

    return NextResponse.json({ logs: doc?.logs || [] });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
} 