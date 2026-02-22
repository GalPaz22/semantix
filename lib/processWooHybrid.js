/**
 * WooCommerce Hybrid Processing (text + images)
 * Uses shared utility modules to avoid duplication.
 */
import { MongoClient } from "mongodb";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { embed, callGemini, summarizeMetadata } from './shared/ai.js';
import { parsePrice, parseHtmlToPlainText, isValidImageUrl } from './shared/utils.js';
import { fetchImageAsBase64 } from './shared/browser.js';

const MONGO_URI = process.env.MONGODB_URI;

/** WooCommerce prices are already in dollars, no cent conversion needed */
const parsePriceWoo = (val) => parsePrice(val, false);

/** Generate visual description from images using shared AI */
async function describeImages(product) {
  const validImages = (product.images || [])
    .filter(img => isValidImageUrl(img.src))
    .slice(0, 3);
  if (validImages.length === 0) return "";

  try {
    const imagePromises = validImages.map(img => fetchImageAsBase64(img.src));
    const imageResults = await Promise.all(imagePromises);
    const validBase64Images = imageResults.filter(result => result !== null);
    if (validBase64Images.length === 0) return "";

    const result = await callGemini({
      contents: [{
        role: "user",
        parts: [
          { text: `Analyze the images for the product "${product.name}". Provide a detailed visual description focusing on unique characteristics, design patterns, material textures, and precise color shades. This description will be used for vector search, so be as descriptive as possible about the product's visual identity.` },
          ...validBase64Images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
        ]
      }],
      thinkingBudget: 0
    });
    return result?.trim() || "";
  } catch (error) {
    console.warn("Gemini image description failed:", error);
    return "";
  }
}

/** Translate and Enrich text to English using shared Gemini */
async function translateAndEnrich(text) {
  if (!text) return text;
  try {
    const result = await callGemini({
      contents: [{
        role: "user",
        parts: [{
          text: `Translate the following product information to English and enrich it into a cohesive, descriptive paragraph. 
Emphasize the product's unique characteristics, visual details, and qualitative attributes. 
The goal is to create a rich text that captures both the literal description and the "vibe" or style of the product for high-quality vector embedding.
Return ONLY the enriched English text:\n\n${text}`
        }]
      }],
      thinkingBudget: 1024
    });
    return result?.trim() || text;
  } catch (error) {
    console.warn("Translation/Enrichment failed:", error);
    return text;
  }
}

/** Classify product using shared Gemini */
async function classifyProduct(enrichedText, productName, categories, types, softCategories, variants = []) {
  const categoryList = categories.join(", ");
  const typeList = types.join(", ");
  const softCategoryList = softCategories.join(", ");

  let variantInfo = '';
  if (variants && variants.length > 0) {
    variantInfo = `\n\nVariants: ` + variants.map(v => `${v.title || ''} ${v.sku || ''}`).join(', ');
  }

  const prompt = `You are an expert e-commerce product classifier. Your task is to extract filters and classify the product based on its name, enriched description, and variant details.

Rules:
1. CATEGORY: Choose one or more categories from this list: [${categoryList}].
2. TYPE: Choose one or more types from this list: [${typeList}].
3. SOFT CATEGORY: Choose one or more soft categories (characteristics/attributes) from this list: [${softCategoryList}].
4. Be thorough but strictly stick to the provided lists.
5. If a category/type/softCategory isn't a clear match, don't include it.
6. Return ONLY a JSON object: {"category": [], "type": [], "softCategory": []}.

Product Name: ${productName}
Enriched Details: ${enrichedText}${variantInfo}`;

  try {
    const result = await callGemini({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      responseMimeType: "application/json",
      thinkingBudget: 0
    });

    if (!result) return { category: [], type: [], softCategory: [] };

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else return { category: [], type: [], softCategory: [] };
    }

    return {
      category: Array.isArray(parsed.category) ? parsed.category.filter(c => categories.includes(c)) : [],
      type: Array.isArray(parsed.type) ? parsed.type.filter(t => types.includes(t)) : [],
      softCategory: Array.isArray(parsed.softCategory) ? parsed.softCategory.filter(s => softCategories.includes(s)) : []
    };
  } catch (error) {
    console.warn("Classification failed:", error.message);
    return { category: [], type: [], softCategory: [] };
  }
}

/** Process WooCommerce variants */
function processWooCommerceVariants(product) {
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
    }));
    const allAttributes = variants.flatMap(v => v.attributes || []);
    const sizes = [...new Set(allAttributes.filter(attr => attr.name?.toLowerCase().includes('size')).map(attr => attr.option))].filter(Boolean);
    const colors = [...new Set(allAttributes.filter(attr => attr.name?.toLowerCase().includes('color') || attr.name?.toLowerCase().includes('colour')).map(attr => attr.option))].filter(Boolean);
    return { variants, sizes, colors };
  }
  return { variants: [], sizes: [], colors: [] };
}

/** Helper function to create basic product data */
function createBasicProductData(product) {
  const variantData = processWooCommerceVariants(product);
  const regularPrice = parsePriceWoo(product.regular_price);
  const salePrice = parsePriceWoo(product.sale_price);
  const activePrice = parsePriceWoo(product.price);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku || null,
    description: product.description,
    short_description: product.short_description,
    price: activePrice,
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
    onSale: product.on_sale || false,
    variants: variantData.variants,
    sizes: variantData.sizes,
    colors: variantData.colors
  };
}

/** Main Hybrid Processing Function */
export async function processWooHybrid({ wooUrl, wooKey, wooSecret, userEmail, categories, userTypes, softCategories, dbName }) {
  const logs = [];
  let statusCol;
  const addLog = async (message) => {
    logs.push(message);
    console.log(message);
    if (statusCol) {
      try {
        await statusCol.updateOne({ dbName }, { $push: { logs: message } }, { upsert: true });
      } catch (err) { }
    }
  };

  await addLog(`🚀 Starting Hybrid Processing for: ${userEmail || 'System Admin'} (DB: ${dbName})`);
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("products");
    statusCol = db.collection("sync_status");

    await statusCol.updateOne({ dbName }, { $set: { state: "processing", progress: 0, startedAt: new Date(), logs: [] } }, { upsert: true });

    const api = new WooCommerceRestApi({ url: wooUrl, consumerKey: wooKey, consumerSecret: wooSecret, version: "wc/v3" });

    // Fetch products
    let allProducts = [];
    let page = 1;
    let hasMorePages = true;
    while (hasMorePages) {
      const response = await api.get("products", { per_page: 100, page: page, status: 'publish' });
      const products = response.data || [];
      if (products.length === 0) { hasMorePages = false; break; }
      allProducts = allProducts.concat(products);
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
      hasMorePages = page < totalPages;
      page++;
    }

    await addLog(`🏪 Found ${allProducts.length} products.`);

    // 1. Initial Basic Upsert
    await addLog(`💾 Saving/updating basic data for all ${allProducts.length} products...`);
    for (const product of allProducts) {
      try {
        const basicData = createBasicProductData(product);
        await collection.updateOne(
          { id: product.id },
          {
            $set: basicData,
            $setOnInsert: {
              embedding: null, category: [], type: [], softCategory: [],
              description1: null, processedAt: null
            }
          },
          { upsert: true }
        );
      } catch (err) {
        await addLog(`❌ Error in basic upsert for ${product.name}: ${err.message}`);
      }
    }

    // 2. Identify which products need enrichment
    const productIds = allProducts.map(prod => prod.id);
    const existingProducts = await collection.find(
      { id: { $in: productIds }, embedding: { $exists: true, $ne: null } },
      { projection: { id: 1 } }
    ).toArray();
    const existingProductIds = new Set(existingProducts.map(prod => prod.id));
    const productsToProcessList = allProducts.filter(prod => !existingProductIds.has(prod.id));

    if (productsToProcessList.length === 0) {
      await addLog(`✨ All products already have embeddings - skipping AI enrichment.`);
      await statusCol.updateOne({ dbName }, { $set: { state: "done", finishedAt: new Date(), progress: 100 } });
      await client.close();
      return logs;
    }

    await addLog(`🔄 Starting enrichment for ${productsToProcessList.length} products...`);

    for (let i = 0; i < productsToProcessList.length; i++) {
      const product = productsToProcessList[i];
      try {
        await addLog(`\n🟡 Hybrid Processing: ${product.name} (${i + 1}/${productsToProcessList.length})`);

        // 1. Clean description
        const cleanedDescription = parseHtmlToPlainText(product.description);

        // 2. Visual description
        const visualDescription = await describeImages(product);

        // 3. Metadata summary
        const metadataSummary = await summarizeMetadata(product.meta_data);

        // 4. Categories
        const categoriesText = (product.categories || []).map(c => c.name).join(', ');

        // 5. Combine and Translate
        const combinedRaw = `Product: ${product.name}\nDescription: ${cleanedDescription}\nVisual Characteristics: ${visualDescription}\nTechnical Details: ${metadataSummary}\nCategories: ${categoriesText}`;

        const enrichedDescription = await translateAndEnrich(combinedRaw);
        await addLog(`✅ Enriched description created (Hybrid)`);

        // 6. Classification
        const variantData = processWooCommerceVariants(product);
        const classification = await classifyProduct(enrichedDescription, product.name, categories, userTypes, softCategories, variantData.variants);
        await addLog(`✅ Classified: ${classification.category.join(', ')}`);

        // 7. Embeddings
        const embedding = await embed(enrichedDescription);

        const updateDoc = {
          description1: enrichedDescription,
          embedding: embedding,
          category: classification.category,
          type: classification.type,
          softCategory: classification.softCategory,
          processedAt: new Date()
        };

        await collection.updateOne({ id: product.id }, { $set: updateDoc });

        // Update progress
        await statusCol.updateOne({ dbName }, { $set: { progress: Math.round(((i + 1) / productsToProcessList.length) * 100) } });

      } catch (error) {
        await addLog(`❌ Error processing ${product.name}: ${error.message}`);
      }
    }

    await statusCol.updateOne({ dbName }, { $set: { state: "done", finishedAt: new Date(), progress: 100 } });
    await addLog(`✅ Hybrid Processing Complete! (DB: ${dbName})`);

  } catch (error) {
    await addLog(`❌ Global Error: ${error.message}`);
  } finally {
    await client.close();
  }
  return logs;
}

export default processWooHybrid;
