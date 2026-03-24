import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../@/lib/auth/options";
import clientPromise from "/lib/mongodb";

/**
 * POST /api/products/boost-category
 *
 * Set the boost level on ALL products belonging to a given category.
 *
 * Body:
 * {
 *   "dbName": "user_db",
 *   "category": "port wine",
 *   "categoryType": "soft" | "hard",
 *   "boost": 2
 * }
 */
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { dbName, category, categoryType, boost } = await request.json();

    if (!dbName || !category || !categoryType) {
      return NextResponse.json(
        { error: "dbName, category, and categoryType are required" },
        { status: 400 }
      );
    }

    if (typeof boost !== "number" || boost < 0) {
      return NextResponse.json(
        { error: "boost must be a non-negative number" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const collection = db.collection("products");

    // soft categories are stored as an array field; hard category is a string field
    const filter =
      categoryType === "soft"
        ? { softCategory: category }
        : { category: category };

    const result = await collection.updateMany(filter, {
      $set: { boost, updatedAt: new Date() },
    });

    console.log(
      `✅ Boosted ${result.modifiedCount} products in ${categoryType} category "${category}" to level ${boost}`
    );

    return NextResponse.json({
      success: true,
      updatedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (error) {
    console.error("❌ Error in boost-category:", error);
    return NextResponse.json(
      { error: "Failed to boost category", details: error.message },
      { status: 500 }
    );
  }
}
