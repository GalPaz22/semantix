import { MongoClient } from "mongodb";
import { XMLParser } from "fast-xml-parser";
import { embed, callGemini } from './shared/ai.js';
import { parsePrice, parseHtmlToPlainText, parseGeminiResult } from './shared/utils.js';

const MONGO_URI = process.env.MONGODB_URI;

/** Translate + enhance a Hebrew RSS product description to English using Gemini */
async function translateDescription(description) {
  if (!description || description.trim() === "") return null;
  try {
    const result = await callGemini({
      contents: [{
        role: "user",
        parts: [{
          text: `Translate the following text to English and enhance it for e-commerce semantic search.
Rules:
1. Preserve ALL information from the original text - do not shorten or summarize
2. Make it keyword-rich and factual
3. Keep all details, specifications, and features
4. If already in English, still enhance it for better searchability
5. Only return the translated/enhanced text, no additional commentary

Text to translate and enhance:
${description}`
        }]
      }],
      responseMimeType: "text/plain",
      thinkingBudget: 0
    });
    return result?.trim() || null;
  } catch (error) {
    console.error("❌ Translation failed:", error.message);
    return null;
  }
}

/**
 * Classify product using Gemini against user-defined category/type/softCategory lists.
 */
async function classifyCategoryAndTypeWithGemini(enrichedText, productName, userCategories, userTypes, softCategories, colors) {
  try {
    const categoriesArray = Array.isArray(userCategories) ? userCategories : [];
    const typesArray = Array.isArray(userTypes) ? userTypes : [];
    const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
    const colorsArray = Array.isArray(colors) ? colors : [];

    const categoryList = categoriesArray.join(", ");
    const typeList = typesArray.join(", ");
    const softCategoryList = softCategoriesArray.join(", ");
    const colorList = colorsArray.join(", ");

    const messages = [
      {
        role: "user",
        parts: [{
          text: `You are an advanced AI model specialized in e-commerce. Your task is to classify a product based on the details provided.
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
11. The "colors" field in your response MUST be an array. Select ALL colors that apply.
12. If NO color from the list is a suitable match, you MUST return an empty array for the "colors" field.
13.` : '10.'} Do NOT invent, create, or suggest new values. ONLY use values from the provided lists.

Product Details:
${enrichedText}

Product Name: ${productName}

Return ONLY a JSON object. For example:
{"category": ["Wine"], "type": ["Kosher"], "softCategory": ["Gifts"]${colorsArray.length > 0 ? ', "colors": ["Red"]' : ''}}`
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
    if (parsed.category && !Array.isArray(parsed.category)) {
      parsed.category = [parsed.category];
    }
    if (parsed.colors && Array.isArray(parsed.colors)) {
      parsed.colors = parsed.colors.filter(c => colorsArray.includes(c));
    } else {
      parsed.colors = [];
    }
    return parsed;

  } catch (error) {
    console.error("❌ Gemini classification failed:", error.message);
    return { category: [], type: [], softCategory: [], colors: [] };
  }
}

/** Parse price string like "92.00 ILS" -> number */
const parsePriceRSS = (val) => parsePrice(val, false);

/**
 * Fetch and parse the RSS/Google Merchant XML feed from a URL.
 * Returns an array of raw item objects.
 */
async function fetchRSSFeed(feedUrl) {
  const response = await fetch(feedUrl);
  if (!response.ok) throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
  const xml = await response.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    // Preserve g: namespaced tags
    parseTagValue: true,
    trimValues: true
  });

  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

/**
 * Map a raw RSS item to a normalized product document.
 * Handles CDATA wrappers produced by fast-xml-parser.
 */
function normalizeRSSItem(item) {
  const g = (key) => {
    const val = item[`g:${key}`];
    if (val === undefined || val === null) return null;
    // fast-xml-parser wraps CDATA as { __cdata: "..." }
    if (typeof val === 'object' && val.__cdata !== undefined) return String(val.__cdata).trim();
    return String(val).trim();
  };

  const id = g('id') || null;
  const rawTitle = g('title') || '';
  // Strip inventory suffixes added by the store e.g. " - אזל המלאי" / " - מלאי מוגבל" / " - אחרונים במלאי"
  const name = rawTitle.replace(/\s*-\s*(אזל המלאי|מלאי מוגבל|אחרונים במלאי)$/u, '').trim();

  const rawDescription = g('description') || '';
  const description = parseHtmlToPlainText(rawDescription);

  const availability = g('availability') || 'in_stock';
  const stockStatus = availability === 'in_stock' ? 'instock' : 'outofstock';

  const regularPrice = parsePriceRSS(g('price'));
  const salePriceRaw = g('sale_price');
  const salePrice = salePriceRaw ? parsePriceRSS(salePriceRaw) : 0;
  const price = salePrice > 0 ? salePrice : regularPrice;
  const onSale = salePrice > 0 && salePrice < regularPrice;

  const imageLink = g('image_link') || null;
  const link = g('link') || null;

  // product_type is hierarchical e.g. "יין ישראלי > יקב קנאטיר"
  const productTypeRaw = g('product_type') || '';
  const productTypeParts = productTypeRaw.split('>').map(s => s.trim()).filter(Boolean);

  const gtin = g('gtin') || null;
  const mpn = g('mpn') || null;
  const brand = g('brand') || null;
  const condition = g('condition') || 'new';
  const googleProductCategory = g('google_product_category') || null;

  return {
    id,
    name,
    description,
    rawDescription,
    price,
    regular_price: regularPrice,
    sale_price: salePrice,
    onSale,
    stockStatus,
    stock_status: stockStatus,
    image: imageLink,
    images: imageLink ? [{ src: imageLink }] : [],
    url: link,
    gtin,
    mpn,
    brand,
    condition,
    googleProductCategory,
    productType: productTypeParts[0] || null,      // top-level e.g. "יין ישראלי"
    productSubType: productTypeParts[1] || null,    // sub-level e.g. "יקב קנאטיר"
    categories: productTypeParts.map(name => ({ name })),
    variants: [],
    sizes: [],
    colors: [],
    fetchedAt: new Date()
  };
}

/**
 * Main function - fetch, process, and save RSS products to MongoDB.
 * Mirrors the processWooProducts() API so it can be wired up the same way.
 */
async function processRSSProducts({ feedUrl, userEmail, categories, userTypes, softCategories, colors, dbName }) {
  const logs = [];

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

  await addLog(`🚀 Starting RSS processing for: ${userEmail || 'System Admin'} (DB: ${dbName})`);
  await addLog(`🔗 RSS Feed URL: ${feedUrl}`);

  const validUserTypes = Array.isArray(userTypes) ? userTypes : [];
  const validColors = Array.isArray(colors) ? colors : [];
  await addLog(`🏷️ User types: ${validUserTypes.length > 0 ? validUserTypes.join(', ') : 'none'}`);

  const client = new MongoClient(MONGO_URI, { connectTimeoutMS: 30000, serverSelectionTimeoutMS: 30000 });

  try {
    await client.connect();
    await addLog("✅ Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection("products");
    statusCol = db.collection("sync_status");

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

    // ── 1. Fetch + parse the feed ──────────────────────────────────────────────
    await addLog("📡 Fetching RSS feed...");
    let rawItems;
    try {
      rawItems = await fetchRSSFeed(feedUrl);
    } catch (fetchErr) {
      await addLog(`❌ Failed to fetch RSS feed: ${fetchErr.message}`);
      await statusCol.updateOne({ dbName }, { $set: { state: "error", finishedAt: new Date() } });
      await client.close();
      return logs;
    }
    await addLog(`📦 Found ${rawItems.length} items in feed`);

    const allProducts = rawItems.map(normalizeRSSItem);
    await addLog(`✅ Parsed ${allProducts.length} products`);

    // ── 2. Identify which products already have embeddings ────────────────────
    const productIds = allProducts.map(p => p.id);
    const existingProducts = await collection.find(
      { id: { $in: productIds }, embedding: { $exists: true, $ne: null } },
      { projection: { id: 1 } }
    ).toArray();

    const existingProductIds = new Set(existingProducts.map(p => p.id));
    const productsToProcess = allProducts.filter(p =>
      !existingProductIds.has(p.id) && p.stockStatus === 'instock'
    );

    await addLog(`✅ ${existingProductIds.size} already have embeddings (will skip)`);
    await addLog(`🔄 ${productsToProcess.length} in-stock products need AI processing`);

    // ── 3. Save / upsert basic data for in-stock products only ───────────────
    const inStockToSave = allProducts.filter(p => p.stockStatus === 'instock');
    await addLog(`💾 Saving basic data for ${inStockToSave.length} in-stock products (${allProducts.length - inStockToSave.length} out-of-stock skipped)...`);
    for (const product of inStockToSave) {
      try {
        await collection.updateOne(
          { id: product.id },
          {
            $set: product,
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
      await addLog("✨ All products already have embeddings - no AI enrichment needed!");
      await statusCol.updateOne({ dbName }, { $set: { state: "done", finishedAt: new Date(), progress: 100 } });
      await addLog(`✅ RSS processing complete. Total products: ${allProducts.length}`);
      await client.close();
      return logs;
    }

    // ── 4. AI enrichment loop ─────────────────────────────────────────────────
    await addLog(`🤖 Starting AI enrichment for ${productsToProcess.length} products...`);

    for (const product of productsToProcess) {
      try {
        await addLog(`\n🟡 Processing: ${product.name} (ID: ${product.id})`);

        if (!product.description || product.description.trim() === "") {
          await addLog("⚠️ Skipping - no description");
          continue;
        }

        // Build enriched text: description + product type hierarchy
        const categoryAppend = product.categories.map(c => c.name).join(' > ');
        const enrichedOriginal = `${product.description}\n\nCategory: ${categoryAppend}`.trim();
        await addLog("✅ Description enriched with category info");

        // Translate to English
        const translatedDescription = await translateDescription(enrichedOriginal);
        if (!translatedDescription) {
          await addLog("⚠️ Skipping - translation failed");
          continue;
        }
        await addLog("✅ Description translated to English");

        // Classify
        const { category: gptCategory, type: productType, softCategory: productSoftCategory, colors: productColors } =
          await classifyCategoryAndTypeWithGemini(
            translatedDescription,
            product.name,
            categories,
            validUserTypes,
            softCategories,
            validColors
          );

        const finalCategory = Array.isArray(gptCategory) ? gptCategory : [];
        const finalType = Array.isArray(productType) ? productType : [];
        const finalSoftCategory = Array.isArray(productSoftCategory) ? productSoftCategory : [];
        const finalColors = Array.isArray(productColors) ? productColors : [];

        await addLog(`✅ ${product.name}: Cat: ${finalCategory.join(', ') || 'None'} | Types: ${finalType.join(', ') || 'None'} | Soft: ${finalSoftCategory.join(', ') || 'None'} | Colors: ${finalColors.join(', ') || 'None'}`);

        // Embed
        const embedding = await embed(translatedDescription);
        if (!embedding) {
          await addLog("⚠️ Embedding generation failed");
        } else {
          await addLog("✅ Embedding generated");
        }

        // Save enriched document
        await collection.updateOne(
          { id: product.id },
          {
            $set: {
              ...product,
              description1: translatedDescription,
              embedding,
              category: finalCategory,
              type: finalType,
              softCategory: finalSoftCategory,
              colors: finalColors,
              processedAt: new Date()
            }
          },
          { upsert: true }
        );

        await addLog(`💾 Saved: ${product.name}`);

      } catch (error) {
        await addLog(`❌ Error processing ${product.name}: ${error.message}`);
        console.error("Full error:", error);
      }
    }

    // ── 5. Finish ─────────────────────────────────────────────────────────────
    await statusCol.updateOne(
      { dbName },
      { $set: { state: "done", finishedAt: new Date(), progress: 100 } }
    );

    const finalCount = await collection.countDocuments({});
    await addLog(`📊 Final collection count: ${finalCount}`);

    await addLog(`✅ RSS processing complete for: ${userEmail || 'System Admin'} (DB: ${dbName})`);
    await addLog(`📊 Total products saved: ${allProducts.length}`);
    await addLog(`📊 Products enriched with AI: ${productsToProcess.length}`);

    await client.close();
    return logs;

  } catch (err) {
    await addLog(`❌ Fatal error: ${err.message}`);
    return logs;
  }
}

export { processRSSProducts };
