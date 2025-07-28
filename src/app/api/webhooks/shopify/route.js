import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "/lib/mongodb";
import { SHOPIFY_API_SECRET } from "/lib/shopify-app-config";

/**
 * Verify the webhook signature
 * @param {Request} request - The incoming request
 * @param {string} body - The request body as a string
 * @returns {boolean} - Whether the signature is valid
 */
async function verifyWebhookSignature(request, body) {
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  if (!hmacHeader) return false;
  
  const secret = SHOPIFY_API_SECRET;
  if (!secret) return false;
  
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const digest = hmac.digest("base64");
  
  return crypto.timingSafeEqual(
    Buffer.from(hmacHeader),
    Buffer.from(digest)
  );
}

export async function POST(request) {
  try {
    // Get the raw request body as a string
    const body = await request.text();
    
    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    
    // Parse the request body
    const data = JSON.parse(body);
    
    // Get the webhook topic from the headers
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    
    console.log(`Received webhook: ${topic} from ${shop}`);
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("users");
    
    // Store the webhook in the database
    await db.collection("shopify_webhooks").insertOne({
      topic,
      shop,
      data,
      receivedAt: new Date()
    });
    
    // Handle different webhook topics
    switch (topic) {
      case "products/create":
      case "products/update":
        // Process product update
        await processProductUpdate(db, shop, data);
        break;
        
      case "products/delete":
        // Process product deletion
        await processProductDeletion(db, shop, data);
        break;
        
      case "app/uninstalled":
        // Handle app uninstallation
        await handleAppUninstall(db, shop);
        break;
      
      // GDPR Webhooks
      case "customers/data_request":
        // Handle customer data request
        await handleCustomerDataRequest(db, shop, data);
        break;
        
      case "customers/redact":
        // Handle customer data redaction
        await handleCustomerRedact(db, shop, data);
        break;
        
      case "shop/redact":
        // Handle shop data redaction
        await handleShopRedact(db, shop, data);
        break;
        
      default:
        // Log other webhook topics
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    // Return a success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Process a product update webhook
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 * @param {Object} data - The webhook data
 */
async function processProductUpdate(db, shop, data) {
  try {
    // Find the user associated with this shop
    const user = await db.collection("users").findOne({ shopifyShop: shop });
    if (!user) {
      console.error(`No user found for shop: ${shop}`);
      return;
    }
    
    // Update or create the product in the database
    await db.collection("products").updateOne(
      { 
        shopifyId: data.id.toString(),
        shop 
      },
      {
        $set: {
          title: data.title,
          description: data.body_html,
          handle: data.handle,
          productType: data.product_type,
          vendor: data.vendor,
          tags: data.tags?.split(",").map(tag => tag.trim()) || [],
          variants: data.variants || [],
          images: data.images || [],
          updatedAt: new Date(),
          userId: user._id,
          userEmail: user.email
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log(`Processed product update for ${data.title} (${data.id})`);
  } catch (error) {
    console.error("Error processing product update:", error);
  }
}

/**
 * Process a product deletion webhook
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 * @param {Object} data - The webhook data
 */
async function processProductDeletion(db, shop, data) {
  try {
    // Mark the product as deleted in the database
    await db.collection("products").updateOne(
      { 
        shopifyId: data.id.toString(),
        shop 
      },
      {
        $set: {
          deleted: true,
          deletedAt: new Date()
        }
      }
    );
    
    console.log(`Processed product deletion for product ID: ${data.id}`);
  } catch (error) {
    console.error("Error processing product deletion:", error);
  }
}

/**
 * Handle app uninstallation webhook
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 */
async function handleAppUninstall(db, shop) {
  try {
    // Update the installation record
    await db.collection("shopify_installations").updateMany(
      { shop },
      {
        $set: {
          active: false,
          uninstalledAt: new Date()
        }
      }
    );
    
    // Update the user record
    await db.collection("users").updateMany(
      { shopifyShop: shop },
      {
        $set: {
          shopifyConnected: false,
          shopifyUninstalledAt: new Date()
        }
      }
    );
    
    console.log(`Processed app uninstallation for shop: ${shop}`);
  } catch (error) {
    console.error("Error handling app uninstall:", error);
  }
}

/**
 * Handle customer data request webhook (GDPR)
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 * @param {Object} data - The webhook data
 */
async function handleCustomerDataRequest(db, shop, data) {
  try {
    console.log(`Processing customer data request for shop: ${shop}`);
    
    // Extract customer info from the webhook data
    const { shop_id, shop_domain, customer, orders_requested } = data;
    const customerId = customer.id;
    const customerEmail = customer.email;
    
    // Log the request in a dedicated GDPR collection
    await db.collection("gdpr_requests").insertOne({
      type: "data_request",
      shop,
      shopId: shop_id,
      customerId,
      customerEmail,
      ordersRequested: orders_requested,
      requestedAt: new Date(),
      status: "received",
      completedAt: null
    });
    
    // Find all customer data in your database
    const customerData = await collectCustomerData(db, shop, customerId, customerEmail);
    
    // Store the collected data for later export
    await db.collection("gdpr_data_exports").insertOne({
      shop,
      customerId,
      customerEmail,
      data: customerData,
      createdAt: new Date()
    });
    
    // Update the request status
    await db.collection("gdpr_requests").updateOne(
      { shop, customerId, type: "data_request" },
      { 
        $set: { 
          status: "completed",
          completedAt: new Date()
        } 
      }
    );
    
    console.log(`Completed customer data request for customer ID: ${customerId}`);
  } catch (error) {
    console.error("Error handling customer data request:", error);
  }
}

/**
 * Handle customer data redaction webhook (GDPR)
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 * @param {Object} data - The webhook data
 */
async function handleCustomerRedact(db, shop, data) {
  try {
    console.log(`Processing customer data redaction for shop: ${shop}`);
    
    // Extract customer info from the webhook data
    const { shop_id, shop_domain, customer } = data;
    const customerId = customer.id;
    const customerEmail = customer.email;
    
    // Log the request in a dedicated GDPR collection
    await db.collection("gdpr_requests").insertOne({
      type: "customer_redact",
      shop,
      shopId: shop_id,
      customerId,
      customerEmail,
      requestedAt: new Date(),
      status: "received",
      completedAt: null
    });
    
    // Redact or anonymize customer data
    await redactCustomerData(db, shop, customerId, customerEmail);
    
    // Update the request status
    await db.collection("gdpr_requests").updateOne(
      { shop, customerId, type: "customer_redact" },
      { 
        $set: { 
          status: "completed",
          completedAt: new Date()
        } 
      }
    );
    
    console.log(`Completed customer data redaction for customer ID: ${customerId}`);
  } catch (error) {
    console.error("Error handling customer data redaction:", error);
  }
}

/**
 * Handle shop data redaction webhook (GDPR)
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 * @param {Object} data - The webhook data
 */
async function handleShopRedact(db, shop, data) {
  try {
    console.log(`Processing shop data redaction for shop: ${shop}`);
    
    // Extract shop info from the webhook data
    const { shop_id, shop_domain } = data;
    
    // Log the request in a dedicated GDPR collection
    await db.collection("gdpr_requests").insertOne({
      type: "shop_redact",
      shop,
      shopId: shop_id,
      requestedAt: new Date(),
      status: "received",
      completedAt: null
    });
    
    // Redact or anonymize shop data
    await redactShopData(db, shop, shop_id);
    
    // Update the request status
    await db.collection("gdpr_requests").updateOne(
      { shop, shopId: shop_id, type: "shop_redact" },
      { 
        $set: { 
          status: "completed",
          completedAt: new Date()
        } 
      }
    );
    
    console.log(`Completed shop data redaction for shop: ${shop}`);
  } catch (error) {
    console.error("Error handling shop data redaction:", error);
  }
}

/**
 * Collect all data related to a customer
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 * @param {string} customerId - The customer ID
 * @param {string} customerEmail - The customer email
 * @returns {Object} - The collected customer data
 */
async function collectCustomerData(db, shop, customerId, customerEmail) {
  // Collect all data related to this customer from your database
  const searchQueries = await db.collection("search_queries").find({
    shop,
    customerId: customerId.toString()
  }).toArray();
  
  const searchInteractions = await db.collection("search_interactions").find({
    shop,
    customerId: customerId.toString()
  }).toArray();
  
  // Return the collected data
  return {
    searchQueries,
    searchInteractions,
    // Add any other customer-related data you collect
  };
}

/**
 * Redact or anonymize customer data
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 * @param {string} customerId - The customer ID
 * @param {string} customerEmail - The customer email
 */
async function redactCustomerData(db, shop, customerId, customerEmail) {
  // Anonymize search queries
  await db.collection("search_queries").updateMany(
    { shop, customerId: customerId.toString() },
    { 
      $set: { 
        query: "[REDACTED]",
        customerEmail: "[REDACTED]",
        customerIp: "[REDACTED]",
        redacted: true,
        redactedAt: new Date()
      } 
    }
  );
  
  // Anonymize search interactions
  await db.collection("search_interactions").updateMany(
    { shop, customerId: customerId.toString() },
    { 
      $set: { 
        customerEmail: "[REDACTED]",
        customerIp: "[REDACTED]",
        redacted: true,
        redactedAt: new Date()
      } 
    }
  );
  
  // Add redaction for any other customer data you collect
}

/**
 * Redact or anonymize shop data
 * @param {Object} db - MongoDB database connection
 * @param {string} shop - The shop domain
 * @param {string} shopId - The shop ID
 */
async function redactShopData(db, shop, shopId) {
  // Delete or anonymize all data related to this shop
  
  // Anonymize shop information
  await db.collection("users").updateMany(
    { shopifyShop: shop },
    { 
      $set: { 
        shopifyShop: "[REDACTED]",
        shopifyToken: "[REDACTED]",
        shopifyScope: "[REDACTED]",
        redacted: true,
        redactedAt: new Date()
      } 
    }
  );
  
  // Anonymize products
  await db.collection("products").updateMany(
    { shop },
    { 
      $set: { 
        title: "[REDACTED]",
        description: "[REDACTED]",
        vendor: "[REDACTED]",
        tags: [],
        redacted: true,
        redactedAt: new Date()
      } 
    }
  );
  
  // Anonymize search queries
  await db.collection("search_queries").updateMany(
    { shop },
    { 
      $set: { 
        query: "[REDACTED]",
        customerEmail: "[REDACTED]",
        customerIp: "[REDACTED]",
        redacted: true,
        redactedAt: new Date()
      } 
    }
  );
  
  // Add redaction for any other shop data you collect
} 