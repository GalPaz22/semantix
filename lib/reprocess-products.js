const { MongoClient } = require("mongodb");
const { classifyCategoryAndTypeWithGemini, summarizeMetadata } = require("./processWoo.js");
const { GoogleGenAI } = require('@google/genai');
const dotenv = require("dotenv");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const LOCK_DIR = os.tmpdir();

const getLockFilePath = (dbName) => path.join(LOCK_DIR, `reprocessing_${dbName}.lock`);

// Initialize Google AI if available
const ai = GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== "YOUR_GOOGLE_AI_KEY" 
  ? new GoogleGenAI({apiKey: GOOGLE_AI_API_KEY})
  : null;

/** Helper function to parse prices consistently */
function parsePrice(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') {
    return 0;
  }
  if (typeof priceValue === 'number') {
    return isNaN(priceValue) ? 0 : priceValue;
  }
  let cleanPrice = String(priceValue);
  cleanPrice = cleanPrice.replace(/[$₪€£¥,\s]/g, '');
  cleanPrice = cleanPrice.replace(/[^\d.-]/g, '');
  if (cleanPrice === '' || cleanPrice === '-' || cleanPrice === '.') {
    return 0;
  }
  const numericPrice = parseFloat(cleanPrice);
  const result = isNaN(numericPrice) ? 0 : numericPrice;
  return result < 0 ? 0 : result;
}

/** Process and normalize variants for both WooCommerce and Shopify */
function processProductVariants(product) {
  // If this is already a processed MongoDB document with variant data, preserve it
  if (product.variants && Array.isArray(product.variants) && 
      product.sizes && Array.isArray(product.sizes) && 
      product.colors && Array.isArray(product.colors)) {
    return {
      variants: product.variants,
      sizes: product.sizes,
      colors: product.colors
    };
  }

  // Handle Shopify variants (GraphQL structure)
  if (product.variants?.edges) {
    const variants = product.variants.edges.map(({ node }) => {
      const optMap = Object.fromEntries((node.selectedOptions || []).map(o => [o.name?.toLowerCase(), o.value]));
      return {
        id: node.id,
        title: node.title,
        sku: node.sku || null,
        price: parsePrice(node.price),
        compareAtPrice: parsePrice(node.compareAtPrice),
        image: node.image?.src || null,
        size: optMap['size'] || optMap['eu size'] || optMap['us size'] || null,
        color: optMap['color'] || optMap['colour'] || null,
        options: node.selectedOptions || [],
        inventoryQuantity: node.inventoryQuantity || 0,
        availableForSale: node.availableForSale || false
      };
    });

    // Extract unique sizes and colors
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))].sort();
    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];

    return { variants, sizes, colors };
  }

  // Handle WooCommerce variants (if they exist)
  if (product.variations && Array.isArray(product.variations)) {
    const variants = product.variations.map(variation => ({
      id: variation.id,
      title: variation.description || `${product.name} - Variation`,
      sku: variation.sku || null,
      price: parsePrice(variation.price),
      regular_price: parsePrice(variation.regular_price),
      sale_price: parsePrice(variation.sale_price),
      image: variation.image?.src || null,
      attributes: variation.attributes || [],
      stock_status: variation.stock_status || 'instock',
      stock_quantity: variation.stock_quantity || 0,
      manage_stock: variation.manage_stock || false
    }));

    // Extract attributes for WooCommerce
    const allAttributes = variants.flatMap(v => v.attributes || []);
    const sizes = [...new Set(allAttributes.filter(attr => 
      attr.name?.toLowerCase().includes('size')).map(attr => attr.option))].filter(Boolean);
    const colors = [...new Set(allAttributes.filter(attr => 
      attr.name?.toLowerCase().includes('color') || attr.name?.toLowerCase().includes('colour')).map(attr => attr.option))].filter(Boolean);

    return { variants, sizes, colors };
  }

  // No variants - return empty arrays
  return { variants: [], sizes: [], colors: [] };
}

async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine MIME type from URL or response headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return {
      data: base64,
      mimeType: contentType
    };
  } catch (error) {
    console.warn(`Failed to fetch image ${imageUrl}:`, error.message);
    return null;
  }
}

function isValidImageUrl(url) {
  if (typeof url !== "string") return false;
  try { new URL(url); } catch { return false; }
  return /\.(jpe?g|png|gif|webp)$/i.test(url);
}

async function classifyWithImages(text, name, categories, types, softCategories, images, variants = []) {
  if (!ai) {
    console.warn("Google AI client not initialized - using text-only classification.");
    return { category: [], type: [], softCategory: [] };
  }
  
  try {
    // --- THIS IS THE FIX ---
    const categoriesArray = Array.isArray(categories) ? categories : [];
    const typesArray = Array.isArray(types) ? types : [];
    const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
    
    const categoryList = categoriesArray.join(", ");
    const typeList = typesArray.join(", ");
    const softCategoryList = softCategoriesArray.join(", ");

    console.log("🖼️ Making Gemini Vision API call for product:", name);
    console.log("🔍 Categories count:", categoriesArray.length);
    console.log("🔍 Types count:", typesArray.length);
    console.log("🔍 Soft Categories count:", softCategoriesArray.length);
    console.log("🔧 Variants count:", variants.length);

    let imageParts = [];
    if (images && Array.isArray(images) && images.length > 0) {
      const validImages = images.filter(img => img && img.src && isValidImageUrl(img.src));
      if (validImages.length > 0) {
        const imagePromises = validImages.slice(0, validImages.length).map(img => fetchImageAsBase64(img.src));
        const imageResults = await Promise.all(imagePromises);
        const validBase64Images = imageResults.filter(result => result !== null);
        
        imageParts = validBase64Images.map(img => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        }));
      }
    }

    // Prepare variant information for the AI
    let variantInfo = '';
    if (variants && variants.length > 0) {
      const variantDetails = variants.map(v => {
        const details = [];
        if (v.title) details.push(`Title: ${v.title}`);
        if (v.sku) details.push(`SKU: ${v.sku}`);
        if (v.size) details.push(`Size: ${v.size}`);
        if (v.color) details.push(`Color: ${v.color}`);
        if (v.price) details.push(`Price: ${v.price}`);
        if (v.options && v.options.length > 0) {
          const options = v.options.map(opt => `${opt.name}: ${opt.value}`).join(', ');
          details.push(`Options: ${options}`);
        }
        return details.join(', ');
      }).join('\n');
      
      variantInfo = `\n\nProduct Variants (${variants.length} total):\n${variantDetails}`;
    }

    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `You are an AI e-commerce assistant. Classify the product based on its description, images, and variant information.
Follow these rules:
1.  Category MUST be an array of one or more categories from this EXACT list: [${categoryList}].
2.  If NO category from the list is a suitable match, you MUST return an empty array for the "category" field.
3.  Type MUST be an array from: [${typeList}]. If no match, return an empty array.
4.  Soft Category MUST be an array from: [${softCategoryList}]. If no match, return an empty array.
5.  If the soft category is a color, analyze ALL available variants and return the dominant colors available across variants!
6.  Use variant information (colors, sizes, options) to enhance your classification accuracy.
7.  Always return the  *single most dominant* color of the product and the products variants!
8.  if you find a soft category called 'חלק' find the products with solid colors, w/o patterns or stripes.
9.  Do NOT invent new categories, types, or soft categories.

Product Name: ${name}
Description:
${text}${variantInfo}

Return ONLY a JSON object like: {"category": ["The Category"], "type": ["The Type"], "softCategory": ["The Soft Category"]}`
          },
          ...imageParts
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingBudget: 0
        }
      },
    });

    let result;
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.candidates[0].content.parts[0].text;
    } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.response.candidates[0].content.parts[0].text;
    }

    if (!result) throw new Error("No valid response from Gemini");

    let jsonString = result.trim();
    if (jsonString.startsWith('```') && jsonString.endsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*|```\s*$/g, '');
    }
    const out = JSON.parse(jsonString);

    if (out.category && Array.isArray(out.category)) {
      out.category = out.category.filter(c => categoriesArray.includes(c));
    } else {
      out.category = [];
    }
    if (out.type && Array.isArray(out.type)) {
      out.type = out.type.filter(t => typesArray.includes(t));
    } else {
      out.type = [];
    }
    if (out.softCategory && Array.isArray(out.softCategory)) {
      out.softCategory = out.softCategory.filter(s => softCategoriesArray.includes(s));
    } else {
      out.softCategory = [];
    }
    
    return out;

  } catch (error) {
    console.warn(`Image-based classification failed for ${name}:`, error);
    return { category: [], type: [], softCategory: [] };
  }
}

async function generateEnglishDescriptionWithVision(originalText, productName, images, metadata, categories) {
  let generatedDescription = originalText;

  if (ai) {
    try {
      let imageParts = [];
      if (images && Array.isArray(images) && images.length > 0) {
        const validImages = images.filter(img => img && img.src && isValidImageUrl(img.src));
        if (validImages.length > 0) {
          const imagePromises = validImages.slice(0, 3).map(img => fetchImageAsBase64(img.src));
          const imageResults = await Promise.all(imagePromises);
          const validBase64Images = imageResults.filter(result => result !== null);
          imageParts = validBase64Images.map(img => ({
            inlineData: { mimeType: img.mimeType, data: img.data }
          }));
        }
      }

      const messages = [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI data specialist for e-commerce semantic search.
Your task is to create a keyword-rich, factual, and objective description in English, optimized for embeddings.
Analyze the provided text and images to extract key attributes. Do not include metadata or category information in your response.

Product Name: ${productName}
Original Text:
${originalText}

Provide ONLY the optimized product description as a plain text response.`
            },
            ...imageParts
          ]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages,
        config: {
          responseMimeType: "text/plain",
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      });

      let result;
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        result = response.candidates[0].content.parts[0].text;
      } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        result = response.response.candidates[0].content.parts[0].text;
      }

      if (result) {
        generatedDescription = result.trim();
      }

    } catch (error) {
      console.warn(`Failed to generate new English description for ${productName}:`, error);
    }
  }

  // Append raw metadata and categories
  const metadataAppend = metadata && Array.isArray(metadata) ? JSON.stringify(metadata) : '';
  const categoryAppend = categories && Array.isArray(categories) ? categories.map(c => c.name).join(' ') : '';
  
  return `${generatedDescription}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();
}

async function reprocessProducts({ dbName, categories, userTypes, softCategories, targetCategory = null, missingSoftCategoryOnly = false }) {
  const logs = [];
  const lockFilePath = getLockFilePath(dbName);
  const safeSoftCategories = Array.isArray(softCategories) ? softCategories : [];
  
  // Helper function to add logs and write to DB
  let statusCol;
  const addLog = async (message) => {
    logs.push(message);
    console.log(message);
    if (statusCol) {
      try {
        await statusCol.updateOne(
          { dbName },
          { $push: { logs: message } },
          { upsert: true }
        );
      } catch (err) {
        console.error("Failed to write log to DB:", err);
      }
    }
  };

  try {
    // Ensure lock directory exists
    await fs.mkdir(LOCK_DIR, { recursive: true });
    // Create lock file
    await fs.writeFile(lockFilePath, String(process.pid), { flag: 'w' });
    console.log(`Lock file created at: ${lockFilePath}`);
  } catch (error) {
    const errorMsg = `❌ Could not create lock file at ${lockFilePath}: ${error.message}`;
    logs.push(errorMsg);
    console.log(errorMsg);
    return logs;
  }

  await addLog(`🚀 Starting reprocessing for database: ${dbName}`);
  await addLog(`🔍 Categories: ${categories.join(', ') || 'None'}`);
  await addLog(`🏷️ User types: ${userTypes.join(', ') || 'None'}`);
  await addLog(`🎨 Soft categories: ${safeSoftCategories.join(', ') || 'None'}`);
  if (targetCategory) {
    await addLog(`🎯 Target category filter: "${targetCategory}" - will only reprocess products with this category`);
  } else {
    await addLog(`🌐 Processing all products (no category filter)`);
  }
  if (missingSoftCategoryOnly) {
    await addLog(`🎨 Special mode: Only targeting products with MISSING softCategory field (not empty arrays)`);
  }

  const client = new MongoClient(MONGO_URI, { 
    connectTimeoutMS: 60000, // Increase to 60 seconds
    serverSelectionTimeoutMS: 60000, // Increase to 60 seconds
    socketTimeoutMS: 60000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true
  });
  
  let runStartedAt = new Date();
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      await addLog(`🔄 Attempting MongoDB connection (attempt ${retryCount + 1}/${maxRetries})`);
      await client.connect();
      await addLog("✅ Connected to MongoDB");
      break;
    } catch (err) {
      retryCount++;
      await addLog(`❌ MongoDB connection failed (attempt ${retryCount}/${maxRetries}): ${err.message}`);
      
      if (retryCount >= maxRetries) {
        await addLog(`❌ Failed to connect to MongoDB after ${maxRetries} attempts`);
        await fs.unlink(lockFilePath);
        return logs;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      await addLog(`⏳ Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Check user's sync mode to determine classification method
  let isImageSyncMode = false;
  try {
    const usersDb = client.db("users");
    const userDoc = await usersDb.collection("users").findOne({ dbName });
    if (userDoc && userDoc.syncMode === "image") {
      isImageSyncMode = true;
      await addLog("🖼️ Image sync mode detected - will use image-based classification");
    } else {
      await addLog("📝 Text sync mode detected - will use text-only classification");
    }
  } catch (err) {
    await addLog(`⚠️ Could not determine sync mode, defaulting to text-only: ${err.message}`);
  }

  // Mark reprocess start on user document
  try {
    await client
      .db("users")
      .collection("users")
      .updateOne(
        { dbName },
        { $set: { reprocessStartedAt: runStartedAt } },
        { upsert: false }
      );
    await addLog("🕒 Marked reprocess start for user");
  } catch (userErr) {
    await addLog(`⚠️ Could not update user reprocess start: ${userErr.message}`);
  }

  const db = client.db(dbName);
  const collection = db.collection("products");
  statusCol = db.collection("sync_status");

  // Clear existing logs and initialize status
  await statusCol.updateOne(
    { dbName },
    { 
      $set: { 
        dbName, 
        state: "reprocessing", 
        progress: 0, 
        done: 0, 
        startedAt: runStartedAt,
        logs: [] 
      } 
    },
    { upsert: true }
  );

  /*
  // Clear existing categories and types before reprocessing
  try {
    const updateResult = await collection.updateMany(
      {},
      { $unset: { category: "", type: "" } }
    );
    await addLog(`🧹 Cleared existing categories and types for ${updateResult.modifiedCount} products.`);
  } catch (clearErr) {
    await addLog(`⚠️ Could not clear existing categories and types: ${clearErr.message}`);
  }
  */

  // Ensure every product has a stamp: initialize missing stamps
  try {
    // 1) If fetchedAt exists, initialize stamp from fetchedAt (uses pipeline update)
    const initFromFetched = await collection.updateMany(
      { categoryTypeProcessedAt: { $exists: false }, fetchedAt: { $exists: true } },
      [ { $set: { categoryTypeProcessedAt: "$fetchedAt" } } ]
    );
    await addLog(`🧭 Initialized stamp from fetchedAt for ${initFromFetched.modifiedCount} products`);
  } catch (e) {
    await addLog(`⚠️ Pipeline update not supported, skipping init-from-fetchedAt: ${e.message}`);
  }

  // 2) Initialize remaining missing stamps to now
  const initToNow = await collection.updateMany(
    { categoryTypeProcessedAt: { $exists: false } },
    { $set: { categoryTypeProcessedAt: new Date() } }
  );
  await addLog(`🕒 Initialized missing stamp to now for ${initToNow.modifiedCount} products`);

  // Recency threshold: skip items processed within the last week
  // TEMPORARILY DISABLED - reprocess all products regardless of when they were last processed
  // const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  // const cutoffDate = new Date(Date.now() - ONE_WEEK_MS);
  await addLog(`⏱️ Week threshold TEMPORARILY DISABLED - will reprocess all products with embeddings`);

  // Inventory / skip stats
  try {
    const [totalCount, stampedCount, outOfStockCount, skippedByRecencyCount] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ categoryTypeProcessedAt: { $exists: true } }),
      collection.countDocuments({
        $or: [
          { stockStatus: "outofstock" },
          { stock_status: "outofstock" }
        ]
      }),
      // collection.countDocuments({
      //   categoryTypeProcessedAt: { $gte: cutoffDate },
      //   category: { $exists: true },
      //   type: { $exists: true }
      // })
      0 // No products skipped by recency since threshold is disabled
    ]);
    await addLog(`📊 Inventory: total=${totalCount}, stamped=${stampedCount}, outOfStock=${outOfStockCount}, skipByRecency=${skippedByRecencyCount} (threshold disabled)`);
  } catch (countErr) {
    await addLog(`⚠️ Could not compute inventory stats: ${countErr.message}`);
  }

  // Build query conditions based on sync mode
  let classificationConditions;
  
  if (isImageSyncMode) {
    // In image mode, reprocess ALL products with embeddings
    // Don't filter by classification status at all
    classificationConditions = {};  // Empty condition = process all products
    await addLog("🖼️ Image mode: Will reprocess ALL products with embeddings");
  } else {
    // Text mode logic
    if (missingSoftCategoryOnly) {
      // Special mode: only target products with missing softCategory field (not empty arrays)
      classificationConditions = {
        $and: [
          { category: { $exists: true, $ne: null, $not: { $eq: [] } } }, // Must have categories
          { softCategory: { $exists: false } } // Must NOT have softCategory field at all
        ]
      };
      await addLog("🎨 Text mode: Will only process products with categories but MISSING softCategory field");
    } else {
      // Original text mode logic - only process products missing classifications
      classificationConditions = {
        $or: [
          { category: { $exists: false } },
          { category: { $eq: [] } }, // Empty category array
          { category: { $eq: null } }, // Null category
          { type: { $exists: false } },
          { type: { $eq: [] } }, // Empty type array
          { type: { $eq: null } }, // Null type
          { softCategory: { $exists: false } },
          { softCategory: { $eq: [] } }, // Empty softCategory array
          { softCategory: { $eq: null } }, // Null softCategory
          { categoryTypeProcessedAt: { $exists: false } }
          // Removed: { categoryTypeProcessedAt: { $lt: cutoffDate } } - time threshold disabled
        ]
      };
      await addLog("📝 Text mode: Will only process products missing categories/types");
    }
  }

  // Build the base query
  const baseQuery = {
    embedding: { $exists: true, $ne: null }, // <-- Reprocess only products with embeddings
    stockStatus: "instock" // <-- Only reprocess in-stock products
  };

  // Add classification conditions only for text mode
  let finalQuery;
  if (isImageSyncMode) {
    // Image mode: process all in-stock products with embeddings
    finalQuery = baseQuery;
    await addLog("🖼️ Image mode: Processing all IN-STOCK products with embeddings");
  } else {
    // Text mode: add classification filtering
    finalQuery = {
      ...baseQuery,
      ...classificationConditions
    };
    
    // Don't override the specific logging message for missingSoftCategoryOnly mode
    if (!missingSoftCategoryOnly) {
      await addLog("📝 Text mode: Processing IN-STOCK products missing categories/types");
    }
  }

  // Add category filtering if targetCategory is specified
  if (targetCategory) {
    finalQuery = {
      ...finalQuery,
      category: { $in: [targetCategory] } // Products that have this category in their category array
    };
    await addLog(`🎯 Added category filter: only products with category "${targetCategory}" will be processed`);
  }

  // Debug: Log the final query being used
  await addLog(`🔍 Final MongoDB query: ${JSON.stringify(finalQuery, null, 2)}`);
  
  const productsToProcess = await collection.find(finalQuery).toArray();
  
  // Debug: Let's also check how many products match each part of the query
  if (missingSoftCategoryOnly) {
    const productsWithCategories = await collection.countDocuments({
      embedding: { $exists: true, $ne: null },
      stockStatus: "instock",
      category: { $exists: true, $ne: null, $not: { $eq: [] } }
    });
    const productsWithoutSoftCategory = await collection.countDocuments({
      embedding: { $exists: true, $ne: null },
      stockStatus: "instock", 
      softCategory: { $exists: false }
    });
    await addLog(`🔍 Debug: Products with categories: ${productsWithCategories}`);
    await addLog(`🔍 Debug: Products without softCategory field: ${productsWithoutSoftCategory}`);
  }

  // Update progress in sync_status (store DB)
  const totalToProcess = productsToProcess.length;
  await statusCol.updateOne(
    { dbName },
    { $set: { state: totalToProcess > 0 ? "reprocessing" : "idle", total: totalToProcess } }
  );

  await addLog(`🔄 Processing ${totalToProcess} products for enrichment`);
  if (totalToProcess === 0) {
    if (isImageSyncMode) {
      await addLog("✅ Nothing to do. No products with embeddings found for image-based reprocessing.");
    } else if (missingSoftCategoryOnly) {
      await addLog("✅ Nothing to do. No products found with categories but missing softCategory field.");
    } else {
      await addLog("✅ Nothing to do. All products with embeddings already have category/type data.");
    }
  }

  let done = 0;
  for (const product of productsToProcess) {
    try {
      await fs.access(lockFilePath);
    } catch (error) {
      await addLog("🛑 Reprocessing stopped by user.");
      // Mark status as idle/stopped
      await statusCol.updateOne(
        { dbName },
        { $set: { state: "idle", stoppedAt: new Date() } }
      );
      break;
    }

    try {
      await addLog(`\n🟡 Processing: ${product.name} (ID: ${product.id})`);

      const { name, description1, categories: productCategories, metadata, images } = product;

      if (!description1 || description1.trim() === "") {
        await addLog("⚠️ Skipping - no description1");
        // Mark as checked this run to avoid re-checking without data changes
        await collection.updateOne(
          { _id: product._id },
          { $set: { categoryTypeProcessedAt: new Date() } }
        );
      } else {
        if (isImageSyncMode) {
          // Vision-based classification-only pipeline
          await addLog(`🖼️  Using vision to re-classify: ${name}`);
          
          // Process variants first so we can pass them to classification
          const variantData = processProductVariants(product);
          await addLog(`🔧 Processed variants for ${name}: ${variantData.variants.length} variants, ${variantData.sizes.length} sizes, ${variantData.colors.length} colors`);

          // Use existing description1, images, and variants to classify
          await addLog(`🔍 Vision-classifying with variants and soft categories: ${safeSoftCategories.join(', ') || 'None'}`);
          const classificationResult = await classifyWithImages(description1, name, categories, userTypes, safeSoftCategories, images, variantData.variants);
          const gptCategory = classificationResult.category;
          let productType = classificationResult.type || [];
          let softCategory = classificationResult.softCategory || [];

          // Update category, type, variants, and timestamp
          const updateData = { 
            category: gptCategory, 
            type: productType,
            softCategory: softCategory,
            url: product.url || product.permalink || product.link || null,
            image: product.image || (product.images && product.images.length > 0 ? product.images[0].src : null),
            // Add variant data
            variants: variantData.variants,
            sizes: variantData.sizes,
            colors: variantData.colors,
            categoryTypeProcessedAt: new Date() 
          };

          await collection.updateOne(
            { _id: product._id },
            { $set: updateData }
          );
          await addLog(`✅ Vision-classified ${name} as Category: ${(gptCategory || []).join(', ') || 'None'}, Type: ${(productType || []).join(', ') || 'None'}, Soft Category: ${(softCategory || []).join(', ') || 'None'}`);

        } else {
          // Original text-only reprocessing logic
          let metadataAppend = '';
          if (metadata && Array.isArray(metadata)) {
            const summarization = await summarizeMetadata(metadata);
            metadataAppend = summarization;
          }

          let categoryAppend = '';
          if (productCategories && Array.isArray(productCategories)) {
            categoryAppend = productCategories
              .filter(cat => cat.name)
              .map(cat => cat.name)
              .join('\n');
          }

          const enrichedDescription = `${description1}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();
          
          // Process variants first so we can pass them to classification
          const variantData = processProductVariants(product);
          await addLog(`🔧 Processed variants for ${name}: ${variantData.variants.length} variants, ${variantData.sizes.length} sizes, ${variantData.colors.length} colors`);

          await addLog(`📝 Using text-only classification with variants for: ${name}`);
          await addLog(`🔍 Text-classifying with variants and soft categories: ${safeSoftCategories.join(', ') || 'None'}`);
          const classificationResult = await classifyCategoryAndTypeWithGemini(enrichedDescription, name, categories, userTypes, safeSoftCategories, variantData.variants);
          
          const gptCategory = classificationResult.category;
          let productType = classificationResult.type || [];
          let softCategory = classificationResult.softCategory || [];

          const updateData = { 
            category: gptCategory, 
            type: productType, 
            softCategory: softCategory,
            url: product.url || product.permalink || product.link || null,
            image: product.image || (product.images && product.images.length > 0 ? product.images[0].src : null),
            // Convert price fields to numbers properly
            ...(product.price && { price: parsePrice(product.price) }),
            ...(product.regular_price && { regular_price: parsePrice(product.regular_price) }),
            ...(product.sale_price && { sale_price: parsePrice(product.sale_price) }),
            // Add variant data
            variants: variantData.variants,
            sizes: variantData.sizes,
            colors: variantData.colors,
            categoryTypeProcessedAt: new Date() 
          };

          await collection.updateOne(
            { _id: product._id },
            { $set: updateData }
          );

          await addLog(`✅ Text-classified ${name} as Category: ${(gptCategory || []).join(', ') || 'None'}, Type: ${(productType || []).join(', ') || 'None'}, Soft Category: ${(softCategory || []).join(', ') || 'None'}`);
        }
      }

      // progress tick
      done += 1;
      const progress = totalToProcess > 0 ? Math.round((done / totalToProcess) * 100) : 100;
      await statusCol.updateOne(
        { dbName },
        { $set: { done, progress } }
      );

    } catch (error) {
      await addLog(`❌ Error processing product ${product.id}: ${error.message}`);
    }
  }

  // Mark reprocess finished
  try {
    await client
      .db("users")
      .collection("users")
      .updateOne(
        { dbName },
        { $set: { lastReprocessAt: new Date(), reprocessFinishedAt: new Date() } },
        { upsert: false }
      );
    await addLog("🏁 Marked reprocess finished for user");
  } catch (userErr) {
    await addLog(`⚠️ Could not update user reprocess finish: ${userErr.message}`);
  }

  // Mark status as done
  await statusCol.updateOne(
    { dbName },
    { $set: { state: "done", finishedAt: new Date(), done, progress: 100 } }
  );

  await addLog("📦 Reprocess summary: processed=" + (productsToProcess?.length || 0));

  await client.close();
  try {
    await fs.unlink(lockFilePath);
  } catch (error) {
    // Ignore errors if the file is already gone
  }
  await addLog("✅ Closed MongoDB connection");
  return logs;
}

module.exports = reprocessProducts; 