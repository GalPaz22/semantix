import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import crypto from "crypto";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { shop } = await request.json();
  if (!shop) {
    return NextResponse.json({ error: "Shop required" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("users");

  const pending = await db.collection("pending_installations").findOne({ shop });
  if (!pending) {
    return NextResponse.json({ error: "No pending installation found for this shop" }, { status: 404 });
  }

  const { accessToken, scope } = pending;
  const userEmail = session.user.email;

  await db.collection("users").updateOne(
    { email: userEmail },
    {
      $set: {
        shopifyAccessToken: accessToken,
        shopifyShop: shop,
        shopifyConnected: true,
        shopifyConnectedAt: new Date(),
        shopifyScope: scope || "",
        shopifyTokenType: "bearer",
      },
    }
  );

  await db.collection("shopify_installations").updateOne(
    { shop, userEmail },
    {
      $set: {
        accessToken,
        scope: scope || "",
        active: true,
        installedAt: new Date(),
      },
      $setOnInsert: {
        installationId: crypto.randomUUID(),
        shop,
        userEmail,
      },
    },
    { upsert: true }
  );

  await db.collection("pending_installations").deleteOne({ shop });

  console.log(`Shopify installation claimed: ${shop} → ${userEmail}`);
  return NextResponse.json({ success: true });
}
