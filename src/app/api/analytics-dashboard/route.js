
import { getServerSession } from "next-auth"; // Assuming authOptions are available or can be configured
import clientPromise from "../../../../lib/mongodb"; // Adjust relative path
import { authOptions } from "@/lib/auth/options"; // Adjust relative path

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { dbName, startDate, endDate } = await request.json();

        if (!dbName) {
            return Response.json({ error: "Missing dbName" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(dbName);

        // Build Match Stage for Mongo
        const matchStage = {};
        let start, end, startISO, endISO, startSeconds, endSeconds;

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            startISO = start.toISOString();
            endISO = end.toISOString();
            startSeconds = Math.floor(start.getTime() / 1000);
            endSeconds = Math.floor(end.getTime() / 1000);

            matchStage.$or = [
                // Date Objects
                { timestamp: { $gte: start, $lte: end } },
                { created_at: { $gte: start, $lte: end } },
                { createdAt: { $gte: start, $lte: end } },

                // Strings (ISO)
                { timestamp: { $gte: startISO, $lte: endISO } },
                { created_at: { $gte: startISO, $lte: endISO } },
                { createdAt: { $gte: startISO, $lte: endISO } },

                // Numbers (Seconds)
                { timestamp: { $gte: startSeconds, $lte: endSeconds } },
                { time: { $gte: startSeconds, $lte: endSeconds } },
                { event_time: { $gte: startSeconds, $lte: endSeconds } },

                // Milliseconds
                { timestamp: { $gte: start.getTime(), $lte: end.getTime() } }
            ];
        }

        // Parallel Fetching
        const [cartItems, checkoutEvents, queriesRes] = await Promise.all([
            db.collection("cart").find(matchStage).sort({ timestamp: -1 }).toArray().catch(e => []),
            db.collection("checkout_events").find(matchStage).sort({ timestamp: -1 }).toArray().catch(e => []),
            fetch("https://dashboard-server-ae00.onrender.com/queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dbName })
            }).then(res => res.json()).catch(e => [])
        ]);

        // Filter Queries (Client-side logic moved to Server)
        let filteredQueries = queriesRes;
        if (startDate && endDate && Array.isArray(queriesRes)) {
            filteredQueries = queriesRes.filter(q => {
                if (!q.timestamp) return false;

                let qTime = new Date(q.timestamp).getTime();
                // Handle seconds vs milliseconds. If time is small (e.g. < 200000000000 = year 1976 in ms), assume seconds
                // Current timestamp is ~1.7e9 (seconds) or ~1.7e12 (ms).
                if (qTime < 1000000000000 && qTime > 0) {
                    qTime *= 1000;
                }

                const qDate = new Date(qTime);
                return qDate >= start && qDate <= end;
            });
        }

        return Response.json({
            cart: cartItems,
            checkout: checkoutEvents,
            queries: filteredQueries,
            meta: {
                filter: { startDate, endDate },
                counts: {
                    cart: cartItems.length,
                    checkout: checkoutEvents.length,
                    queries: filteredQueries.length,
                    rawQueries: Array.isArray(queriesRes) ? queriesRes.length : 0
                }
            }
        });

    } catch (error) {
        console.error("Dashboard Analytics Error:", error);
        return Response.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
