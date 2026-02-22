/**
 * WooCommerce Image-based Processing
 * Uses shared utility modules to avoid duplication.
 */
import { MongoClient } from "mongodb";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import pLimit from "p-limit";
import { appendLogs } from './syncStatus-esm.js';
import { embed, callGemini, summarizeMetadata } from './shared/ai.js';
import { parsePrice, isValidImageUrl } from './shared/utils.js';
import { fetchImageAsBase64, closeBrowser } from './shared/browser.js';

const {
  MONGODB_URI: MONGO_URI,
  IMG_CONCURRENCY = "3"
} = process.env;

/** WooCommerce prices are already in dollars, no cent conversion */
const parsePriceWoo = (val) => parsePrice(val, false);

/** Process and normalize variants for WooCommerce products */
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

/** Generate visual description from images using shared AI */
async function describeImages(product) {
  const validImages = (product.images || [])
    .filter(img => isValidImageUrl(img.src))
    .slice(0, 3);

  if (validImages.length === 0) {
    return `Product: ${product.name}. No valid images available for analysis.`;
  }

  try {
    const imagePromises = validImages.map(img => fetchImageAsBase64(img.src));
    const imageResults = await Promise.all(imagePromises);
    const validBase64Images = imageResults.filter(result => result !== null);

    if (validBase64Images.length === 0) {
      return `Product: ${product.name}. Failed to fetch images for analysis.`;
    }

    const result = await callGemini({
      contents: [{
        role: "user",
        parts: [
          { text: `Describe the main product details visible in the images for "${product.name}". Focus on design, shape, colors and unique attributes. Be concise and factual.` },
          ...validBase64Images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
        ]
      }],
      thinkingBudget: 0
    });

    return result?.trim() || `Product: ${product.name}. Image analysis completed but no description generated.`;
  } catch (error) {
    console.warn("Gemini image description failed:", error);
    return `Product: ${product.name}. Image analysis failed: ${error.message}`;
  }
}

/** Classify product into category, type, softCategory, and colors using Gemini */
async function classify(text, name, categories, types, softCategories, colors, context) {
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
  const colorsArray = Array.isArray(colors) ? colors : [];

  const categoryList = categoriesArray.join(", ");
  const typeList = typesArray.join(", ");
  const softCategoryList = softCategoriesArray.join(", ");
  const colorList = colorsArray.join(", ");

  const contextPrompt = context ? `\n\nBusiness Context: ${context}` : '';

  // Build colors rule only if colors list is provided
  const colorsRule = colorsArray.length > 0
    ? `\n5. Colors MUST be an array from the provided list: [${colorList}]. Select ONLY the primary or dominant colors of the product based on its description, images, and variant information. Ignore minor accents, small details, or tiny stripes (e.g., if a shirt is white with a small blue logo, select ONLY "White"). If no clear dominant match, return an empty array.`
    : '';
  const colorsExample = colorsArray.length > 0
    ? ', "colors": ["MainColor"]'
    : '';

  try {
    const result = await callGemini({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an expert product classifier. Analyze the provided product information to assign accurate categories, types, and tags.
Follow these rules:
1.  Category MUST be an array from this exact list: [${categoryList}]. If no match, return an empty array.
2.  Type MUST be an array from: [${typeList}]. If no match, return an empty array.
3.  Soft Category (Tags) MUST be an array from: [${softCategoryList}]. If no match, return an empty array.
4.  Do NOT invent new values - only use values from the lists provided.${colorsRule}
6. Focus on identifying the DOMINANT visual characteristics. Avoid selecting a color if it only appears as a minor accent.
${contextPrompt}

Product Name: ${name}
Product Context:
${text}

Return ONLY a JSON object like: {"category": ["Cat1"], "type": ["Type1"], "softCategory": ["Soft1", "Soft2"]${colorsExample}}`
            }
          ]
        }
      ],
      responseMimeType: "application/json",
      thinkingBudget: 0
    });

    if (!result) return { category: [], type: [], softCategory: [], colors: [] };

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else return { category: [], type: [], softCategory: [], colors: [] };
    }

    // Validate against allowed values
    if (parsed.category && Array.isArray(parsed.category)) {
      parsed.category = parsed.category.filter(c => categoriesArray.includes(c));
    } else if (parsed.category && typeof parsed.category === 'string') {
      parsed.category = categoriesArray.includes(parsed.category) ? [parsed.category] : [];
    } else {
      parsed.category = [];
    }

    if (parsed.type && Array.isArray(parsed.type)) {
      parsed.type = parsed.type.filter(t => typesArray.includes(t));
    } else {
      parsed.type = [];
    }

    if (parsed.softCategory && Array.isArray(parsed.softCategory)) {
      parsed.softCategory = parsed.softCategory.filter(s => softCategoriesArray.includes(s));
    } else {
      parsed.softCategory = [];
    }

    if (parsed.colors && Array.isArray(parsed.colors)) {
      parsed.colors = parsed.colors.filter(c => colorsArray.includes(c));
    } else {
      parsed.colors = [];
    }

    return parsed;
  } catch (e) {
    console.warn("Gemini classification failed:", e);
    return { category: [], type: [], softCategory: [], colors: [] };
  }
}

export default async function processWooImages({ wooUrl, wooKey, wooSecret, dbName, categories, type: userTypes, softCategories, colors, context }) {
  const logs = [];
  const log = async (message) => {
    console.log(message);
    logs.push(message);
    await appendLogs(dbName, [message]);
  };

  await log(`🚀 Starting WooCommerce image processing for database: ${dbName}`);
  await log(`🔍 wooUrl: ${wooUrl}`);
  await log(`🔍 dbName: ${dbName}`);

  const validCategories = Array.isArray(categories) ? categories : [];
  const validUserTypes = Array.isArray(userTypes) ? userTypes : [];
  const validSoftCategories = Array.isArray(softCategories) ? softCategories : [];
  const validColors = Array.isArray(colors) ? colors : [];

  await log(`📂 Categories: ${validCategories.length} items`);
  await log(`🏷️ Types: ${validUserTypes.length} items → ${validUserTypes.join(', ') || 'none'}`);
  await log(`🏷️ Soft Categories: ${validSoftCategories.length} items`);
  await log(`🎨 Colors: ${validColors.length} items → ${validColors.join(', ') || 'none'}`);
  await log(`📝 Context: ${context || '(none)'}`);

  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const db = client.db(dbName);
  const productsCol = db.collection("products");
  const statusCol = db.collection("sync_status");

  await statusCol.updateOne(
    { dbName }, { $set: { state: "running", startedAt: new Date(), done: 0, total: 0 } }, { upsert: true }
  );

  const api = new WooCommerceRestApi({
    url: wooUrl, consumerKey: wooKey, consumerSecret: wooSecret, version: "wc/v3"
  });

  // Fetch all products with pagination
  let allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const { data: pageProducts = [] } = await api.get("products", { per_page: 100, page, _embed: true });
      allProducts = allProducts.concat(pageProducts);
      await log(`📦 Fetched page ${page}: ${pageProducts.length} products (total: ${allProducts.length})`);
      hasMore = pageProducts.length === 100;
      page++;
    } catch (err) {
      await log(`⚠️ Error fetching page ${page}: ${err.message}`);
      hasMore = false;
    }
  }

  await log(`📦 Total products fetched: ${allProducts.length}`);

  // Fetch variations for variable products
  for (const product of allProducts) {
    if (product.type === 'variable' && product.variations && product.variations.length > 0) {
      try {
        await log(`🔧 Fetching ${product.variations.length} variations for: ${product.name}`);
        const variationsResponse = await api.get(`products/${product.id}/variations`, { per_page: 100 });
        product.variations = variationsResponse.data || [];
        await log(`✅ Loaded ${product.variations.length} variations for: ${product.name}`);
      } catch (variationError) {
        await log(`⚠️ Could not fetch variations for ${product.name}: ${variationError.message}`);
        product.variations = [];
      }
    } else {
      product.variations = [];
    }
  }

  await statusCol.updateOne({ dbName }, { $set: { total: allProducts.length } });

  // 1. Initial Basic Upsert for all products
  await log(`💾 Saving/updating basic data for all ${allProducts.length} products...`);
  for (const product of allProducts) {
    try {
      const basicData = createBasicProductData(product);
      await productsCol.updateOne(
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
      await log(`❌ Error in basic upsert for ${product.name}: ${err.message}`);
    }
  }

  // 2. Filter which products need enrichment
  const productIds = allProducts.map(prod => prod.id);
  const existingProducts = await productsCol.find(
    { id: { $in: productIds }, embedding: { $exists: true, $ne: null } },
    { projection: { id: 1 } }
  ).toArray();
  const existingProductIds = new Set(existingProducts.map(prod => prod.id));
  const productsToEnrich = allProducts.filter(prod => !existingProductIds.has(prod.id));

  if (productsToEnrich.length === 0) {
    await log(`✨ All products already have embeddings - skipping AI enrichment.`);
    await statusCol.updateOne({ dbName }, { $set: { state: "done", finishedAt: new Date(), progress: 100 } });
    await client.close();
    await closeBrowser();
    return logs;
  }

  await log(`🔄 Starting concurrent enrichment for ${productsToEnrich.length} products...`);
  const limit = pLimit(Number(IMG_CONCURRENCY));
  let done = 0;

  await Promise.all(productsToEnrich.map(prod => limit(async () => {
    try {
      await log(`🔄 Processing: ${prod.name} (ID: ${prod.id})`);

      const imageDescription = await describeImages(prod);

      // Summarize metadata
      let metadataAppend = '';
      if (prod.meta_data && Array.isArray(prod.meta_data)) {
        metadataAppend = await summarizeMetadata(prod.meta_data);
      }

      // Extract category names
      let categoryAppend = '';
      if (prod.categories && Array.isArray(prod.categories)) {
        categoryAppend = prod.categories.filter(cat => cat.name).map(cat => cat.name).join('\n');
      }

      // Create enriched description
      const enrichedDescription = `${imageDescription}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();

      const embedding = await embed(enrichedDescription);
      const classification = await classify(enrichedDescription, prod.name, validCategories, validUserTypes, validSoftCategories, validColors, context);

      const category = classification?.category || [];
      const types = classification?.type || [];
      const softCats = classification?.softCategory || [];
      const productColors = classification?.colors || [];

      await log(`✅ ${prod.name}: Cat: ${category.length > 0 ? category.join(', ') : 'None'} | Types: ${types.length > 0 ? types.join(', ') : 'None'} | Soft: ${softCats.length > 0 ? softCats.join(', ') : 'None'} | Colors: ${productColors.length > 0 ? productColors.join(', ') : 'None'}`);

      const updateDoc = {
        description1: enrichedDescription,
        embedding: embedding,
        category: category,
        type: types,
        softCategory: softCats,
        colors: productColors,
        processedAt: new Date()
      };

      await productsCol.updateOne(
        { id: prod.id },
        { $set: updateDoc }
      );

      done += 1;
      await statusCol.updateOne({ dbName }, { $set: { done } });
    } catch (err) {
      await log(`❌ Error processing ${prod.name}: ${err.message}`);
      done += 1;
      await statusCol.updateOne({ dbName }, { $set: { done } });
    }
  })));

  await statusCol.updateOne(
    { dbName }, { $set: { state: "done", finishedAt: new Date(), done: allProducts.length } }
  );

  await log(`🏁 Done! Processed ${allProducts.length} products. (DB: ${dbName})`);

  await client.close();
  await closeBrowser();

  return logs;
}
