/* eslint-disable consistent-return */
import { getServerSession }  from "next-auth";
import { authOptions }       from "../auth/[...nextauth]/route";
import clientPromise         from "/lib/mongodb";
import processShopify        from "/lib/processShopify";
import processWooProducts    from "/lib/processWoo";
import processWooImages      from "/lib/processWooImages";
import processShopifyImages from "/lib/processShopifyImages";

/* ---------- credential validation helpers ----------------------- */
async function validateShopifyCredentials(domain, token) {
  try {
    if (!domain || !token) {
      console.error('Missing Shopify credentials:', { domain: !!domain, token: !!token });
      return false;
    }

    // Remove any protocol and trailing slashes, ensure .myshopify.com is present
    let cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!cleanDomain.includes('.myshopify.com')) {
      cleanDomain = `${cleanDomain}.myshopify.com`;
    }

    // Validate domain format
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(cleanDomain)) {
      console.error('Invalid Shopify domain format:', cleanDomain);
      return false;
    }

    console.log('Attempting to validate Shopify credentials:', { cleanDomain });
    const url = `https://${cleanDomain}/admin/api/2023-10/shop.json`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        'User-Agent': 'Semantix/1.0'
      },
      // Add SSL/TLS configuration
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    
    if (!response.ok) {
      console.error('Shopify validation failed:', {
        status: response.status,
        statusText: response.statusText,
        domain: cleanDomain
      });
      try {
        const errorData = await response.json();
        console.error('Shopify error details:', errorData);
      } catch (e) {
        // Ignore json parse error
      }
    }
    
    return response.ok;
  } catch (error) {
    console.error('Shopify validation error:', {
      error: error.message,
      domain,
      stack: error.stack,
      cause: error.cause
    });
    return false;
  }
}

async function validateWooCredentials(wooUrl, wooKey, wooSecret) {
  try {
    const cleanUrl = wooUrl.replace(/\/$/, '');
    const url = `${cleanUrl}/wp-json/wc/v3/system_status`;
    
    const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('WooCommerce validation error:', error);
    return false;
  }
}

/* ---------- little helper – write state to Mongo ------------------- */
async function setJobState(client, dbName, state, progressData = {}) {
  const updateData = {
    state,
    updatedAt: new Date(),
    ...progressData
  };

  await client
    .db("users")
    .collection("sync_status")
    .updateOne(
      { dbName },
      { $set: updateData },
      { upsert: true }
    );
}

async function createEmbeddingIndex(client, dbName) {
  const collectionName = "products";
  const db = client.db(dbName);

  // Check if collection exists; if not, create it.
  const collections = await db.listCollections({ name: collectionName }).toArray();
  if (!collections.length) {
    await db.createCollection(collectionName);
    console.log(`Collection '${collectionName}' did not exist and was created.`);
  }

  // Check if the vector_index already exists
  try {
    const existingIndexes = await db.collection(collectionName).listSearchIndexes().toArray();
    const vectorIndexExists = existingIndexes.some(index => index.name === "vector_index");
    
    if (vectorIndexExists) {
      console.log("Vector index 'vector_index' already exists, skipping creation.");
      return { acknowledged: true, message: "Index already exists" };
    }
  } catch (error) {
    // If listSearchIndexes fails, we'll try to create the index anyway
    console.log("Could not check existing indexes, proceeding with creation:", error.message);
  }

  const indexConfig = {
    name: "vector_index",
   
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          embedding: {
            type: "knnVector",
            dimensions: 3072,
            similarity: "cosine"
          },
          category: {
            type: "string",
            analyzer: "lucene.keyword"
          },
          price: { 
            type: "number" 
          },
          type: {
            type: "string",
            analyzer: "lucene.keyword"
          }
        }
      }
    }
  };

  try {
    // Use the createSearchIndexes command to create the Atlas Search index.
    const result = await db.command({
      createSearchIndexes: collectionName,
      indexes: [indexConfig]
    });
    console.log("Embedding search index created:", result);
    return result;
  } catch (error) {
    // Handle the specific case where the index already exists
    if (error.code === 68 && error.codeName === 'IndexAlreadyExists') {
      console.log("Vector index already exists, continuing...");
      return { acknowledged: true, message: "Index already exists" };
    }
    // Re-throw other errors
    throw error;
  }
}

async function createAutocompleteIndex(client, dbName) {
  const collectionName = "products";
  const db = client.db(dbName);

  // Ensure the "products" collection exists; if not, create it.
  const collections = await db.listCollections({ name: collectionName }).toArray();
  if (!collections.length) {
    await db.createCollection(collectionName);
    console.log(`Collection '${collectionName}' was created.`);
  }

  // Check if the default index already exists
  try {
    const existingIndexes = await db.collection(collectionName).listSearchIndexes().toArray();
    const defaultIndexExists = existingIndexes.some(index => index.name === "default");
    
    if (defaultIndexExists) {
      console.log("Autocomplete index 'default' already exists, skipping creation.");
      return { acknowledged: true, message: "Index already exists" };
    }
  } catch (error) {
    // If listSearchIndexes fails, we'll try to create the index anyway
    console.log("Could not check existing indexes, proceeding with creation:", error.message);
  }

  // Define the new autocomplete search index configuration.
  const autocompleteIndexConfig = {
    name: "default",
    definition: {
      mappings: {
        dynamic: true,
        fields: {
          description: [
            {
              maxGrams: 20,
              minGrams: 2,
              tokenization: "edgeGram",
              type: "autocomplete"
            },
            {
              analyzer: "lucene.standard",
              type: "string"
            }
          ],
          name: [
            {
              maxGrams: 20,
              minGrams: 2,
              tokenization: "edgeGram",
              type: "autocomplete"
            },
            {
              analyzer: "lucene.standard",
              type: "string"
            }
          ]
        }
      }
    }
  };

  try {
    // Use the createSearchIndexes command to create the Atlas Search index.
    const result = await db.command({
      createSearchIndexes: collectionName,
      indexes: [autocompleteIndexConfig]
    });
    console.log("Autocomplete search index created:", result);
    return result;
  } catch (error) {
    // Handle the specific case where the index already exists
    if (error.code === 68 && error.codeName === 'IndexAlreadyExists') {
      console.log("Autocomplete index already exists, continuing...");
      return { acknowledged: true, message: "Index already exists" };
    }
    // Re-throw other errors
    throw error;
  }
}

/* ------------------------------------------------------------------ */
export async function POST(req) {
  try {
    /* 1)  authentication  */
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = session.user.email;

    /* 2)  request body  */
    const {
      platform,
      shopifyDomain,
      shopifyToken,
      wooUrl,
      wooKey,
      wooSecret,
      dbName,
      categories,
      syncMode,
      type, 
      context,
      // "text" | "image"
    } = await req.json();

    // Validate dbName is present
    if (!dbName) {
      return Response.json({ error: "missing dbName" }, { status: 400 });
    }

    /* 3) Validate platform credentials before proceeding */
    let isValidCredentials = false;
    
    if (platform === "shopify") {
      if (!shopifyDomain || !shopifyToken) {
        return Response.json({ 
          error: "Invalid credentials", 
          message: "Shopify domain and access token are required" 
        }, { status: 401 });
      }
      isValidCredentials = await validateShopifyCredentials(shopifyDomain, shopifyToken);
    } else if (platform === "woocommerce") {
      if (!wooUrl || !wooKey || !wooSecret) {
        return Response.json({ 
          error: "Invalid credentials", 
          message: "WooCommerce URL, consumer key, and consumer secret are required" 
        }, { status: 401 });
      }
      isValidCredentials = await validateWooCredentials(wooUrl, wooKey, wooSecret);
    } else {
      return Response.json({ 
        error: "Invalid platform", 
        message: "Platform must be either 'shopify' or 'woocommerce'" 
      }, { status: 400 });
    }

    if (!isValidCredentials) {
      return Response.json({ 
        error: "Invalid credentials", 
        message: platform === "shopify" 
          ? "Unable to connect to Shopify. Please check your domain and access token." 
          : "Unable to connect to WooCommerce. Please check your URL, consumer key, and consumer secret."
      }, { status: 401 });
    }

    /* 4)  persist the credentials  */
    const client = await clientPromise;
    const users = client.db("users").collection("users");

    // Check if the user already has a record in the database
    const existingUser = await users.findOne({ email: userEmail });
    const isFirstTimeOnboarding = !existingUser?.onboardingComplete;

    // Remove platform from credentials.
    const credentials =
      platform === "shopify"
        ? { shopifyDomain, shopifyToken, categories, dbName, type }
        : { wooUrl, wooKey, wooSecret, categories, dbName, type };

    // Update the user record with credentials and trial information
    const updateData = {
      credentials,
      onboardingComplete: true,
      dbName,
      platform,
      syncMode,
      context,
      updatedAt: new Date()
    };

    // Only set trialStartedAt if this is the first time onboarding
    if (isFirstTimeOnboarding) {
      updateData.trialStartedAt = new Date();
      updateData.trialStatus = 'active';
    }

    // Update the user so that the platform is saved as a top-level field
    await users.updateOne(
      { email: userEmail },
      { $set: updateData },
      { upsert: true }
    );

    await createEmbeddingIndex(client, dbName);
    await createAutocompleteIndex(client, dbName);

    /* 5)  mark job=running and launch the heavy lift in background  */
    await setJobState(client, dbName, "running");

    // detach – we don't await so the request can return immediately
    (async () => {
      let logs = [];
      try {
        if (platform === "woocommerce") {
          if (syncMode === "image") {
            logs = await processWooImages({ wooUrl, wooKey, wooSecret, userEmail, categories, dbName });
          } else {
            logs = await processWooProducts({ wooUrl, wooKey, wooSecret, userEmail, categories, dbName });
          }
        } else if (platform === "shopify") {
          if (syncMode === "image") {
            logs = await processShopifyImages({ shopifyDomain, shopifyToken, userEmail, categories, dbName });
          } else {
            logs = await processShopify({ shopifyDomain, shopifyToken, userEmail, categories, dbName });
          }
        }
        await setJobState(client, dbName, "done");

        // Log the collected messages from the sync process.
        console.log("Sync logs:", logs);
      } catch (err) {
        console.error("sync error", err);
        await setJobState(client, dbName, "error");
      }
    })();

    /* 6)  send the client away – 202 Accepted = "working on it" */
    return Response.json({ 
      success: true, 
      state: "running",
      isNewTrial: isFirstTimeOnboarding 
    }, { status: 202 });
  } catch (err) {
    console.error("[onboarding error]", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/* BONUS: tiny GET endpoint so the dashboard can poll job status      */
/* /api/onboarding?dbName=myStore&check=true                          */
export async function GET(req) {
  const dbName = req.nextUrl.searchParams.get("dbName");
  if (!dbName) return Response.json({ error: "missing dbName" }, { status: 400 });

  const client = await clientPromise;
  const doc = await client
    .db()
    .collection("sync_status")
    .findOne({ dbName }, { projection: { _id: 0 } });

  return Response.json({ state: doc?.state || "pending" });
}