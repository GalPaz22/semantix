import { MongoClient } from "mongodb";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { embed, callGemini, summarizeMetadata } from './shared/ai.js';
import { parsePrice, parseHtmlToPlainText, parseGeminiResult } from './shared/utils.js';

const MONGO_URI = process.env.MONGODB_URI;

/** Translate description using Gemini AI */
async function translateDescription(description) {
  if (!description || description.trim() === "") return null;
  try {
    const result = await callGemini({
      contents: [{ role: "user", parts: [{ text: `Translate the following text to English:\n\n${description}` }] }],
      responseMimeType: "text/plain",
      thinkingBudget: 0
    });
    return result?.trim() || null;
  } catch (error) {
    console.error("❌ Translation failed:", error.message);
    return null;
  }
}

// summarizeMetadata, embed (as generateEmbeddings), parseGeminiResult imported from shared modules
const generateEmbeddings = embed; // alias for backward compatibility

/**
 * Use Google Gemini to determine product category and type based on enriched text.
 * @param {string} enrichedText - The product text for classification.
 * @param {string} productName - The name of the product.
 * @param {string[]} userCategories - The list of allowed categories.
 * @param {string[]} userTypes - The list of allowed types.
 * @param {string[]} softCategories - The list of allowed soft categories.
 * @param {Object[]} variants - The product variants for enhanced classification.
 */
async function classifyCategoryAndTypeWithGemini(enrichedText, productName, userCategories, userTypes, softCategories, colors, variants = []) {
  try {
    // Ensure userCategories, userTypes, softCategories, and colors are arrays
    const categoriesArray = Array.isArray(userCategories) ? userCategories : [];
    const typesArray = Array.isArray(userTypes) ? userTypes : [];
    const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
    const colorsArray = Array.isArray(colors) ? colors : [];

    const categoryList = categoriesArray.join(", ");
    const typeList = typesArray.join(", ");
    const softCategoryList = softCategoriesArray.join(", ");
    const colorList = colorsArray.join(", ");

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
        if (v.attributes && v.attributes.length > 0) {
          const attrs = v.attributes.map(attr => `${attr.name}: ${attr.option}`).join(', ');
          details.push(`Attributes: ${attrs}`);
        }
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
        parts: [{
          text: `You are an advanced AI model specialized in e-commerce. Your task is to classify a product based on the details and variant information provided.
You MUST follow these rules strictly:
1.  Choose one or more categories for the product from this EXACT list: [${categoryList}].
2.  The "category" field in your response MUST be an array.
3.  If NO category from the list is a suitable match, you MUST return an empty array for the "category" field.
4.  Choose one or more types for the product from this EXACT list: [${typeList}].
5.  The "type" field in your response MUST be an array.
6.  If NO type from the list is a suitable match, you MUST return an empty array for the "type" field.
7.  Choose one or more soft categories for the product from this EXACT list: [${softCategoryList}].
8.  The "softCategory" field in your response MUST be an array.
9.  If NO soft category from the list is a suitable match, you MUST return an empty array for the "softCategory" field.
${colorsArray.length > 0 ? `10. Choose one or more colors for the product from this EXACT list: [${colorList}].
11. The "colors" field in your response MUST be an array. Select ALL colors that apply based on description and variants.
12. If NO color from the list is a suitable match, you MUST return an empty array for the "colors" field.
13.` : '10.'} Use variant information (colors, sizes, attributes, options) to enhance your classification accuracy.
${colorsArray.length > 0 ? '14.' : '11.'} Do NOT invent, create, or suggest new values. ONLY use values from the provided lists.

Product Details:
${enrichedText}

Product Name: ${productName}${variantInfo}

Return ONLY a JSON object. For example:
{"category": ["יין אדום"], "type": ["כשר"], "softCategory": ["אירועים מיוחדים"]${colorsArray.length > 0 ? ', "colors": ["אדום"]' : ''}}`
        }]
      }
    ];

    const resultText = await callGemini({
      contents: messages,
      responseMimeType: "application/json",
      thinkingBudget: 0
    });
    if (!resultText) throw new Error("No response from Gemini");

    const parsed = parseGeminiResult(resultText);
    if (parsed && parsed.category && !Array.isArray(parsed.category)) {
      parsed.category = [parsed.category];
    }
    // Validate colors
    if (parsed.colors && Array.isArray(parsed.colors)) {
      parsed.colors = parsed.colors.filter(c => colorsArray.includes(c));
    } else {
      parsed.colors = [];
    }
    return parsed;

  } catch (error) {
    console.error("❌ Gemini classification failed:", error.message);
    console.error("❌ Context - Product:", productName);
    console.error("❌ Context - Categories:", categoriesArray.length, "Types:", typesArray.length, "SoftCats:", softCategoriesArray.length, "Colors:", colorsArray.length);

    return { category: [], type: [], softCategory: [], colors: [] };
  }
}

/** Fallback Gemini classification with simplified prompt */
async function classifyCategoryUsingGeminiSimple(translatedDescription, productName, userCategories) {
  try {
    const result = await callGemini({
      contents: [{ role: 'user', parts: [{ text: `From the following list: [${userCategories.join(', ')}], pick the most suitable category for "${productName}".\nDescription: ${translatedDescription}\nReturn ONLY: {"category": ["The Category"]}` }] }],
      responseMimeType: "application/json",
      thinkingBudget: 0
    });
    const parsed = parseGeminiResult(result || "");
    return { category: parsed.category || [], type: [] };
  } catch (error) {
    console.error(`❌ Fallback classification failed for "${productName}":`, error.message);
    return { category: [], type: [] };
  }
}

// WooCommerce prices are already in dollars, not cents
const parsePriceWoo = (val) => parsePrice(val, false);

/** Process and normalize variants for WooCommerce products */
function processWooCommerceVariants(product) {
  // Handle WooCommerce variants (if they exist)
  if (product.variations && Array.isArray(product.variations)) {
    const variants = product.variations.map(variation => ({
      id: variation.id,
      title: variation.description || `${product.name} - Variation`,
      sku: variation.sku || null,
      price: parsePriceWoo(variation.price),
      regular_price: parsePriceWoo(variation.regular_price),
      sale_price: parsePriceWoo(variation.sale_price),
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

/** Helper function to create basic product data */
function createBasicProductData(product) {
  const variantData = processWooCommerceVariants(product);

  const regularPrice = parsePriceWoo(product.regular_price);
  const salePrice = parsePriceWoo(product.sale_price);
  const activePrice = parsePriceWoo(product.price); // ✅ Just use product.price directly

  return {
    id: product.id,
    name: product.name,
    sku: product.sku || null,
    description: product.description,
    short_description: product.short_description,
    price: activePrice, // ✅ This already has the discount applied
    regular_price: regularPrice,
    sale_price: salePrice,
    stock_status: product.stock_status,
    categories: product.categories,
    images: product.images,
    metadata: product.meta_data,
    url: product.permalink || product.link || null,
    image: product.images && product.images.length > 0 ? product.images[0].src : null,
    stockStatus: product.stock_status,
    fetchedAt: new Date(),
    onSale: product.on_sale || false, // ✅ WordPress plugin sets this correctly
    variants: variantData.variants,
    sizes: variantData.sizes,
    colors: variantData.colors
  };
}

/** Local category detection */
function updateLocalCategoryTypes(categories, description, userTypes) {
  // Ensure userTypes is an array
  const validUserTypes = Array.isArray(userTypes) ? userTypes : [];

  // Ensure categories is an array
  if (!Array.isArray(categories)) return [];

  const typeMarkers = [];

  for (const cat of categories) {
    if (!cat?.name) continue;
    const name = cat.name;

    // Skip if explicitly "לא כשר" or "Not Kosher"
    const isNotKosher = /לא\s*כשר|Not\s*Kosher/.test(name);

    if (!isNotKosher && /\bכשר\b|\bKosher\b/.test(name) && validUserTypes.includes("כשר")) {
      typeMarkers.push("כשר");
    }

    // Check for "מבצע" (sale) in category names like "2 יינות במבצע"
    if (/2 יינות ב|3 יינות ב|2 Wines B|3 Wines B/.test(name) && validUserTypes.includes("מבצע")) {
      typeMarkers.push("מבצע");
    }
  }

  // Also check description for kosher markers
  if (description && /\bכשר\b/.test(description) && !/לא\s*כשר/.test(description) && validUserTypes.includes("כשר")) {
    typeMarkers.push("כשר");
  }

  return [...new Set(typeMarkers)]; // Remove duplicates
}

/** 
 * Fetch and process WooCommerce products with enrichment.
 */
async function processWooProducts({ wooUrl, wooKey, wooSecret, userEmail, categories, userTypes, softCategories, colors, dbName }) {
  const logs = [];

  // Helper function to add logs and write to DB in real-time
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

  await addLog(`🚀 Starting WooCommerce processing for: ${userEmail || 'System Admin'} (DB: ${dbName})`);
  await addLog(`🔗 WooCommerce URL: ${wooUrl}`);

  // Validate and ensure userTypes is an array
  const validUserTypes = Array.isArray(userTypes) ? userTypes : [];
  await addLog(`🏷️ User types: ${validUserTypes.length > 0 ? validUserTypes.join(', ') : 'none'}`);

  const client = new MongoClient(MONGO_URI, { connectTimeoutMS: 30000, serverSelectionTimeoutMS: 30000 });

  try {
    await client.connect();
    await addLog("✅ Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection("products");
    statusCol = db.collection("sync_status");

    // Initialize status
    await statusCol.updateOne(
      { dbName },
      {
        $set: {
          dbName,
          state: "processing",
          progress: 0,
          startedAt: new Date(),
          logs: []
        }
      },
      { upsert: true }
    );

    const api = new WooCommerceRestApi({
      url: wooUrl,
      consumerKey: wooKey,
      consumerSecret: wooSecret,
      version: "wc/v3"
    });

    await addLog("🛍️ Fetching all products from WooCommerce...");
    let allProducts = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const response = await api.get("products", {
          per_page: 100,
          page: page,
          status: 'publish',
          _embed: true // This includes variations and other related data
        });

        await addLog(`🔍 Raw API Response Headers: ${JSON.stringify(response.headers)}`);
        await addLog(`📊 Total WooCommerce Products (from headers): ${response.headers['x-wp-total'] || 'unknown'}`);
        await addLog(`📑 Total Pages (from headers): ${response.headers['x-wp-totalpages'] || 'unknown'}`);

        const products = response.data || [];
        if (products.length === 0) {
          await addLog(`⚠️ Page ${page}: No products found - ending pagination`);
          hasMorePages = false;
          break;
        }

        // Log first product structure to debug
        if (page === 1 && products.length > 0) {
          await addLog(`🔍 First product structure example:`);
          await addLog(JSON.stringify({
            id: products[0].id,
            name: products[0].name,
            status: products[0].status,
            stock_status: products[0].stock_status
          }, null, 2));
        }

        // For each product, fetch variations if it's a variable product
        for (const product of products) {
          if (product.type === 'variable' && product.variations && product.variations.length > 0) {
            try {
              await addLog(`🔧 Fetching ${product.variations.length} variations for: ${product.name}`);
              const variationsResponse = await api.get(`products/${product.id}/variations`, {
                per_page: 100
              });
              product.variations = variationsResponse.data || [];
              await addLog(`✅ Loaded ${product.variations.length} variations for: ${product.name}`);
            } catch (variationError) {
              await addLog(`⚠️ Could not fetch variations for ${product.name}: ${variationError.message}`);
              product.variations = []; // Ensure it's an array
            }
          } else {
            product.variations = []; // Ensure variations is always an array
          }
        }

        allProducts = allProducts.concat(products);
        await addLog(`📄 Fetched page ${page}: ${products.length} products found (Running total: ${allProducts.length})`);

        const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
        hasMorePages = page < totalPages;
        page++;

      } catch (error) {
        await addLog(`❌ Error fetching page ${page} from WooCommerce: ${error.message}`);
        hasMorePages = false; // Stop fetching on error
      }
    }



    const productsToEnrich = allProducts;

    // Check which products already have embeddings in the database
    const productIds = productsToEnrich.map(prod => prod.id);
    await addLog(`🔍 MongoDB Query for existing products: { id: { $in: [${productIds.slice(0, 5).join(', ')}...] }, embedding: { $exists: true, $ne: null } }`);
    const existingProducts = await collection.find(
      {
        id: { $in: productIds },
        embedding: { $exists: true, $ne: null }
      },
      { projection: { id: 1 } }
    ).toArray();

    await addLog(`📊 MongoDB existing products sample (first 5): ${JSON.stringify(existingProducts.slice(0, 5))}`);

    const existingProductIds = new Set(existingProducts.map(prod => prod.id));
    const productsToProcess = productsToEnrich.filter(prod => !existingProductIds.has(prod.id));

    await addLog(`📦 Found ${allProducts.length} total products`);
    await addLog(`🏪 Processing all fetched products regardless of stock status`);
    await addLog(`✅ ${existingProductIds.size} already have embeddings (will skip)`);
    await addLog(`🔄 ${productsToProcess.length} products need processing`);

    // Save basic data for all products even if no enrichment is needed
    await addLog(`💾 Saving/updating basic data for all ${allProducts.length} products...`);

    for (const product of allProducts) {
      try {
        const basicProductData = createBasicProductData(product);

        // Log SKU information
        if (basicProductData.sku) {
          await addLog(`📦 Product SKU: ${product.name} - ${basicProductData.sku}`);
        }

        // Update with basic data (won't overwrite existing embeddings)
        await collection.updateOne(
          { id: product.id },
          {
            $set: basicProductData,
            $setOnInsert: {
              embedding: null,
              category: [],
              type: [],
              softCategory: [],
              description1: null,
              processedAt: null
            }
          },
          { upsert: true }
        );

      } catch (error) {
        await addLog(`❌ Error saving basic data for ${product.name}: ${error.message}`);
      }
    }

    if (productsToProcess.length === 0) {
      await addLog(`✨ All products already have embeddings - no AI enrichment needed!`);

      // Mark as completed
      await statusCol.updateOne(
        { dbName },
        { $set: { state: "done", finishedAt: new Date(), progress: 100 } }
      );

      await addLog(`✅ WooCommerce processing complete for: ${userEmail || 'System Admin'} (DB: ${dbName})`);
      await addLog(`📊 Total products saved: ${allProducts.length}`);
      await addLog(`📊 Products enriched with AI: 0 (all already processed)`);
      await addLog("🔐 Closing MongoDB connection");

      await client.close();
      console.log("✅ MongoDB connection closed");
      return logs;
    }



    // Step 3: Process products that need enrichment (only in-stock ones without embeddings)
    await addLog(`🔄 Starting to enrich ${productsToProcess.length} products...`);

    for (const product of productsToProcess) {
      try {
        await addLog(`\n🟡 Processing: ${product.name} (ID: ${product.id})`);

        const { _id, name, description, categories: productCategories, metadata, onSale } = product;

        if (!description || description.trim() === "") {
          await addLog("⚠️ Skipping - no description");
          continue;
        }

        // 1) Clean the original description (remove HTML, extra whitespace, etc.)
        const cleanedDescription = parseHtmlToPlainText(description).trim();
        await addLog("✅ Description cleaned");

        // 2) Summarize metadata
        const metadataAppend = await summarizeMetadata(metadata);
        const categoryAppend = productCategories?.map(c => c.name).join('\n') || '';

        // 3) Create enriched description by appending metadata and categories to original
        const enrichedOriginalDescription = `${cleanedDescription}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();
        await addLog("✅ Metadata and categories appended to original description");

        // 4) Translate the entire enriched description as one piece
        const translatedDescription = await translateDescription(enrichedOriginalDescription);
        if (!translatedDescription) {
          await addLog("⚠️ Skipping - translation of enriched description failed");
          continue;
        }
        await addLog("✅ Complete enriched description translated");

        // 5) Use the translated enriched description for classification and embedding
        const enrichedDescription = translatedDescription;

        // 5) Process variants first to include in classification
        const variantData = processWooCommerceVariants(product);
        await addLog(`🔧 Processing variants for ${name}: ${variantData.variants.length} variants, ${variantData.sizes.length} sizes, ${variantData.colors.length} colors`);

        // 6) Use Gemini/GPT to classify category, type, softCategory, and colors with variant data
        const validColors = Array.isArray(colors) ? colors : [];
        const { category: gptCategory, type: productType, softCategory: productSoftCategory, colors: productColors } = await classifyCategoryAndTypeWithGemini(
          enrichedDescription,
          name,
          categories,
          validUserTypes,
          softCategories,
          validColors,
          variantData.variants
        );

        if (!gptCategory && (!productType || productType.length === 0)) {
          await addLog("⚠️ Warning - no valid category or type found");
        }

        const finalType = Array.isArray(productType) ? productType : [];
        const finalSoftCategory = Array.isArray(productSoftCategory) ? productSoftCategory : (productSoftCategory ? [productSoftCategory] : []);
        const finalColors = Array.isArray(productColors) ? productColors : [];

        await addLog(`✅ ${name}: Cat: ${gptCategory || 'None'} | Types: ${finalType.join(', ') || 'None'} | Soft: ${finalSoftCategory.join(', ') || 'None'} | Colors: ${finalColors.join(', ') || 'None'}`);

        // 6) Generate embeddings
        const embedding = await generateEmbeddings(enrichedDescription);
        if (!embedding) {
          await addLog("⚠️ Warning - embedding generation failed");
        } else {
          await addLog("✅ Embedding generated");
        }

        // 7) Prepare update document with AI enrichment data (variants already processed above)
        const updateDoc = {
          ...createBasicProductData(product),
          description1: enrichedDescription,
          embedding: embedding,
          category: gptCategory || [],
          type: finalType,
          softCategory: finalSoftCategory,
          colors: finalColors,
          // Override variants with the processed data from above
          variants: variantData.variants,
          sizes: variantData.sizes,
          variantColors: variantData.colors,
          processedAt: new Date()
        };

        await addLog(`🔍 Price conversion debug - Original: ${product.price} (${typeof product.price}) -> Parsed: ${updateDoc.price} (${typeof updateDoc.price})`);
        await addLog(`🔍 Regular price debug - Original: ${product.regular_price} (${typeof product.regular_price}) -> Parsed: ${updateDoc.regular_price} (${typeof updateDoc.regular_price})`);
        await addLog(`🔍 Sale price debug - Original: ${product.sale_price} (${typeof product.sale_price}) -> Parsed: ${updateDoc.sale_price} (${typeof updateDoc.sale_price})`);

        // Validate that all prices are numbers
        const priceFields = ['price', 'regular_price', 'sale_price'];
        const invalidPrices = priceFields.filter(field => typeof updateDoc[field] !== 'number');
        if (invalidPrices.length > 0) {
          await addLog(`❌ WARNING: Non-numeric prices detected: ${invalidPrices.join(', ')}`);
        } else {
          await addLog(`✅ All price fields are properly converted to numbers`);
        }

        await addLog(`🔍 Updating MongoDB document for product ${product.id}:`);
        await addLog(`Query: { _id: ${_id} }`);
        await addLog(`Update: $set with fields: ${Object.keys(updateDoc).join(', ')}`);

        const updateResult = await collection.updateOne(
          { id: product.id }, // Changed from _id to id for consistency
          { $set: updateDoc },
          { upsert: true } // Added upsert option
        );

        await addLog(`📝 MongoDB update result: ${JSON.stringify({
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount,
          upserted: updateResult.upsertedCount
        })}`);
        await addLog(`💾 Updated product: ${name}`);

      } catch (error) {
        const errMsg = `❌ Error processing ${product.name}: ${error.message}`;
        await addLog(errMsg);
        console.error("Full error:", error);
      }
    }

    // Mark as completed
    await statusCol.updateOne(
      { dbName },
      { $set: { state: "done", finishedAt: new Date(), progress: 100 } }
    );

    // Before closing, check final collection state
    const finalCount = await collection.countDocuments({});
    await addLog(`📊 Final collection count: ${finalCount} documents`);
    const processedCount = await collection.countDocuments({ processedAt: { $exists: true } });
    await addLog(`📊 Processed documents count: ${processedCount}`);
    const withEmbeddings = await collection.countDocuments({ embedding: { $exists: true } });
    await addLog(`📊 Documents with embeddings: ${withEmbeddings}`);

    await addLog(`✅ WooCommerce processing complete for: ${userEmail || 'System Admin'} (DB: ${dbName})`);
    await addLog(`📊 Total products saved: ${allProducts.length}`);
    await addLog(`📊 Products enriched with AI: ${productsToProcess.length}`);
    await addLog("🔐 Closing MongoDB connection");

    await client.close();
    console.log("✅ MongoDB connection closed");
    return logs;

  } catch (err) {
    await addLog(`❌ MongoDB connection failed: ${err.message}`);
    return logs;
  }
}

export {
  processWooProducts,
  classifyCategoryAndTypeWithGemini,
  summarizeMetadata
};