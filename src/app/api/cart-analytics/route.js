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
    const { dbName, type, startDate, endDate } = body;

    console.log("[API Cart-Analytics] Request:", { dbName, type, startDate, endDate });

    if (!dbName) {
      return Response.json({ error: "Missing dbName parameter" }, { status: 400 });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(dbName);

    const matchStage = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const startSeconds = Math.floor(start.getTime() / 1000);
      const endSeconds = Math.floor(end.getTime() / 1000);

      const startISO = start.toISOString();
      const endISO = end.toISOString();

      // Support varied timestamp formats (Date object, ISO String, Unix Seconds)
      matchStage.$or = [
        // Date Objects
        { timestamp: { $gte: start, $lte: end } },
        { created_at: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } },

        // ISO Strings (Lexicographical output works for ISO dates)
        { timestamp: { $gte: startISO, $lte: endISO } },
        { created_at: { $gte: startISO, $lte: endISO } },
        { createdAt: { $gte: startISO, $lte: endISO } },

        // Unix Timestamp (Seconds)
        { timestamp: { $gte: startSeconds, $lte: endSeconds } },
        { time: { $gte: startSeconds, $lte: endSeconds } },
        { event_time: { $gte: startSeconds, $lte: endSeconds } },

        // Unix Timestamp (Milliseconds - just in case)
        { timestamp: { $gte: start.getTime(), $lte: end.getTime() } }
      ];
    }

    if (type === "clicks") {
      // Fetch product click events from the 'product_clicks' collection
      const collections = await db.listCollections().toArray();
      const hasProductClicks = collections.some(col => col.name === "product_clicks");

      let clickEvents = [];
      if (hasProductClicks) {
        try {
          clickEvents = await db
            .collection("product_clicks")
            .find(matchStage)
            .sort({ timestamp: -1 })
            .toArray();
        } catch (error) {
          console.log("Error fetching product clicks:", error);
          clickEvents = [];
        }
      }

      return Response.json({
        clickEvents,
        analytics: {
          totalClicks: clickEvents.length,
          uniqueQueries: clickEvents.length > 0 ? new Set(clickEvents.map(item => item.search_query)).size : 0,
          uniqueProducts: clickEvents.length > 0 ? new Set(clickEvents.map(item => item.product_id)).size : 0
        }
      });
    } else if (type === "checkout") {
      // Check if checkout_events collection exists
      const collections = await db.listCollections().toArray();
      const hasCheckoutEvents = collections.some(col => col.name === "checkout_events");

      let checkoutEvents = [];
      if (hasCheckoutEvents) {
        // Fetch checkout events from the 'checkout_events' collection
        try {
          checkoutEvents = await db
            .collection("checkout_events")
            .find(matchStage)
            .sort({ timestamp: -1 }) // Most recent first
            .toArray();
        } catch (error) {
          console.log("Error fetching checkout events:", error);
          checkoutEvents = [];
        }
      }

      return Response.json({
        checkoutEvents,
        analytics: {
          totalCheckoutEvents: checkoutEvents.length,
          uniqueQueries: checkoutEvents.length > 0 ? new Set(checkoutEvents.map(item => item.search_query)).size : 0,
          uniqueProducts: checkoutEvents.length > 0 ? new Set(checkoutEvents.map(item => item.product_id)).size : 0
        }
      });
    } else {
      // Default: fetch cart items from the 'cart' collection
      // These are items added to cart after a search query
      const cartItems = await db
        .collection("cart")
        .find(matchStage)
        .sort({ timestamp: -1 }) // Most recent first
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
    }
  } catch (error) {
    console.error("Error fetching cart analytics:", error);
    return Response.json(
      { error: "Failed to fetch cart analytics" },
      { status: 500 }
    );
  }
} 