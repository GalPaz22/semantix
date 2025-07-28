const { MongoClient } = require("mongodb");
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const { OpenAI } = require("openai");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { parse } = require("node-html-parser");
const { GoogleGenAI, Type } = require('@google/genai');

const MONGO_URI = process.env.MONGODB_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
  apiKey: OPENAI_API_KEY,
});

// Initialize Google AI if you have the API key
const ai = new GoogleGenAI({apiKey: process.env.GOOGLE_AI_API_KEY || "YOUR_GOOGLE_AI_KEY"});

/** Convert HTML to plain text */
function parseHtmlToPlainText(html) {
  if (!html) return "";
  
  const root = parse(html);
  let text = root.textContent || root.innerHTML || "";
  
  // Fallback: manual HTML tag removal
  if (!text) {
    text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  console.log("🔍 HTML input length:", html?.length || 0);
  console.log("🔍 Extracted text length:", text?.length || 0);
  
  return text;
}

/** Translate description using OpenAI */
async function translateDescription(description) {
  console.log("🌐 Translation input length:", description?.length || 0);
  
  if (!description || description.trim() === "") {
    console.log("❌ No description provided to translate");
    return null;
  }

  try {
    const translationResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Translate the following text to English:\n\n${description}`,
        },
      ],
    });
    
    const translated = translationResponse.choices?.[0]?.message?.content?.trim();
    
    console.log("🌐 Translation result length:", translated?.length || 0);
    
    if (!translated || translated === "") {
      console.warn("⚠️ Empty translation result");
      return null;
    }
    
    return translated;
  } catch (error) {
    console.error("❌ Translation failed:", error.message);
    return null;
  }
}

/**
 * Use GPT to iterate over product metadata and return a summary
 * of important details for embedding.
 */
async function summarizeMetadata(metadata) {
  if (!metadata || !Array.isArray(metadata)) return '';
  
  try {
    const metadataString = JSON.stringify(metadata);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: [
        {
          role: 'user',
          content: `Given the following product metadata in JSON format, iterate over each key-value pair and output a summary string that only includes the important details for product embedding. 
Metadata: ${metadataString}
Only include details that are relevant for product description embedding. Please provide only the values of the keys, not the keys themselves.`,
        },
      ],
    });
    return response.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.warn('Metadata summarization failed:', error.message);
    return '';
  }
}

/** Generate embeddings using OpenAIEmbeddings */
async function generateEmbeddings(translatedText) {
  if (!translatedText) return null;
  try {
    const result = await embeddings.embedQuery(translatedText);
    return result;
  } catch (error) {
    console.warn("❌ Embedding generation failed:", error.message);
    return null;
  }
}

/**
 * Use Google Gemini to determine product category and type based on enriched text.
 * @param {string} enrichedText - The product text for classification.
 * @param {string} productName - The name of the product.
 * @param {string[]} userCategories - The list of allowed categories.
 * @param {string[]} userTypes - The list of allowed types.
 */
async function classifyCategoryAndTypeWithGemini(enrichedText, productName, userCategories, userTypes) {
  try {
    const categoryList = userCategories.join(", ");
    const typeList = userTypes.join(", ");

    const messages = [
      {
        role: "user",
        parts: [{
          text: `You are an advanced AI model specialized in e-commerce. Your task is to classify a product based on the details provided.
You MUST follow these rules strictly:
1.  Choose a category or an array of categories for the product from this EXACT list: [${categoryList}].
2.  If and only if NO category from the list is a suitable match, you MUST return null for the "category" field.
3.  Do NOT invent, create, or suggest a new category.
4.  For the "type" field, you may select zero or more types that apply to the product from this EXACT list: [${typeList}].
5.  If no types apply, return an empty array for "type".

Product Details:
${enrichedText}

Product Name: ${productName}

Return ONLY a JSON object with two keys: "category" and "type". For example:
{"category": "יין אדום", "type": ["כשר"]}`
        }]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest", // Using a newer, potentially more compliant model
      contents: messages,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // Gemini 1.5 returns a structured object directly
    const result = response.response.candidates[0].content.parts[0].text;
    return JSON.parse(result);

  } catch (error) {
    console.error("❌ Gemini classification failed:", error.message);
    // Fallback to GPT if Gemini fails
    return await classifyCategoryUsingGPT(enrichedText, productName, userCategories);
  }
}

/** Fallback GPT classification */
async function classifyCategoryUsingGPT(translatedDescription, productName, userCategories) {
  try {
    const categoryList = userCategories.join(", ");
    
    const prompt = `Based on the following description, determine which category it belongs to.
You MUST choose a category from this EXACT list: [${categoryList}].
Answer ONLY with the category name.
If none of the categories from the list fit, you MUST return the exact word "None". Do not add any other text.

Description: ${translatedDescription}
Product name: ${productName}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });
    
    let category = response.choices?.[0]?.message?.content?.trim() || "";
    // Final check to ensure the returned category is in the allowed list
    if (!userCategories.includes(category) && category !== "None") {
        category = "None"; // Force to None if the model hallucinates a category
    }
    return { category: category === "None" ? null : category, type: [] }; // Types are not handled by this fallback
  } catch (error) {
    console.warn("❌ GPT classification failed:", error.message);
    return { category: null, type: [] };
  }
}

/** Local category detection */
function updateLocalCategoryTypes(categories, description, userTypes) {
  if (!Array.isArray(categories)) return [];
  
  const typeMarkers = [];
  
  for (const cat of categories) {
    if (!cat?.name) continue;
    const name = cat.name;
    
    // Skip if explicitly "לא כשר" or "Not Kosher"
    const isNotKosher = /לא\s*כשר|Not\s*Kosher/.test(name);
    
    if (!isNotKosher && /\bכשר\b|\bKosher\b/.test(name) && userTypes.includes("כשר")) {
      typeMarkers.push("כשר");
    }
    
    // If the name contains "2 יינות ב" or "3 יינות ב" (or English variants)
    if (/2 יינות ב|3 יינות ב|2 Wines B|3 Wines B/.test(name) && userTypes.includes("מבצע")) {
      typeMarkers.push("מבצע");
    }
  }
  
  // Check description for "כשר" but not "לא כשר"
  if (description && /\bכשר\b/.test(description) && !/לא\s*כשר/.test(description) && userTypes.includes("כשר")) {
    typeMarkers.push("כשר");
  }
  
  return [...new Set(typeMarkers)];
}

/** 
 * Fetch and process WooCommerce products with enrichment.
 */
async function processWooProducts({ wooUrl, wooKey, wooSecret, userEmail, categories, type: userTypes, dbName }) {
  const logs = [];
  logs.push(`🚀 Starting enhanced WooCommerce processing for: ${userEmail}`);
  logs.push(`📦 Using database: ${dbName}`);

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    logs.push("✅ Connected to MongoDB");
  } catch (err) {
    logs.push(`❌ MongoDB connection failed: ${err.message}`);
    return logs;
  }
  
  const db = client.db(dbName);
  const collection = db.collection("products");

  const api = new WooCommerceRestApi({
    url: wooUrl,
    consumerKey: wooKey,
    consumerSecret: wooSecret,
    version: "wc/v3",
  });

  // Step 1: Fetch all products with pagination
  let allProducts = [];
  let page = 1;
  let hasMorePages = true;

  try {
    while (hasMorePages) {
      const response = await api.get("products", { 
        per_page: 100, 
        page: page,
        status: 'publish',
        stock_status: 'instock'
      });
      
      const products = response.data || [];
      if (products.length === 0) break;
      
      allProducts = allProducts.concat(products);
      logs.push(`📄 Fetched page ${page}: ${products.length} products`);
      
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
      hasMorePages = page < totalPages;
      page++;
    }
  } catch (err) {
    const errorMsg = `❌ Failed to fetch products from WooCommerce: ${err.message}`;
    logs.push(errorMsg);
    await client.close();
    return logs;
  }

  logs.push(`🔍 Total products fetched: ${allProducts.length}`);

  // Step 2: First pass - store basic product data
  const bulkOps = [];
  for (const product of allProducts) {
    const plainDescription = parseHtmlToPlainText(
      product.description || product.short_description || ""
    );

    bulkOps.push({
      updateOne: {
        filter: { id: product.id },
        update: {
          $set: {
            name: product.name,
            price: Number(product.sale_price || product.regular_price || product.price),
            stockStatus: product.stock_status === "onbackorder" ? "instock" : product.stock_status,
            onSale: product.on_sale === true,
            fetchedAt: new Date(),
            dateModified: product.date_modified,
            description: plainDescription,
            image: product.images?.[0]?.src || null,
            url: product.permalink,
            categories: product.categories || [],
            metadata: product.meta_data || [],
            notInStore: false,
          },
        },
        upsert: true,
      },
    });
  }

  if (bulkOps.length > 0) {
    await collection.bulkWrite(bulkOps, { ordered: false });
    logs.push(`💾 Bulk saved ${bulkOps.length} products to database`);
  }

  // Step 3: Process products for translation, enrichment, and embeddings
  const productsToProcess = await collection.find({
    $or: [
      { embedding: { $exists: false } },
      { category: { $exists: false } },
      { description1: { $exists: false } }
    ],
    $and: [{ stockStatus: "instock" }]
  }).toArray();

  logs.push(`🔄 Processing ${productsToProcess.length} products for enrichment`);

  for (const product of productsToProcess) {
    try {
      logs.push(`\n🟡 Processing: ${product.name} (ID: ${product.id})`);
      
      const { _id, name, description, categories: productCategories, metadata, onSale } = product;
      
      if (!description || description.trim() === "") {
        logs.push("⚠️ Skipping - no description");
        continue;
      }

      // 1) Translate description to English
      const translatedDescription = await translateDescription(description);
      if (!translatedDescription) {
        logs.push("⚠️ Skipping - translation failed");
        continue;
      }
      logs.push("✅ Translation completed");

      // 2) Summarize metadata
      let metadataAppend = '';
      if (metadata && Array.isArray(metadata)) {
        const summarization = await summarizeMetadata(metadata);
        metadataAppend = summarization;
      }

      // 3) Extract category names
      let categoryAppend = '';
      if (productCategories && Array.isArray(productCategories)) {
        categoryAppend = productCategories
          .filter(cat => cat.name)
          .map(cat => cat.name)
          .join('\n');
      }

      // 4) Create enriched translation
      const enrichedTranslation = `${translatedDescription}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();
      logs.push("✅ Enrichment completed");

      // 5) Use Gemini/GPT to classify category and type strictly
      const classificationResult = await classifyCategoryAndTypeWithGemini(enrichedTranslation, name, categories, userTypes);
      const gptCategory = classificationResult.category;
      let productType = classificationResult.type || [];

      // 6) Add local category detection, respecting user's allowed types
      const localTypes = updateLocalCategoryTypes(productCategories, description, userTypes);
      productType = [...new Set([...productType, ...localTypes])];

      // 7) Add sale type if product is on sale and "מבצע" is an allowed type
      if (onSale && userTypes.includes('מבצע') && !productType.includes('מבצע')) {
        productType.push('מבצע');
      }

      logs.push(`✅ Classification: ${gptCategory || 'None'}, Types: ${productType.join(', ') || 'None'}`);

      // 8) Generate embeddings
      const embedding = await generateEmbeddings(enrichedTranslation);
      if (!embedding) {
        logs.push("⚠️ Warning - embedding generation failed");
      } else {
        logs.push("✅ Embedding generated");
      }

      // 9) Update the document
      const updateDoc = {
        embedding: embedding,
        description1: enrichedTranslation,
        type: productType,
        category: gptCategory,
        categoriesFromUser: categories,
      };

      await collection.updateOne({ _id }, { $set: updateDoc });
      logs.push(`💾 Updated product: ${name}`);

    } catch (error) {
      const errMsg = `❌ Error processing ${product.name}: ${error.message}`;
      logs.push(errMsg);
      console.error("Full error:", error);
    }
  }

  await client.close();
  logs.push(`✅ Enhanced WooCommerce processing complete for: ${userEmail}`);
  logs.push(`📊 Total processed: ${allProducts.length} products`);
  return logs;
}

module.exports = processWooProducts;