import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

/**
 * API endpoint to check if a URL already exists in the users collection
 * POST /api/check-existing-url
 * Body: { url: string }
 */
export async function POST(req) {
  try {
    // Ensure user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL for comparison (remove protocol, www, trailing slashes)
    const normalizedUrl = normalizeUrl(url);

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("users");

    // Check if URL exists in users collection
    const existingUser = await db.collection("users").findOne({
      $or: [
        { "credentials.shopifyDomain": { $regex: normalizedUrl, $options: "i" } },
        { "credentials.wooUrl": { $regex: normalizedUrl, $options: "i" } }
      ]
    });

    if (existingUser) {
      return Response.json({
        exists: true,
        email: existingUser.email,
        // Don't include sensitive info in response
        isSameUser: existingUser.email === session.user.email
      });
    }

    return Response.json({ exists: false });
  } catch (error) {
    console.error("[check-existing-url] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Helper function to normalize URLs for comparison
 */
function normalizeUrl(url) {
  if (!url) return "";
  
  // Remove protocol
  let normalized = url.replace(/^(https?:\/\/)?(www\.)?/i, "");
  
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, "");
  
  // Remove query parameters and hash
  normalized = normalized.split(/[?#]/)[0];
  
  return normalized.toLowerCase();
} 