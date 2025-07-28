import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

export async function GET(request) {
  // Retrieve the session from the request
  const session = await getServerSession(authOptions);
  
  // Check if the user is authenticated 
  
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const email = session.user.email;
  console.log("[get-onboarding]", email);
  
  try {
    const client = await clientPromise;
    const db = client.db("users"); // Use the "users" database
    
    // Find the user document by email in the "users" collection
    const userDoc = await db.collection("users").findOne({ email });
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Remove sensitive data if necessary (e.g. the password)
    delete userDoc.password;
    console.log("[get-onboarding]", userDoc);       
    // Return the user credentials as onboarding details
    return NextResponse.json({ onboarding: userDoc });
 
  } catch (error) {
    console.error("Error fetching onboarding details:", error);
    return NextResponse.json({ error: "Failed to fetch onboarding details" }, { status: 500 });
  }
}