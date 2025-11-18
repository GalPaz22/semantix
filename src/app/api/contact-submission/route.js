import { NextResponse } from "next/server";
import clientPromise from "/lib/mongodb";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("users");
    
    // Use a separate collection for contact leads - NOT touching users collection
    const contactLeads = db.collection("contact_leads");

    // Prepare document to insert
    const contactDocument = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      company: company ? company.trim() : null,
      message: message.trim(),
      submittedAt: new Date(),
      status: 'new'
    };

    // Insert into contact_leads collection (completely separate from users)
    const result = await contactLeads.insertOne(contactDocument);

    console.log(`✅ Contact lead saved with ID: ${result.insertedId}`);

    return NextResponse.json(
      { 
        success: true, 
        message: "Thank you for contacting us! We'll get back to you soon.",
        id: result.insertedId 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error saving contact submission:", error);
    return NextResponse.json(
      { error: "Failed to save contact submission. Please try again." },
      { status: 500 }
    );
  }
}

