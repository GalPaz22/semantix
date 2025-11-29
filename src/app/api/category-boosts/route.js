import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

/**
 * GET /api/category-boosts
 * Get current category boost configuration for the logged-in user
 */
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauth();

  try {
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    const user = await users.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const boosts = user.credentials?.softCategoryBoosts || {};
    const softCategories = user.credentials?.softCategories || [];

    return NextResponse.json({
      softCategories,
      boosts
    });

  } catch (error) {
    console.error("❌ Error in category-boosts GET:", error);
    return NextResponse.json({
      error: "Failed to fetch category boosts",
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/category-boosts
 * Update category boost configuration for the logged-in user
 *
 * Body:
 * {
 *   "boosts": {
 *     "איטליה": 1.5,
 *     "צרפת": 2.0,
 *     "בשר אדום": 1.2
 *   }
 * }
 */
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauth();

  try {
    const body = await request.json();
    const { boosts } = body;

    if (!boosts || typeof boosts !== 'object') {
      return NextResponse.json({
        error: "boosts must be an object mapping category names to boost values"
      }, { status: 400 });
    }

    // Validate boost values
    for (const [category, value] of Object.entries(boosts)) {
      if (typeof value !== 'number' || value < 0 || value > 10) {
        return NextResponse.json({
          error: `Invalid boost value for "${category}". Must be a number between 0 and 10.`
        }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    // Update user's category boosts
    const result = await users.updateOne(
      { email: session.user.email },
      {
        $set: {
          "credentials.softCategoryBoosts": boosts,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(`✅ Updated category boosts for user: ${session.user.email}`);
    console.log(`   Boosts:`, boosts);

    return NextResponse.json({
      success: true,
      message: "Category boosts updated successfully",
      boosts
    });

  } catch (error) {
    console.error("❌ Error in category-boosts POST:", error);
    return NextResponse.json({
      error: "Failed to update category boosts",
      details: error.message
    }, { status: 500 });
  }
}
