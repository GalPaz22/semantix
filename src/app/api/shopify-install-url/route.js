import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { INSTALL_URL } from "/lib/shopify-app-config";

export async function GET(request) {
  // Get user session
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  try {
    // Return the URL to our custom installation page for the public app
    return NextResponse.json({ url: INSTALL_URL });
  } catch (error) {
    console.error("Error generating Shopify installation URL:", error);
    return NextResponse.json({ error: "Failed to generate installation URL" }, { status: 500 });
  }
}