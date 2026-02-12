
import { getServerSession } from "next-auth";
import clientPromise from "../../../../../lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";
import { buildDynamicDateFilter } from "../../../../../lib/analytics-helper";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { dbName, startDate, endDate } = await request.json();

        let effectiveEndDate = endDate;
        if (endDate) {
            const endObj = new Date(endDate);
            endObj.setHours(23, 59, 59, 999);
            effectiveEndDate = endObj.toISOString();
        }

        if (!dbName) {
            return Response.json({ error: "Missing dbName" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(dbName);

        // Dynamic Filter Construction
        let cartFilter = {};
        let checkoutFilter = {};

        if (startDate && endDate) {
            const cartDateFilter = await buildDynamicDateFilter(db, "cart", startDate, effectiveEndDate);
            const checkoutDateFilter = await buildDynamicDateFilter(db, "checkout_events", startDate, effectiveEndDate);

            cartFilter = cartDateFilter;
            checkoutFilter = checkoutDateFilter;
        }

        // Parallel Fetch
        const [cart, checkout] = await Promise.all([
            db.collection("cart").find(cartFilter).sort({ timestamp: -1, created_at: -1 }).toArray().catch(e => []),
            db.collection("checkout_events").find(checkoutFilter).sort({ timestamp: -1, created_at: -1 }).toArray().catch(e => [])
        ]);

        return Response.json({
            cart,
            checkout,
            meta: {
                filters: { cart: cartFilter, checkout: checkoutFilter },
                counts: { cart: cart.length, checkout: checkout.length }
            }
        });

    } catch (error) {
        console.error("[API Performance] Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
