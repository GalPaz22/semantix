
import { getServerSession } from "next-auth";
import { authOptions } from "../@/lib/auth/options";

export async function POST(request) {
    try {
        // 1. Auth Check - skip if you want public access, but usually required
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { dbName, startDate, endDate } = await request.json();

        if (!dbName) {
            return Response.json({ error: "Missing dbName" }, { status: 400 });
        }

        // 2. Fetch from External API
        // We fetch a larger limit to ensure we cover the requested time range if recent
        // The external API defaults to 100. Let's try to ask for more if possible, or handle pagination.
        // For now, we'll ask for 500 to be safe for "Last Week".
        const res = await fetch("https://dashboard-server-ae00.onrender.com/queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbName, limit: 1000 })
        });

        if (!res.ok) {
            throw new Error(`External API error: ${res.status}`);
        }

        const data = await res.json();
        const allQueries = data.queries || [];

        // 3. Strict Server-Side Filtering
        let filteredQueries = allQueries;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            filteredQueries = allQueries.filter(q => {
                if (!q.timestamp) return false;

                // Handle ISO String
                const qDate = new Date(q.timestamp);
                if (isNaN(qDate.getTime())) return false;

                return qDate >= start && qDate <= end;
            });
        }

        return Response.json({
            queries: filteredQueries,
            meta: {
                total: allQueries.length,
                filtered: filteredQueries.length,
                range: { startDate, endDate }
            }
        });

    } catch (error) {
        console.error("[API Queries] Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
