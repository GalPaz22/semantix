import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

const unauth = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

const adminEmail = "galpaz2210@gmail.com"; // Admin user email

/**
 * GET /api/get-user-credentials?apiKey=xxx
 * 
 * Admin-only endpoint to fetch user's platform credentials
 * Used by admin panel to trigger reprocessing
 */
export async function GET(request) {
  // Check if user is authenticated and is admin
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauth();
  
  // Only allow admin user
  if (session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: "apiKey parameter is required" }, { status: 400 });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection("users");

    // Find user by API key
    const user = await users.findOne(
      { apiKey },
      { projection: { 
        credentials: 1,
        syncMode: 1,
        context: 1,
        explain: 1
      }}
    );

    if (!user) {
      return NextResponse.json({ error: "User not found with provided API key" }, { status: 404 });
    }

    return NextResponse.json({
      credentials: user.credentials || {},
      syncMode: user.syncMode || 'text',
      context: user.context || '',
      explain: user.explain || false
    });

  } catch (error) {
    console.error("❌ Error in get-user-credentials:", error);
    return NextResponse.json({ 
      error: "Failed to fetch credentials",
      details: error.message 
    }, { status: 500 });
  }
}

