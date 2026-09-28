import { getServerSession } from "next-auth";
import clientPromise from "/lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";
import { authorizeTenantDb } from "/lib/tenant";

/**
 * API endpoint to fetch products that have a boost level > 0
 * POST /api/analytics/boosted-products
 * Body: { dbName: string }
 */
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { dbName: requestedDbName } = await request.json();

        const tenant = await authorizeTenantDb(session, requestedDbName);
        if (tenant.error) return tenant.error;
        const dbName = tenant.dbName;

        const client = await clientPromise;
        const db = client.db(dbName);

        // Fetch products with boost > 0
        const boostedProducts = await db
            .collection("products")
            .find({ boost: { $gt: 0 } }, {
                projection: {
                    id: 1,
                    name: 1,
                    image: 1,
                    price: 1,
                    boost: 1,
                    url: 1
                }
            })
            .toArray();

        return Response.json({ boostedProducts });
    } catch (error) {
        console.error("[API Boosted Products] Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
