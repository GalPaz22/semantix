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
      const cartItems = await db
        .collection("cart")
        .find(matchStage)
        .sort({ timestamp: -1 })
        .toArray();

      // Helper: resolve the effective numeric price from an item (checks both field names)
      function effectivePrice(item) {
        const raw = item.price ?? item.product_price ?? "0";
        return parseFloat(String(raw).replace(/[^0-9.]/g, "")) || 0;
      }

      // --- Price enrichment ---
      // For items where both price fields are 0/null/empty, look up the product doc
      const itemsMissingPrice = cartItems.filter(item => effectivePrice(item) === 0);

      if (itemsMissingPrice.length > 0) {
        // Collect unique product_ids and product_names for batch lookup
        const missingIds = [...new Set(itemsMissingPrice.map(i => i.product_id).filter(Boolean))];
        const missingNames = [...new Set(itemsMissingPrice.map(i => i.product_name || i.name).filter(Boolean))];

        // Build a combined price map keyed by String(id) and by name
        const priceMap = {}; // key → price

        if (missingIds.length > 0) {
          const numericIds = missingIds.map(Number).filter(n => !isNaN(n));
          const allIds = [...missingIds, ...numericIds];
          const byId = await db
            .collection("products")
            .find({ id: { $in: allIds } }, { projection: { id: 1, name: 1, price: 1, regular_price: 1 } })
            .toArray();
          console.log(`[cart-analytics] id lookup: ${missingIds.length} ids → ${byId.length} docs`);
          for (const doc of byId) {
            const p = doc.price || doc.regular_price;
            if (doc.id != null && p) priceMap[`id:${doc.id}`] = p;
            if (doc.name && p) priceMap[`name:${doc.name}`] = p;
          }
        }

        // Name-based fallback for any that still didn't match
        const stillMissingNames = missingNames.filter(n => !priceMap[`name:${n}`]);
        if (stillMissingNames.length > 0) {
          const byName = await db
            .collection("products")
            .find({ name: { $in: stillMissingNames } }, { projection: { name: 1, price: 1, regular_price: 1 } })
            .toArray();
          console.log(`[cart-analytics] name lookup: ${stillMissingNames.length} names → ${byName.length} docs`);
          for (const doc of byName) {
            const p = doc.price || doc.regular_price;
            if (doc.name && p) priceMap[`name:${doc.name}`] = p;
          }
        }

        // Apply resolved prices
        for (const item of cartItems) {
          if (effectivePrice(item) !== 0) continue;
          const resolved =
            (item.product_id != null && priceMap[`id:${item.product_id}`]) ||
            (item.product_id != null && priceMap[`id:${Number(item.product_id)}`]) ||
            priceMap[`name:${item.product_name || item.name}`] ||
            null;
          if (resolved != null) {
            item.price = resolved;
            item.product_price = String(resolved);
          }
        }
      }

      // --- Session-based click-to-cart cross-reference ---
      // Find product_click events that share a session_id with a cart add,
      // matching on product_id — these represent reranked search clicks that converted.
      let clickToCartCount = 0;
      let clickToCartSessions = 0;
      let zeroResultsCartCount = 0;
      let zeroResultsCartSessions = 0;
      try {
        const sessionIds = [...new Set(cartItems.map(i => i.session_id).filter(Boolean))];
        if (sessionIds.length > 0) {
          // Build a set of "session:product" keys from cart items
          const cartKeys = new Set(
            cartItems
              .filter(i => i.session_id && i.product_id)
              .map(i => `${i.session_id}:${String(i.product_id)}`)
          );

          // Fetch product_clicks that share any of these session_ids
          const [clickDocs, zeroResultsClickDocs] = await Promise.all([
            db.collection("product_clicks")
              .find(
                { session_id: { $in: sessionIds } },
                { projection: { session_id: 1, product_id: 1 } }
              )
              .toArray(),
            db.collection("product_clicks")
              .find(
                { session_id: { $in: sessionIds }, source: { $in: ["zero-results", "inject"] } },
                { projection: { session_id: 1, product_id: 1 } }
              )
              .toArray()
          ]);

          // Count clicks whose (session_id + product_id) pair also appears in cart
          const matchedSessions = new Set();
          for (const click of clickDocs) {
            const key = `${click.session_id}:${String(click.product_id)}`;
            if (cartKeys.has(key)) {
              clickToCartCount++;
              matchedSessions.add(click.session_id);
            }
          }
          clickToCartSessions = matchedSessions.size;

          // Count zero-results inject clicks that converted to cart adds
          const zeroResultsMatchedSessions = new Set();
          for (const click of zeroResultsClickDocs) {
            const key = `${click.session_id}:${String(click.product_id)}`;
            if (cartKeys.has(key)) {
              zeroResultsCartCount++;
              zeroResultsMatchedSessions.add(click.session_id);
            }
          }
          zeroResultsCartSessions = zeroResultsMatchedSessions.size;
        }
      } catch (e) {
        console.log("[cart-analytics] click-to-cart cross-reference skipped:", e.message);
      }

      // Get some basic analytics
      const totalCartItems = cartItems.length;
      const uniqueQueries = new Set(cartItems.map(item => item.search_query)).size;
      const uniqueProducts = new Set(cartItems.map(item => item.product_id)).size;

      return Response.json({
        cartItems,
        analytics: {
          totalCartItems,
          uniqueQueries,
          uniqueProducts,
          clickToCartCount,         // # of product clicks (from search) that led to a cart add in same session
          clickToCartSessions,      // # of unique sessions where a search click converted to cart
          zeroResultsCartCount,     // # of zero-results inject clicks that converted to cart adds
          zeroResultsCartSessions   // # of unique sessions where a zero-results inject click converted to cart
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