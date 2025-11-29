import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

const adminEmail = "galpaz2210@gmail.com"; // Admin user email

/**
 * POST /api/admin/update-user-config
 *
 * Admin endpoint to update user's categories, types, soft categories, and category boosts
 *
 * Body:
 * {
 *   "apiKey": "user-api-key-here",
 *   "categories": ["Cat1", "Cat2"],
 *   "types": ["Type1", "Type2"],
 *   "softCategories": ["Soft1", "Soft2"],
 *   "softCategoryBoosts": { "Soft1": 1.5, "Soft2": 2.0 } // optional
 * }
 */
export async function POST(request) {
  // Check if user is authenticated and is admin
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauth();
  
  // Only allow admin user
  if (session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { apiKey, categories, types, softCategories, softCategoryBoosts } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    if (!Array.isArray(categories) || !Array.isArray(types) || !Array.isArray(softCategories)) {
      return NextResponse.json({
        error: "categories, types, and softCategories must be arrays"
      }, { status: 400 });
    }

    // Initialize boosts if not provided
    let boosts = softCategoryBoosts;
    if (!boosts || typeof boosts !== 'object') {
      boosts = {};
      softCategories.forEach(category => {
        boosts[category] = 1.0;
      });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    // Find user by API key
    const user = await users.findOne({ apiKey });

    if (!user) {
      return NextResponse.json({ error: "User not found with provided API key" }, { status: 404 });
    }

    // Update user's configuration
    const result = await users.updateOne(
      { apiKey },
      {
        $set: {
          "credentials.categories": categories,
          "credentials.type": types,
          "credentials.softCategories": softCategories,
          "credentials.softCategoryBoosts": boosts,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Failed to update user configuration" }, { status: 500 });
    }

    console.log(`✅ Admin updated configuration for user: ${user.email}`);
    console.log(`   Categories: ${categories.length}, Types: ${types.length}, Soft Categories: ${softCategories.length}`);

    return NextResponse.json({
      success: true,
      message: "User configuration updated successfully",
      updated: {
        categoriesCount: categories.length,
        typesCount: types.length,
        softCategoriesCount: softCategories.length
      }
    });

  } catch (error) {
    console.error("❌ Error in admin update-user-config:", error);
    return NextResponse.json({ 
      error: "Failed to update configuration",
      details: error.message 
    }, { status: 500 });
  }
}

