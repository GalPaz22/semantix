import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

/**
 * API endpoint to fetch cart analytics data
 * POST /api/cart-analytics
 * Body: { dbName: string }
 */
export async function POST(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { dbName } = body;

    if (!dbName) {
      return Response.json({ error: "Missing dbName parameter" }, { status: 400 });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(dbName);

    // Fetch cart items from the 'cart' collection
    // These are items added to cart after a search query
    const cartItems = await db
      .collection("cart")
      .find({})
      .sort({ timestamp: -1 }) // Most recent first
      .limit(1000) // Reasonable limit
      .toArray();

    // Get some basic analytics
    const totalCartItems = cartItems.length;
    const uniqueQueries = new Set(cartItems.map(item => item.search_query)).size;
    const uniqueProducts = new Set(cartItems.map(item => item.product_id)).size;

    // Return the data
    return Response.json({
      cartItems,
      analytics: {
        totalCartItems,
        uniqueQueries,
        uniqueProducts
      }
    });
  } catch (error) {
    console.error("Error fetching cart analytics:", error);
    return Response.json(
      { error: "Failed to fetch cart analytics" },
      { status: 500 }
    );
  }
} 