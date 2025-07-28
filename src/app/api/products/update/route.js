import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "/lib/mongodb";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dbName, productId, updates } = await request.json();
    
    if (!dbName || !productId || !updates) {
      return Response.json({ 
        error: "Database name, product ID, and updates are required" 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const collection = db.collection("products");

    // Prepare the update object
    const updateObject = {
      $set: {
        ...updates,
        updatedAt: new Date()
      }
    };

    // Update the product
    const productUpdateResult = await collection.updateOne(
      { id: productId },
      updateObject
    );

    if (productUpdateResult.matchedCount === 0) {
      return Response.json({ 
        error: "Product not found" 
      }, { status: 404 });
    }
    
    // Now, upsert the category and types into the user's credentials
    const usersCollection = client.db(process.env.MONGODB_DB_NAME).collection("users");
    const userUpdateOps = {};

    if (updates.category) {
      userUpdateOps['credentials.categories'] = updates.category;
    }
    if (updates.type && Array.isArray(updates.type) && updates.type.length > 0) {
      userUpdateOps['credentials.type'] = { $each: updates.type };
    }
    
    // Only perform the update if there's something to add
    if (Object.keys(userUpdateOps).length > 0) {
      await usersCollection.updateOne(
        { email: session.user.email },
        { $addToSet: userUpdateOps }
      );
    }

    return Response.json({ 
      success: true,
      message: "Product updated successfully",
      modifiedCount: productUpdateResult.modifiedCount
    });

  } catch (error) {
    console.error("Error updating product:", error);
    return Response.json({ 
      error: "Failed to update product",
      details: error.message 
    }, { status: 500 });
  }
} 