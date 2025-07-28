import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

/* GET /api/latest-products?dbName=<n>&count=<number> */
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dbName = searchParams.get("dbName");
  const count = parseInt(searchParams.get("count") || "1", 10);

  if (!dbName) {
    return Response.json({ error: "dbName is required" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    
    // Get only the most recently processed products
    const products = await client
      .db(dbName)
      .collection("products")
      .find({ 
        embedding: { $exists: true, $ne: null },
        fetchedAt: { $exists: true }
      })
      .project({ _id: 0, id: 1, name: 1, image: 1, fetchedAt: 1 })
      .sort({ fetchedAt: -1 }) // Sort by most recent first
      .limit(count)
      .toArray();

    console.log(`Returning ${products.length} most recently processed products`);
    
    return Response.json({ products });
  } catch (e) {
    console.error("[latest-products]", e);
    return Response.json({ products: [] });
  }
} 