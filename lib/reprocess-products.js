/**
 * Product Reprocessing Module
 * Supports both CLI and API usage.
 * Uses shared utility modules for AI, browser, and parsing functions.
 * 
 * Kept as CommonJS for CLI compatibility (node reprocess-products.js <dbName>).
 */
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const LOCK_DIR = os.tmpdir();
const getLockFilePath = (dbName) => path.join(LOCK_DIR, `reprocessing_${dbName}.lock`);

/**
 * Lazy-load shared modules (ESM) from CommonJS context.
 * Cached after first load for performance.
 */
let _sharedModules = null;
async function getSharedModules() {
  if (_sharedModules) return _sharedModules;

  const [aiModule, browserModule, utilsModule] = await Promise.all([
    import('./shared/ai.js'),
    import('./shared/browser.js'),
    import('./shared/utils.js')
  ]);

  _sharedModules = {
    // AI functions
    embed: aiModule.embed,
    callGemini: aiModule.callGemini,
    summarizeMetadata: aiModule.summarizeMetadata,
    ai: aiModule.ai,
    // Browser functions
    fetchImageAsBase64: browserModule.fetchImageAsBase64,
    closeBrowser: browserModule.closeBrowser,
    // Utility functions
    parsePrice: utilsModule.parsePrice,
    isValidImageUrl: utilsModule.isValidImageUrl,
    parseGeminiResult: utilsModule.parseGeminiResult
  };

  return _sharedModules;
}

/**
 * Get the best available description from a product
 */
function getProductDescription(product) {
  if (product.description && typeof product.description === 'string' && product.description.trim() !== '') {
    return product.description;
  }
  if (product.short_description && typeof product.short_description === 'string' && product.short_description.trim() !== '') {
    return product.short_description;
  }
  if (product.name && typeof product.name === 'string' && product.name.trim() !== '') {
    return product.name;
  }
  return '';
}

/**
 * Process and normalize variants for both WooCommerce and Shopify
 */
function processProductVariants(product, parsePrice) {
  // If this is already a processed MongoDB document with variant data, preserve it
  if (product.variants && Array.isArray(product.variants) &&
    product.sizes && Array.isArray(product.sizes) &&
    product.colors && Array.isArray(product.colors)) {
    return { variants: product.variants, sizes: product.sizes, colors: product.colors };
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
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))].sort();
    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
    return { variants, sizes, colors };
  }

  // Handle WooCommerce variants
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
    const allAttributes = variants.flatMap(v => v.attributes || []);
    const sizes = [...new Set(allAttributes.filter(attr =>
      attr.name?.toLowerCase().includes('size')).map(attr => attr.option))].filter(Boolean);
    const colors = [...new Set(allAttributes.filter(attr =>
      attr.name?.toLowerCase().includes('color') || attr.name?.toLowerCase().includes('colour')).map(attr => attr.option))].filter(Boolean);
    return { variants, sizes, colors };
  }

  return { variants: [], sizes: [], colors: [] };
}

/**
 * Describe product images using Gemini vision
 */
async function describeImages(product, { callGemini, fetchImageAsBase64, isValidImageUrl }) {
  let imageUrls = [];
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    imageUrls = product.images.map(img => img && img.src).filter(src => src && isValidImageUrl(src));
  } else if (product.image && typeof product.image === 'string' && isValidImageUrl(product.image)) {
    imageUrls = [product.image];
  }

  const validImages = imageUrls.slice(0, 3);
  if (validImages.length === 0) {
    return `Product: ${product.name}. No valid images available for analysis.`;
  }

  try {
    const imageResults = await Promise.all(validImages.map(url => fetchImageAsBase64(url)));
    const validBase64Images = imageResults.filter(r => r !== null);
    if (validBase64Images.length === 0) {
      return `Product: ${product.name}. Failed to fetch images for analysis.`;
    }

    const result = await callGemini({
      contents: [{
        role: "user",
        parts: [
          { text: `You are an AI data specialist for e-commerce semantic search.\nCreate a keyword-rich, factual, and objective description in English, optimized for embeddings.\nAnalyze the provided text and images to extract key attributes like design, shape, colors, materials, and unique features.\n\nProduct Name: ${product.name}\n\nProvide ONLY the optimized product description as a plain text response.` },
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

/**
 * Translate text to English using Gemini
 */
async function translateToEnglish(text, callGemini) {
  if (!text || typeof text !== 'string' || text.trim() === '') return text;

  try {
    const result = await callGemini({
      contents: [{
        role: "user",
        parts: [{
          text: `Translate the following text to English and enhance it for e-commerce search.
Rules:
1. Preserve ALL information from the original text - do not shorten or summarize
2. Make it keyword-rich and factual
3. Keep all details, specifications, and features
4. If already in English, still enhance it for better searchability
5. Only return the translated/enhanced text, no additional commentary

Text to translate and enhance:
${text}`
        }]
      }],
      thinkingBudget: 1024
    });
    return result?.trim() || text;
  } catch (error) {
    console.warn("Translation failed:", error);
    return text;
  }
}

/**
 * Incremental classification - only adds new soft categories to existing ones
 */
async function classifyIncremental(text, name, newSoftCategories, existingSoftCategories, variants, imageForContext, callGemini) {
  const newArr = Array.isArray(newSoftCategories) ? newSoftCategories : [];
  const existArr = Array.isArray(existingSoftCategories) ? existingSoftCategories : [];
  const softCategoryList = newArr.join(", ");

  let variantInfo = '';
  if (variants && variants.length > 0) {
    const variantDetails = variants.map(v => {
      const details = [];
      if (v.title) details.push(`Title: ${v.title}`);
      if (v.size) details.push(`Size: ${v.size}`);
      if (v.color) details.push(`Color: ${v.color}`);
      if (v.options && v.options.length > 0) {
        details.push(`Options: ${v.options.map(opt => `${opt.name}: ${opt.value}`).join(', ')}`);
      }
      return details.join(', ');
    }).join('\n');
    variantInfo = `\n\nProduct Variants (${variants.length} total):\n${variantDetails}`;
  }

  const promptText = `You are an AI e-commerce assistant. Your task is to identify which of the NEW soft categories apply to this product.
Follow these rules:
1. ONLY consider these NEW soft categories: [${softCategoryList}]
2. Return ONLY the soft categories from the NEW list that match this product
3. If NONE of the new soft categories match, return an empty array
4. The product already has these soft categories: [${existArr.join(', ')}] - you will ADD to these, not replace them
5. Use the product image and variant information (colors, sizes, options) to enhance your classification accuracy
6. Do NOT invent new categories - only use categories from the NEW list provided
7. Return a JSON array of matching soft categories

Product Name: ${name}
Description:
${text}${variantInfo}

Return ONLY a JSON object like: {"softCategory": ["Category1", "Category2"]} or {"softCategory": []} if none match`;

  const messageParts = [{ text: promptText }];
  if (imageForContext) {
    messageParts.push({ inlineData: { mimeType: imageForContext.mimeType, data: imageForContext.data } });
  }

  try {
    const result = await callGemini({
      contents: [{ role: "user", parts: messageParts }],
      responseMimeType: "application/json",
      thinkingBudget: 0
    });

    if (!result) return { softCategory: existArr };

    const out = JSON.parse(result);
    let newMatched = [];
    if (out.softCategory && Array.isArray(out.softCategory)) {
      newMatched = out.softCategory.filter(s => newArr.includes(s));
    }
    return { softCategory: [...new Set([...existArr, ...newMatched])] };
  } catch (error) {
    console.warn(`Incremental classification failed for ${name}:`, error);
    return { softCategory: existArr };
  }
}

/**
 * Incremental classification for hard categories - only adds new categories to existing ones
 */
async function classifyIncrementalHardCategories(text, name, newHardCategories, existingHardCategories, variants, imageForContext, callGemini) {
  const newArr = Array.isArray(newHardCategories) ? newHardCategories : [];
  const existArr = Array.isArray(existingHardCategories) ? existingHardCategories : [];
  const hardCategoryList = newArr.join(", ");

  let variantInfo = '';
  if (variants && variants.length > 0) {
    const variantDetails = variants.map(v => {
      const details = [];
      if (v.title) details.push(`Title: ${v.title}`);
      if (v.size) details.push(`Size: ${v.size}`);
      if (v.color) details.push(`Color: ${v.color}`);
      if (v.options && v.options.length > 0) {
        details.push(`Options: ${v.options.map(opt => `${opt.name}: ${opt.value}`).join(', ')}`);
      }
      return details.join(', ');
    }).join('\n');
    variantInfo = `\n\nProduct Variants (${variants.length} total):\n${variantDetails}`;
  }

  const promptText = `You are an AI e-commerce assistant. Your task is to identify which of the NEW hard categories apply to this product.
Follow these rules:
1. ONLY consider these NEW hard categories: [${hardCategoryList}]
2. Return ONLY the hard categories from the NEW list that match this product
3. If NONE of the new hard categories match, return an empty array
4. The product already has these hard categories: [${existArr.join(', ')}] - you will ADD to these, not replace them
5. Use the product image and variant information (colors, sizes, options) to enhance your classification accuracy
6. Do NOT invent new categories - only use categories from the NEW list provided
7. Return a JSON array of matching hard categories

Product Name: ${name}
Description:
${text}${variantInfo}

Return ONLY a JSON object like: {"category": ["Category1", "Category2"]} or {"category": []} if none match`;

  const messageParts = [{ text: promptText }];
  if (imageForContext) {
    messageParts.push({ inlineData: { mimeType: imageForContext.mimeType, data: imageForContext.data } });
  }

  try {
    const result = await callGemini({
      contents: [{ role: "user", parts: messageParts }],
      responseMimeType: "application/json",
      thinkingBudget: 0
    });

    if (!result) return { category: existArr };

    const out = JSON.parse(result);
    let newMatched = [];
    if (out.category && Array.isArray(out.category)) {
      newMatched = out.category.filter(c => newArr.includes(c));
    }
    return { category: [...new Set([...existArr, ...newMatched])] };
  } catch (error) {
    console.warn(`Incremental hard category classification failed for ${name}:`, error);
    return { category: existArr };
  }
}

/**
 * Full classification function
 */
async function classify(text, name, categories, types, softCategories, colors, variants, imageForContext, callGemini) {
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
  const colorsArray = Array.isArray(colors) ? colors : [];

  const categoryList = categoriesArray.join(", ");
  const typeList = typesArray.join(", ");
  const softCategoryList = softCategoriesArray.join(", ");
  const colorList = colorsArray.join(", ");

  let variantInfo = '';
  if (variants && variants.length > 0) {
    const variantDetails = variants.map(v => {
      const details = [];
      if (v.title) details.push(`Title: ${v.title}`);
      if (v.size) details.push(`Size: ${v.size}`);
      if (v.color) details.push(`Color: ${v.color}`);
      if (v.options && v.options.length > 0) {
        details.push(`Options: ${v.options.map(opt => `${opt.name}: ${opt.value}`).join(', ')}`);
      }
      return details.join(', ');
    }).join('\n');
    variantInfo = `\n\nProduct Variants (${variants.length} total):\n${variantDetails}`;
  }

  const colorsRule = colorsArray.length > 0
    ? `\n5. Colors MUST be an array from: [${colorList}]. Select ONLY the primary or dominant colors of the product based on images, description, and variants. Ignore minor accents, small details, or tiny stripes (e.g., if a shirt is white with a small blue logo, select ONLY "White"). If no clear dominant match, return an empty array.`
    : '';
  const colorsExample = colorsArray.length > 0 ? ', "colors": ["MainColor"]' : '';

  const promptText = `You are an AI e-commerce assistant. Classify the product based on its description, image, and variant information.
Follow these rules:
1. Category MUST be an array from this EXACT list: [${categoryList}]. If no match, return an empty array.
2. Type MUST be an array from: [${typeList}]. If no match, return an empty array.
3. Soft Category MUST be an array from: [${softCategoryList}]. If no match, return an empty array.
4. Use the product image and variant information (colors, sizes, options) to enhance your classification accuracy.${colorsRule}
6. Do NOT invent new values - only use values from the provided lists.
7. Focus on identifying the DOMINANT visual characteristics. Avoid selecting a color if it only appears as a minor accent.

Product Name: ${name}
Description:
${text}${variantInfo}

Return ONLY a JSON object like: {"category": ["The Category"], "type": ["The Type"], "softCategory": ["The Soft Category"]${colorsExample}}`;

  const messageParts = [{ text: promptText }];
  if (imageForContext) {
    messageParts.push({ inlineData: { mimeType: imageForContext.mimeType, data: imageForContext.data } });
  }

  try {
    const result = await callGemini({
      contents: [{ role: "user", parts: messageParts }],
      responseMimeType: "application/json",
      thinkingBudget: 0
    });

    if (!result) return { category: [], type: [], softCategory: [], colors: [] };

    let out;
    try {
      out = JSON.parse(result);
    } catch {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) out = JSON.parse(jsonMatch[0]);
      else return { category: [], type: [], softCategory: [], colors: [] };
    }

    // Validate against allowed values
    if (out.category && Array.isArray(out.category)) {
      out.category = out.category.filter(c => categoriesArray.includes(c));
    } else { out.category = []; }
    if (out.type && Array.isArray(out.type)) {
      out.type = out.type.filter(t => typesArray.includes(t));
    } else { out.type = []; }
    if (out.softCategory && Array.isArray(out.softCategory)) {
      out.softCategory = out.softCategory.filter(s => softCategoriesArray.includes(s));
    } else { out.softCategory = []; }
    if (out.colors && Array.isArray(out.colors)) {
      out.colors = out.colors.filter(c => colorsArray.includes(c));
    } else { out.colors = []; }

    return out;
  } catch (error) {
    console.warn(`Classification failed for ${name}: `, error);
    return { category: [], type: [], softCategory: [], colors: [] };
  }
}

/**
 * Find products with no embeddings that need reprocessing
 */
async function findProductsWithoutEmbeddings(dbName, limit = 100) {
  const client = new MongoClient(MONGO_URI, {
    connectTimeoutMS: 60000, serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000, maxPoolSize: 10, retryWrites: true, retryReads: true
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("products");

    const query = {
      $or: [
        { embedding: { $exists: false } },
        { embedding: null },
        { embedding: { $size: 0 } }
      ]
    };

    const productsWithoutEmbeddings = await collection.find(query).limit(limit).toArray();
    const totalCount = await collection.countDocuments(query);

    return { products: productsWithoutEmbeddings, totalCount };
  } finally {
    await client.close();
  }
}

/**
 * Main reprocessing function
 */
async function reprocessProducts({
  dbName,
  categories,
  userTypes,
  softCategories,
  colors,
  targetCategory = null,
  missingSoftCategoryOnly = false,
  onlyUnprocessed = false,
  incrementalMode = false,
  incrementalSoftCategories = [],
  incrementalHardCategories = [],
  options: initialOptions = {}
}) {
  // Load shared modules once
  const shared = await getSharedModules();
  const { embed: embedFn, callGemini: callGeminiFn, summarizeMetadata: summarizeMetadataFn,
    fetchImageAsBase64: fetchImageFn, closeBrowser: closeBrowserFn, parsePrice: parsePriceFn } = shared;

  const isRunningFromCli = require.main === module;

  console.log("🔍 REPROCESS FUNCTION CALLED WITH:");
  console.log("  - dbName:", dbName);
  console.log("  - missingSoftCategoryOnly:", missingSoftCategoryOnly);
  console.log("  - onlyUnprocessed:", onlyUnprocessed);
  console.log("  - incrementalMode:", incrementalMode);
  console.log("  - incrementalSoftCategories:", incrementalSoftCategories);
  console.log("  - incrementalHardCategories:", incrementalHardCategories);

  let options = { ...initialOptions };
  let cliDbName = dbName;

  if (isRunningFromCli) {
    const args = process.argv.slice(2);
    cliDbName = args[0];
    if (!cliDbName) {
      console.error('❌ Error: Database name is required when running from CLI.');
      console.log('Usage: node reprocess-products.js <dbName> [options]');
      process.exit(1);
    }
    const parsedArgs = parseCliArgs(args.slice(1));
    options = { ...options, ...parsedArgs.options };
    targetCategory = parsedArgs.targetCategory || targetCategory;
    missingSoftCategoryOnly = parsedArgs.missingSoftCategoryOnly || missingSoftCategoryOnly;
    onlyUnprocessed = parsedArgs.onlyUnprocessed || onlyUnprocessed;
  }

  if (!cliDbName) {
    console.error('❌ Error: dbName is required.');
    return;
  }

  // If reprocessAll is true, enable all options
  if (options.reprocessAll) {
    options = {
      ...options,
      reprocessHardCategories: true,
      reprocessSoftCategories: true,
      reprocessTypes: true,
      reprocessColors: true,
      reprocessVariants: true,
      reprocessEmbeddings: true,
      reprocessDescriptions: true,
      translateBeforeEmbedding: true
    };
  }

  const logs = [];
  const lockFilePath = getLockFilePath(cliDbName);
  const safeSoftCategories = Array.isArray(softCategories) ? softCategories : [];
  const safeColors = Array.isArray(colors) ? colors : [];

  let statusCol;
  const log = async (message) => {
    logs.push(message);
    console.log(message);
    if (statusCol) {
      try {
        await statusCol.updateOne({ dbName: cliDbName }, { $push: { logs: message } }, { upsert: true });
      } catch (err) {
        console.error("Failed to write log to DB:", err);
      }
    }
  };

  try {
    await fs.mkdir(LOCK_DIR, { recursive: true });
    await fs.writeFile(lockFilePath, String(process.pid), { flag: 'w' });
  } catch (error) {
    logs.push(`❌ Could not create lock file: ${error.message} `);
    return logs;
  }

  await log(`🚀 Starting reprocessing for database: ${cliDbName} `);
  await log(`🔍 Categories: ${categories?.join(', ') || 'None'} `);
  await log(`🏷️ User types: ${userTypes?.join(', ') || 'None'} `);
  await log(`🎨 Soft categories: ${safeSoftCategories.join(', ') || 'None'} `);
  await log(`🎨 Colors: ${safeColors.join(', ') || 'None'} `);

  if (targetCategory) {
    await log(`🎯 Target category filter: "${targetCategory}"`);
  }
  if (missingSoftCategoryOnly) {
    await log(`🎨 Special mode: Only targeting products with MISSING softCategory`);
  }

  await log(`\n📋 Reprocessing Options: `);
  await log(`${options.reprocessHardCategories ? '✅' : '❌'} Hard Categories`);
  await log(`${options.reprocessSoftCategories ? '✅' : '❌'} Soft Categories`);
  await log(`${options.reprocessTypes ? '✅' : '❌'} Product Types`);
  await log(`${options.reprocessColors ? '✅' : '❌'} Colors`);
  await log(`${options.reprocessVariants ? '✅' : '❌'} Variants`);
  await log(`${options.reprocessEmbeddings ? '✅' : '❌'} Embeddings`);
  await log(`${options.reprocessDescriptions ? '✅' : '❌'} Descriptions`);
  await log(`${options.translateBeforeEmbedding ? '✅' : '❌'} Translation`);

  const client = new MongoClient(MONGO_URI, {
    connectTimeoutMS: 60000, serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000, maxPoolSize: 10, retryWrites: true, retryReads: true
  });

  let runStartedAt = new Date();
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      await log(`🔄 Attempting MongoDB connection(attempt ${retryCount + 1}/${maxRetries})`);
      await client.connect();
      await log("✅ Connected to MongoDB");
      break;
    } catch (err) {
      retryCount++;
      await log(`❌ MongoDB connection failed(attempt ${retryCount} / ${maxRetries}): ${err.message} `);
      if (retryCount >= maxRetries) {
        await fs.unlink(lockFilePath).catch(() => { });
        return logs;
      }
      const waitTime = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Fetch user data if running from CLI
  if (isRunningFromCli) {
    try {
      const user = await client.db('users').collection('users').findOne({ dbName: cliDbName });
      if (user) {
        categories = user.categories || [];
        userTypes = user.types || [];
        softCategories = user.softCategories || [];
        console.log(`👤 Fetched settings for user: ${cliDbName} `);
      }
    } catch (err) {
      console.error('❌ Error fetching user settings:', err);
    }
  }

  // Check sync mode
  let isImageSyncMode = false;
  try {
    const userDoc = await client.db("users").collection("users").findOne({ dbName: cliDbName });
    if (userDoc && userDoc.syncMode === "image") {
      isImageSyncMode = true;
      await log("🖼️ Image sync mode detected");
    } else {
      await log("📝 Text sync mode detected");
    }
  } catch (err) {
    await log(`⚠️ Could not determine sync mode: ${err.message} `);
  }

  // Mark reprocess start
  try {
    await client.db("users").collection("users").updateOne(
      { dbName: cliDbName }, { $set: { reprocessStartedAt: runStartedAt } }, { upsert: false }
    );
  } catch (userErr) {
    await log(`⚠️ Could not update user reprocess start: ${userErr.message} `);
  }

  const db = client.db(cliDbName);
  const collection = db.collection("products");
  statusCol = db.collection("sync_status");

  await statusCol.updateOne(
    { dbName: cliDbName },
    { $set: { dbName: cliDbName, state: "reprocessing", progress: 0, done: 0, startedAt: runStartedAt, logs: [] } },
    { upsert: true }
  );

  // Ensure every product has a stamp
  try {
    const initFromFetched = await collection.updateMany(
      { categoryTypeProcessedAt: { $exists: false }, fetchedAt: { $exists: true } },
      [{ $set: { categoryTypeProcessedAt: "$fetchedAt" } }]
    );
    await log(`🧭 Initialized stamp from fetchedAt for ${initFromFetched.modifiedCount} products`);
  } catch (e) {
    await log(`⚠️ Pipeline update not supported: ${e.message} `);
  }

  const initToNow = await collection.updateMany(
    { categoryTypeProcessedAt: { $exists: false } },
    { $set: { categoryTypeProcessedAt: new Date() } }
  );
  await log(`🕒 Initialized missing stamp for ${initToNow.modifiedCount} products`);

  // Build query conditions
  let classificationConditions = null;

  if (incrementalMode) {
    classificationConditions = {
      $and: [
        { embedding: { $exists: true, $ne: null } },
        { category: { $exists: true, $ne: null, $ne: [] } },
        { $or: [{ softCategory: { $exists: true, $ne: null } }, { softCategory: { $eq: [] } }] }
      ]
    };
    await log("➕ INCREMENTAL MODE: Will add new categories to already-processed products");
    if (incrementalSoftCategories.length > 0) {
      await log(`➕ New soft categories to add: ${incrementalSoftCategories.join(', ')} `);
    }
    if (incrementalHardCategories.length > 0) {
      await log(`➕ New hard categories to add: ${incrementalHardCategories.join(', ')} `);
    }
  } else if (onlyUnprocessed) {
    classificationConditions = {
      $and: [
        { $or: [{ embedding: { $exists: false } }, { embedding: null }, { embedding: { $size: 0 } }] },
        { $or: [{ category: { $exists: false } }, { category: { $eq: null } }, { category: { $eq: [] } }] },
        { $or: [{ type: { $exists: false } }, { type: { $eq: null } }, { type: { $eq: [] } }] },
        { $or: [{ softCategory: { $exists: false } }, { softCategory: { $eq: null } }, { softCategory: { $eq: [] } }] }
      ]
    };
    await log("🆕 Targeting FRESH UNPROCESSED products");
  } else if (missingSoftCategoryOnly) {
    classificationConditions = {
      $and: [
        { category: { $exists: true } },
        { $or: [{ softCategory: { $exists: false } }, { softCategory: { $eq: null } }, { softCategory: { $eq: [] } }, { softCategory: { $size: 0 } }] }
      ]
    };
    await log("🎨 Targeting products with categories but MISSING softCategory");
  } else if (!isImageSyncMode) {
    classificationConditions = {
      $or: [
        { category: { $exists: false } }, { category: { $eq: [] } }, { category: { $eq: null } },
        { type: { $exists: false } }, { type: { $eq: [] } }, { type: { $eq: null } },
        { softCategory: { $exists: false } }, { softCategory: { $eq: [] } }, { softCategory: { $eq: null } }
      ]
    };
    await log("📝 Text mode: Processing products missing categories/types/softCategories");
  }

  // Build query
  const inStockFilter = { $or: [{ stockStatus: "instock" }, { stock_status: "instock" }] };
  let baseQuery;

  if (onlyUnprocessed) {
    baseQuery = { $and: [inStockFilter] };
  } else if (options.reprocessEmbeddings) {
    baseQuery = {
      $and: [inStockFilter, {
        $or: [
          { embedding: { $exists: true, $ne: null } },
          { description1: { $exists: true, $ne: "" }, $or: [{ embedding: { $exists: false } }, { embedding: null }, { embedding: { $size: 0 } }] }
        ]
      }]
    };
  } else {
    baseQuery = { $and: [inStockFilter, { embedding: { $exists: true, $ne: null } }] };
  }

  let finalQuery;
  if (classificationConditions) {
    if (baseQuery.$and) {
      if (classificationConditions.$and) {
        finalQuery = { $and: [...baseQuery.$and, ...classificationConditions.$and] };
      } else {
        finalQuery = { $and: [...baseQuery.$and, classificationConditions] };
      }
    } else {
      finalQuery = { $and: [baseQuery, classificationConditions] };
    }
  } else {
    finalQuery = baseQuery;
  }

  if (targetCategory) {
    finalQuery = { ...finalQuery, category: { $in: [targetCategory] } };
  }

  await log(`🔍 Final MongoDB query: ${JSON.stringify(finalQuery, null, 2)} `);

  const totalInStock = await collection.countDocuments(inStockFilter);
  await log(`📊 Total in -stock products: ${totalInStock} `);

  const finalQueryCount = await collection.countDocuments(finalQuery);
  await log(`📊 Products matching query: ${finalQueryCount} `);

  const productsToProcess = await collection.find(finalQuery).toArray();
  const totalToProcess = productsToProcess.length;

  await statusCol.updateOne(
    { dbName: cliDbName },
    { $set: { state: totalToProcess > 0 ? "reprocessing" : "idle", total: totalToProcess } }
  );

  await log(`🔄 Processing ${totalToProcess} products`);
  if (totalToProcess === 0) {
    await log("✅ Nothing to do.");
  }

  let done = 0;
  for (const product of productsToProcess) {
    // Check lock file
    try { await fs.access(lockFilePath); } catch {
      await log("🛑 Reprocessing stopped by user.");
      await statusCol.updateOne({ dbName: cliDbName }, { $set: { state: "idle", stoppedAt: new Date() } });
      break;
    }

    try {
      await log(`\n🟡 Processing: ${product.name} (ID: ${product.id})`);
      const { name, categories: productCategories, metadata, images, image } = product;
      const originalDescription = getProductDescription(product);

      if (!originalDescription || originalDescription.trim() === "") {
        await log("⚠️ Skipping - no original description");
        await collection.updateOne({ _id: product._id }, { $set: { categoryTypeProcessedAt: new Date() } });
      } else {
        const updateData = {
          categoryTypeProcessedAt: new Date(),
          url: product.url || product.permalink || product.link || null,
          image: product.image || (product.images && product.images.length > 0 ? product.images[0].src : null)
        };

        // Price conversion
        if (product.price) updateData.price = parsePriceFn(product.price, false);
        if (product.regular_price) updateData.regular_price = parsePriceFn(product.regular_price, false);
        if (product.sale_price) updateData.sale_price = parsePriceFn(product.sale_price, false);

        // Process variants
        let variantData = { variants: [], sizes: [], colors: [] };
        if (options.reprocessVariants) {
          variantData = processProductVariants(product, (val) => parsePriceFn(val, false));
          updateData.variants = variantData.variants;
          updateData.sizes = variantData.sizes;
          updateData.colors = variantData.colors;
        }

        // Create enriched description
        let enrichedDescription = product.description || originalDescription;

        if (options.reprocessDescriptions) {
          const hasPluralImages = images && Array.isArray(images) && images.length > 0;
          const hasSingularImage = image && typeof image === 'string';

          if (isImageSyncMode && (hasPluralImages || hasSingularImage)) {
            const imageDescription = await describeImages(product, shared);
            let metadataAppend = '';
            if (metadata && Array.isArray(metadata)) {
              metadataAppend = await summarizeMetadataFn(metadata);
            }
            if (product.productType) metadataAppend += `\nProduct Type: ${product.productType} `;
            if (product.vendor) metadataAppend += `\nVendor: ${product.vendor} `;
            if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
              metadataAppend += `\nTags: ${product.tags.join(', ')} `;
            }

            let categoryAppend = '';
            if (productCategories && Array.isArray(productCategories)) {
              categoryAppend = productCategories.filter(cat => cat.name).map(cat => cat.name).join('\n');
            }
            enrichedDescription = `${imageDescription} \n\n${metadataAppend} \n\n${categoryAppend} `.trim();
          } else {
            let metadataAppend = '';
            if (metadata && Array.isArray(metadata)) {
              metadataAppend = await summarizeMetadataFn(metadata);
            }
            if (product.productType) metadataAppend += `\nProduct Type: ${product.productType} `;
            if (product.vendor) metadataAppend += `\nVendor: ${product.vendor} `;
            if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
              metadataAppend += `\nTags: ${product.tags.join(', ')} `;
            }
            let categoryAppend = '';
            if (productCategories && Array.isArray(productCategories)) {
              categoryAppend = productCategories.map(c => c.name).join(' ');
            }
            enrichedDescription = `${originalDescription} \n\n${metadataAppend} \n\n${categoryAppend} `.trim();
          }
          updateData.description1 = enrichedDescription;
        }

        // Translate if enabled
        if (options.translateBeforeEmbedding && options.reprocessDescriptions) {
          try {
            const translated = await translateToEnglish(enrichedDescription, callGeminiFn);
            if (translated && translated !== enrichedDescription) {
              enrichedDescription = translated;
              updateData.description1 = enrichedDescription;
            }
          } catch (translationError) {
            await log(`❌ Translation error: ${translationError.message} `);
          }
        }

        // Generate embedding
        if (options.reprocessEmbeddings) {
          try {
            const embeddingVector = await embedFn(enrichedDescription);
            if (embeddingVector) {
              updateData.embedding = embeddingVector;
              await log(`✅ Generated embedding for ${name}`);
            }
          } catch (embeddingError) {
            await log(`❌ Embedding error: ${embeddingError.message} `);
          }
        }

        // Initialize with existing data
        let gptCategory = product.category || [];
        let productType = product.type || [];
        let softCategory = product.softCategory || [];
        let productColors = product.colors || [];

        // Handle incremental mode
        if (incrementalMode) {
          await log(`➕ Incremental classification for: ${name} `);

          let classificationContext = originalDescription;
          let contextMetadata = '';
          if (metadata && Array.isArray(metadata)) {
            const metadataSummary = await summarizeMetadataFn(metadata);
            if (metadataSummary) contextMetadata += `\n${metadataSummary} `;
          }
          if (product.productType) contextMetadata += `\nProduct Type: ${product.productType} `;
          if (product.vendor) contextMetadata += `\nVendor: ${product.vendor} `;
          if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
            contextMetadata += `\nTags: ${product.tags.join(', ')} `;
          }
          if (productCategories && Array.isArray(productCategories)) {
            const categoryNames = productCategories.map(c => c.name).filter(Boolean).join(', ');
            if (categoryNames) contextMetadata += `\nProduct Categories: ${categoryNames} `;
          }
          classificationContext = `${originalDescription}${contextMetadata} `.trim();

          let imageForContext = null;
          if (isImageSyncMode) {
            let imageUrl = null;
            if (images && Array.isArray(images) && images.length > 0 && images[0].src) imageUrl = images[0].src;
            else if (image && typeof image === 'string') imageUrl = image;
            if (imageUrl) imageForContext = await fetchImageFn(imageUrl);
          }

          // Incremental soft categories
          if (incrementalSoftCategories && incrementalSoftCategories.length > 0) {
            const incrementalResult = await classifyIncremental(
              classificationContext, name, incrementalSoftCategories,
              softCategory, variantData.variants, imageForContext, callGeminiFn
            );
            updateData.softCategory = incrementalResult.softCategory;
            softCategory = incrementalResult.softCategory;
            await log(`➕ Soft result: ${softCategory.join(', ') || 'None'} `);
          }

          // Incremental hard categories
          if (incrementalHardCategories && incrementalHardCategories.length > 0) {
            const incrementalHardResult = await classifyIncrementalHardCategories(
              classificationContext, name, incrementalHardCategories,
              gptCategory, variantData.variants, imageForContext, callGeminiFn
            );
            updateData.category = incrementalHardResult.category;
            gptCategory = incrementalHardResult.category;
            await log(`➕ Hard result: ${gptCategory.join(', ') || 'None'} `);
          }
        }
        // Regular classification
        else if (options.reprocessHardCategories || options.reprocessSoftCategories || options.reprocessTypes || options.reprocessColors) {
          let classificationContext = originalDescription;
          let contextMetadata = '';
          if (metadata && Array.isArray(metadata)) {
            const metadataSummary = await summarizeMetadataFn(metadata);
            if (metadataSummary) contextMetadata += `\n${metadataSummary} `;
          }
          if (product.productType) contextMetadata += `\nProduct Type: ${product.productType} `;
          if (product.vendor) contextMetadata += `\nVendor: ${product.vendor} `;
          if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
            contextMetadata += `\nTags: ${product.tags.join(', ')} `;
          }
          if (productCategories && Array.isArray(productCategories)) {
            const categoryNames = productCategories.map(c => c.name).filter(Boolean).join(', ');
            if (categoryNames) contextMetadata += `\nProduct Categories: ${categoryNames} `;
          }
          classificationContext = `${originalDescription}${contextMetadata} `.trim();

          let imageForContext = null;
          if (isImageSyncMode) {
            let imageUrl = null;
            if (images && Array.isArray(images) && images.length > 0 && images[0].src) imageUrl = images[0].src;
            else if (image && typeof image === 'string') imageUrl = image;
            if (imageUrl) imageForContext = await fetchImageFn(imageUrl);
          }

          const classificationResult = await classify(
            classificationContext, name, categories, userTypes, safeSoftCategories, safeColors,
            variantData.variants, imageForContext, callGeminiFn
          );

          if (options.reprocessHardCategories) {
            updateData.category = classificationResult.category;
            gptCategory = classificationResult.category;
          }
          if (options.reprocessTypes) {
            updateData.type = classificationResult.type || [];
            productType = classificationResult.type;
          }
          if (options.reprocessSoftCategories) {
            updateData.softCategory = classificationResult.softCategory || [];
            softCategory = classificationResult.softCategory;
          }
          if (options.reprocessColors) {
            updateData.colors = classificationResult.colors || [];
            productColors = classificationResult.colors || [];
          }
        }

        await collection.updateOne({ _id: product._id }, { $set: updateData });
        await log(`✅ Classified ${name} - Category: ${(gptCategory || []).join(', ') || 'None'}, Type: ${(productType || []).join(', ') || 'None'}, Soft: ${(softCategory || []).join(', ') || 'None'}, Colors: ${(productColors || []).join(', ') || 'None'} `);
      }

      done += 1;
      const progress = totalToProcess > 0 ? Math.round((done / totalToProcess) * 100) : 100;
      await statusCol.updateOne({ dbName: cliDbName }, { $set: { done, progress } });
    } catch (error) {
      await log(`❌ Error processing product ${product.id}: ${error.message} `);
    }
  }

  // Mark finished
  try {
    await client.db("users").collection("users").updateOne(
      { dbName: cliDbName },
      { $set: { lastReprocessAt: new Date(), reprocessFinishedAt: new Date() } },
      { upsert: false }
    );
  } catch (userErr) {
    await log(`⚠️ Could not update user reprocess finish: ${userErr.message} `);
  }

  await statusCol.updateOne(
    { dbName: cliDbName },
    { $set: { state: "done", finishedAt: new Date(), done, progress: 100 } }
  );

  await log("📦 Reprocess summary: processed=" + (productsToProcess?.length || 0));
  await client.close();

  // Close shared browser
  await closeBrowserFn();

  try { await fs.unlink(lockFilePath); } catch { }
  await log("✅ Done");
  return logs;
}

function parseCliArgs(args) {
  const options = {
    reprocessHardCategories: true,
    reprocessSoftCategories: true,
    reprocessTypes: true,
    reprocessVariants: true,
    reprocessEmbeddings: true,
    reprocessDescriptions: true,
    translateBeforeEmbedding: true,
    reprocessAll: false,
  };
  let targetCategory = null;
  let missingSoftCategoryOnly = false;
  let onlyUnprocessed = false;

  args.forEach(arg => {
    if (arg.startsWith('--target-category=')) {
      targetCategory = arg.split('=')[1];
    } else if (arg === '--missing-soft-category-only') {
      missingSoftCategoryOnly = true;
    } else if (arg === '--only-unprocessed') {
      onlyUnprocessed = true;
    } else if (arg === '--skip-enrichment') {
      options.reprocessDescriptions = false;
    } else if (arg === '--skip-embedding') {
      options.reprocessEmbeddings = false;
    } else if (arg === '--skip-translation') {
      options.translateBeforeEmbedding = false;
    } else if (arg === '--force' || arg === '--reprocess-all') {
      options.reprocessAll = true;
    }
  });

  return { options, targetCategory, missingSoftCategoryOnly, onlyUnprocessed };
}

// CLI entry point
if (require.main === module) {
  reprocessProducts({}).catch(err => {
    console.error("❌ Unhandled error:", err);
    process.exit(1);
  });
}

// Export functions (CommonJS for CLI compatibility)
const moduleExports = reprocessProducts;
moduleExports.reprocessProducts = reprocessProducts;
moduleExports.findProductsWithoutEmbeddings = findProductsWithoutEmbeddings;

module.exports = moduleExports;
