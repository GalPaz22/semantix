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
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const ai = GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== "YOUR_GOOGLE_AI_KEY" 
  ? new GoogleGenAI({apiKey: GOOGLE_AI_API_KEY})
  : null;

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
    // Check if Gemini AI is available
    if (!ai) {
      console.warn("Google AI client not initialized - translation not available");
      return description; // Return original description if Gemini not available
    }

    const messages = [
      {
        role: "user",
        parts: [{
          text: `Translate the following text to English:\n\n${description}`
        }]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: messages,
      generationConfig: {
        responseMimeType: "text/plain",
        thinkingBudget:0
      },
    });

    // Handle response structure
    let result;
    if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        result = candidate.content.parts[0].text;
      }
    } else if (response.response && response.response.candidates && Array.isArray(response.response.candidates) && response.response.candidates.length > 0) {
      const candidate = response.response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        result = candidate.content.parts[0].text;
      }
    }
    
    const translated = result?.trim();
    
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
    // Check if Gemini AI is available
    if (!ai) {
      console.warn("Google AI client not initialized - metadata summarization not available");
      return ''; // Return empty string if Gemini not available
    }

    const metadataString = JSON.stringify(metadata);
    const messages = [
      {
        role: 'user',
        parts: [{
          text: `Given the following product metadata in JSON format, iterate over each key-value pair and output a summary string that only includes the important details for product embedding. 
Metadata: ${metadataString}
Only include details that are relevant for product description embedding. Please provide only the values of the keys, not the keys themselves.`
        }]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: messages,
    });

    // Handle response structure
    let result;
    if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        result = candidate.content.parts[0].text;
      }
    } else if (response.response && response.response.candidates && Array.isArray(response.response.candidates) && response.response.candidates.length > 0) {
      const candidate = response.response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        result = candidate.content.parts[0].text;
      }
    }

    return result?.trim() || '';
  } catch (error) {
    console.warn('Gemini metadata summarization failed:', error.message);
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
 * Parse and validate Gemini API result
 * @param {string} result - The raw text result from Gemini
 * @returns {Object} Parsed classification result
 */
async function parseGeminiResult(result) {
  if (!result) {
    throw new Error("Empty response text from Gemini API");
  }

  console.log("🔍 Raw Gemini result:", result);

  // Extract JSON from markdown code blocks if present
  let jsonString = result.trim();
  
  // Check if the result is wrapped in markdown code blocks
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
    console.log("✅ Extracted JSON from code blocks:", jsonString);
  }

  // Also handle cases where there might be extra text before/after the JSON
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonString = jsonMatch[0];
    console.log("✅ Extracted JSON object:", jsonString);
  }

  try {
    const parsedResult = JSON.parse(jsonString);
    
    // Validate the parsed result has the expected structure
    if (typeof parsedResult !== 'object' || parsedResult === null) {
      throw new Error("Invalid JSON structure - expected object");
    }

    console.log("✅ Parsed Gemini result:", parsedResult);

    // Ensure we have the required fields with defaults
    return {
      category: parsedResult.category || null,
      type: Array.isArray(parsedResult.type) ? parsedResult.type : []
    };
  } catch (jsonError) {
    throw new Error(`Failed to parse Gemini response as JSON: ${jsonError.message}. Cleaned response: ${jsonString}`);
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
    // Check if Gemini AI is available
    if (!ai) {
      throw new Error("Google AI client not initialized - API key may be missing");
    }

    // Ensure userCategories and userTypes are arrays
    const categoriesArray = Array.isArray(userCategories) ? userCategories : [];
    const typesArray = Array.isArray(userTypes) ? userTypes : [];
    
    const categoryList = categoriesArray.join(", ");
    const typeList = typesArray.join(", ");

    const messages = [
      {
        role: "user",
        parts: [{
          text: `You are an advanced AI model specialized in e-commerce. Your task is to classify a product based on the details provided.
You MUST follow these rules strictly:
1.  Choose a category or an array of categories for the product from this EXACT list: [${categoryList}].
2.  If and only if NO category from the list is a suitable match, you MUST return null for the "category" field.
3.  Do NOT invent, create, or suggest a new category.
4.  Choose a type or an array of types for the product from this EXACT list: [${typeList}].
5.  If and only if NO type from the list is a suitable match, you MUST return an empty array for the "type" field.
6.  Do NOT invent, create, or suggest a new type.

Product Details:
${enrichedText}

Product Name: ${productName}

Return ONLY a JSON object with two keys: "category" and "type". For example:
{"category": "יין אדום", "type": ["כשר"]}`
        }]
      }
    ];

    console.log("🔍 Making Gemini API call for product:", productName);
    console.log("🔍 Categories count:", categoriesArray.length);
    console.log("🔍 Types count:", typesArray.length);

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API call timed out after 30 seconds")), 30000);
    });

    const apiCallPromise = ai.models.generateContent({
      model: "gemini-2.5-flash-lite", // Updated to Gemini 2.5 Flash Lite
      contents: messages,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const response = await Promise.race([apiCallPromise, timeoutPromise]);

    console.log("✅ Gemini API response received");
    console.log("🔍 Response structure:", JSON.stringify(response, null, 2));
    console.log("🔍 Response type:", typeof response);
    console.log("🔍 Response keys:", response ? Object.keys(response) : 'response is null/undefined');

    // Validate response structure before accessing
    if (!response) {
      throw new Error("Gemini API returned null/undefined response");
    }

    // Check if response has candidates directly (newer API structure)
    if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const result = candidate.content.parts[0].text;
        if (result) {
          console.log("✅ Using direct candidates structure");
          return await parseGeminiResult(result);
        }
      }
    }

    // Check legacy response structure (response.response.candidates)
    if (response.response && response.response.candidates && Array.isArray(response.response.candidates) && response.response.candidates.length > 0) {
      const candidate = response.response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const result = candidate.content.parts[0].text;
        if (result) {
          console.log("✅ Using legacy response.response structure");
          return await parseGeminiResult(result);
        }
      }
    }

    throw new Error("Invalid response structure from Gemini API - no valid candidates found");

  } catch (error) {
    console.error("❌ Gemini classification failed:", error.message);
    console.error("❌ Full error details:", error);
    
    // Log additional context for debugging
    console.error("❌ Context - Product:", productName);
    console.error("❌ Context - Categories available:", Array.isArray(userCategories) ? userCategories.length : 'not array');
    console.error("❌ Context - Types available:", Array.isArray(userTypes) ? userTypes.length : 'not array');
    
    // Fallback to GPT if Gemini fails
    return await classifyCategoryUsingGeminiSimple(enrichedText, productName, userCategories);
  }
}

/** Fallback Gemini classification with simplified prompt */
async function classifyCategoryUsingGeminiSimple(translatedDescription, productName, userCategories) {
  try {
    // Check if Gemini AI is available
    if (!ai) {
      console.warn("Google AI client not initialized - no fallback available");
      return { category: null, type: [] };
    }

    const categoryList = userCategories.join(", ");
    
    const messages = [
      {
        role: "user",
        parts: [{
          text: `Based on the following description, determine which category it belongs to.
You MUST choose a category from this EXACT list: [${categoryList}].
Answer ONLY with the category name.
If none of the categories from the list fit, you MUST return the exact word "None". Do not add any other text.

Description: ${translatedDescription}
Product name: ${productName}`
        }]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: messages,
      generationConfig: {
        responseMimeType: "text/plain",
        thinkingBudget:0
      },
    });

    // Handle response structure
    let result;
    if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        result = candidate.content.parts[0].text;
      }
    } else if (response.response && response.response.candidates && Array.isArray(response.response.candidates) && response.response.candidates.length > 0) {
      const candidate = response.response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        result = candidate.content.parts[0].text;
      }
    }
    
    let category = result?.trim() || "";
    // Final check to ensure the returned category is in the allowed list
    if (!userCategories.includes(category) && category !== "None") {
        category = "None"; // Force to None if the model hallucinates a category
    }
    return { category: category === "None" ? null : category, type: [] }; // Types are not handled by this fallback
  } catch (error) {
    console.warn("❌ Gemini fallback classification failed:", error.message);
    return { category: null, type: [] };
  }
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
async function processWooProducts({ wooUrl, wooKey, wooSecret, userEmail, categories, type: userTypes, dbName }) {
  const logs = [];
  logs.push(`🚀 Starting enhanced WooCommerce processing for: ${userEmail}`);
  logs.push(`📦 Using database: ${dbName}`);

  // Validate and ensure userTypes is an array
  const validUserTypes = Array.isArray(userTypes) ? userTypes : [];
  logs.push(`🏷️ User types: ${validUserTypes.length > 0 ? validUserTypes.join(', ') : 'none'}`);

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
      const classificationResult = await classifyCategoryAndTypeWithGemini(enrichedTranslation, name, categories, validUserTypes);
      const gptCategory = classificationResult.category;
      let productType = classificationResult.type || [];

      // 6) Add local category detection, respecting user's allowed types
      const localTypes = updateLocalCategoryTypes(productCategories, description, validUserTypes);
      productType = [...new Set([...productType, ...localTypes])];

      // 7) Add sale type if product is on sale and "מבצע" is an allowed type
      if (onSale && validUserTypes.includes('מבצע') && !productType.includes('מבצע')) {
        productType.push('מבצע');
      }

      logs.push(`✅ Classification: ${gptCategory || 'None'}, Types: ${productType.join(', ') || 'None'}`);

      // Debug: Log the final type assignment
      console.log("🔍 [WooCommerce Processing] Product:", name);
      console.log("🔍 [WooCommerce Processing] Final category:", gptCategory);
      console.log("🔍 [WooCommerce Processing] Final types:", productType);
      console.log("🔍 [WooCommerce Processing] Available user types:", validUserTypes);

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

module.exports = {
  processWooProducts,
  summarizeMetadata,
  classifyCategoryAndTypeWithGemini
};