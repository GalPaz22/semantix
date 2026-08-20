import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";
import { getUserBySession } from "/lib/getUserBySession";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

function normalizePinnedResults(pinnedResults) {
  if (!Array.isArray(pinnedResults)) {
    return { error: "pinnedResults must be an array" };
  }

  const cleaned = [];
  for (const rule of pinnedResults) {
    if (!rule || typeof rule.query !== "string" || !rule.query.trim()) {
      return { error: "Each rule must have a non-empty 'query' string" };
    }
    if (!Array.isArray(rule.productIds)) {
      return { error: `Rule "${rule.query}" must have a 'productIds' array` };
    }

    const productIds = rule.productIds
      .filter((id) => typeof id === "string" && id.trim())
      .map((id) => id.trim());
    const products = Array.isArray(rule.products)
      ? rule.products
          .filter((product) => product && typeof product._id === "string")
          .map((product) => ({
            _id: product._id,
            name: typeof product.name === "string" ? product.name : "",
            image: typeof product.image === "string" ? product.image : "",
            price: product.price ?? "",
          }))
      : [];

    cleaned.push({
      query: rule.query.trim(),
      productIds,
      products,
      enabled: rule.enabled !== false,
    });
  }

  return { cleaned };
}

async function getLoggedInUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return {};

  const client = await clientPromise;
  const db = client.db("users");
  const user = await getUserBySession(db, session.user);
  return { db, user };
}

export async function GET() {
  try {
    const { user } = await getLoggedInUser();
    if (!user) return unauth();

    return NextResponse.json({
      pinnedResults: Array.isArray(user.credentials?.pinnedResults)
        ? user.credentials.pinnedResults
        : [],
      dbName: user.credentials?.dbName || user.dbName || "",
    });
  } catch (error) {
    console.error("❌ Error in pinned-results GET:", error);
    return NextResponse.json(
      { error: "Failed to fetch pinned results", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { db, user } = await getLoggedInUser();
    if (!user) return unauth();

    const body = await request.json();
    const { cleaned, error } = normalizePinnedResults(body.pinnedResults);
    if (error) return NextResponse.json({ error }, { status: 400 });

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          "credentials.pinnedResults": cleaned,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Pinned results updated successfully",
      pinnedResults: cleaned,
    });
  } catch (error) {
    console.error("❌ Error in pinned-results POST:", error);
    return NextResponse.json(
      { error: "Failed to update pinned results", details: error.message },
      { status: 500 }
    );
  }
}
