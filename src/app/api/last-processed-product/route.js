import { getServerSession }   from "next-auth";
import { authOptions }        from "../auth/[...nextauth]/route";
import clientPromise          from "/lib/mongodb";

/* GET /api/last-processed-product?dbName=<n> */
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error:"Unauthorized" }, { status:401 });
  }

  const { searchParams } = new URL(req.url);
  const dbName = searchParams.get("dbName") || "users"; // Default to "users" if not provided
  
  try {
    const client = await clientPromise;
    const db = client.db(dbName);

    // Get total number of products
    const totalProducts = await db
      .collection("products")
      .countDocuments();

    // Get number of processed products (those with images)
    const processedCount = await db
      .collection("products")
      .countDocuments({ 
        image: { $exists: true, $ne: null },
        fetchedAt: { $exists: true }
      });

    // Get the most recently processed product
    const product = await db
      .collection("products")
      .find({ image:{ $exists:true, $ne:null } })
      .project({ _id:0, id:1, name:1, image:1 })
      .sort({ fetchedAt:-1 })            // newest first
      .limit(1)
      .next();

    return Response.json({ 
      product: product ?? null,
      totalProducts,
      processedCount
    });
  } catch (e) {
    console.error("[last-product]", e);
    return Response.json({ 
      product: null,
      totalProducts: 0,
      processedCount: 0
    });
  }
}
