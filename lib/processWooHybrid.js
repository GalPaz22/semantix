const { MongoClient } = require("mongodb");
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const { OpenAI } = require("openai");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { parse } = require("node-html-parser");
const { GoogleGenAI } = require('@google/genai');

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
  if (!text) {
    text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return text;
}

/** Fetch image as base64 for Gemini */
async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { data: base64, mimeType: contentType };
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

/** Generate visual description from images */
async function describeImages(product) {
  if (!ai) return "";
  const validImages = (product.images || [])
    .filter(img => isValidImageUrl(img.src))
    .slice(0, 3);
  if (validImages.length === 0) return "";

  try {
    const imagePromises = validImages.map(img => fetchImageAsBase64(img.src));
    const imageResults = await Promise.all(imagePromises);
    const validBase64Images = imageResults.filter(result => result !== null);
    if (validBase64Images.length === 0) return "";

    const messages = [
      {
        role: "user",
        parts: [
          { text: `Analyze the images for the product "${product.name}". 
Provide a detailed visual description focusing on unique characteristics, design patterns, material textures, and precise color shades. 
This description will be used for vector search, so be as descriptive as possible about the product's visual identity.` },
          ...validBase64Images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages,
    });

    let result;
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.candidates[0].content.parts[0].text;
    } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.response.candidates[0].content.parts[0].text;
    }
    return result?.trim() || "";
  } catch (error) {
    console.warn("Gemini image description failed:", error);
    return "";
  }
}

/** Translate and Enrich text to English using Gemini */
async function translateAndEnrich(text) {
  if (!text || !ai) return text;
  try {
    const messages = [{
      role: "user",
      parts: [{ text: `Translate the following product information to English and enrich it into a cohesive, descriptive paragraph. 
Emphasize the product's unique characteristics, visual details, and qualitative attributes. 
The goal is to create a rich text that captures both the literal description and the "vibe" or style of the product for high-quality vector embedding.
Return ONLY the enriched English text:\n\n${text}` }]
    }];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages,
    });
    let result;
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.candidates[0].content.parts[0].text;
    } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.response.candidates[0].content.parts[0].text;
    }
    return result?.trim() || text;
  } catch (error) {
    console.warn("Translation/Enrichment failed:", error);
    return text;
  }
}

/** Summarize metadata using Gemini */
async function summarizeMetadata(metadata) {
  if (!metadata || !Array.isArray(metadata) || !ai) return '';
  try {
    const metadataString = JSON.stringify(metadata);
    const messages = [{
      role: 'user',
      parts: [{ text: `Summarize the following product metadata. Only include details relevant for search and characteristics. Return ONLY the values:\n\n${metadataString}` }]
    }];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages,
    });
    let result;
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.candidates[0].content.parts[0].text;
    } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.response.candidates[0].content.parts[0].text;
    }
    return result?.trim() || '';
  } catch (error) {
    return '';
  }
}

/** Generate embeddings */
async function generateEmbeddings(text) {
  if (!text) return null;
  try {
    return await embeddings.embedQuery(text);
  } catch (error) {
    console.warn("Embedding failed:", error);
    return null;
  }
}

/** Parse Gemini classification result */
async function parseGeminiResult(result) {
  if (!result) return { category: [], type: [], softCategory: [] };
  let jsonString = result.trim();
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) jsonString = codeBlockMatch[1].trim();
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonString = jsonMatch[0];
  try {
    const parsed = JSON.parse(jsonString);
    return {
      category: Array.isArray(parsed.category) ? parsed.category : (parsed.category ? [parsed.category] : []),
      type: Array.isArray(parsed.type) ? parsed.type : (parsed.type ? [parsed.type] : []),
      softCategory: Array.isArray(parsed.softCategory) ? parsed.softCategory : (parsed.softCategory ? [parsed.softCategory] : [])
    };
  } catch (e) {
    return { category: [], type: [], softCategory: [] };
  }
}

/** Classify category and type */
async function classifyProduct(enrichedText, productName, categories, types, softCategories, variants = []) {
  if (!ai) return { category: [], type: [], softCategory: [] };
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    
    let resultText;
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        resultText = response.candidates[0].content.parts[0].text;
    } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        resultText = response.response.candidates[0].content.parts[0].text;
    }
    return await parseGeminiResult(resultText);
  } catch (error) {
    return { category: [], type: [], softCategory: [] };
  }
}

/** Helper function to parse prices */
function parsePrice(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') return 0;
  if (typeof priceValue === 'number') return isNaN(priceValue) ? 0 : priceValue;
  let cleanPrice = String(priceValue).replace(/[$₪€£¥,\s]/g, '').replace(/[^\d.-]/g, '');
  const numericPrice = parseFloat(cleanPrice);
  return isNaN(numericPrice) || numericPrice < 0 ? 0 : numericPrice;
}

/** Process WooCommerce variants */
function processWooCommerceVariants(product) {
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
    }));
    const allAttributes = variants.flatMap(v => v.attributes || []);
    const sizes = [...new Set(allAttributes.filter(attr => attr.name?.toLowerCase().includes('size')).map(attr => attr.option))].filter(Boolean);
    const colors = [...new Set(allAttributes.filter(attr => attr.name?.toLowerCase().includes('color') || attr.name?.toLowerCase().includes('colour')).map(attr => attr.option))].filter(Boolean);
    return { variants, sizes, colors };
  }
  return { variants: [], sizes: [], colors: [] };
}

/** Main Hybrid Processing Function */
async function processWooHybrid({ wooUrl, wooKey, wooSecret, userEmail, categories, userTypes, softCategories, dbName }) {
  const logs = [];
  let statusCol;
  const addLog = async (message) => {
    logs.push(message);
    console.log(message);
    if (statusCol) {
      try {
        await statusCol.updateOne({ dbName }, { $push: { logs: message } }, { upsert: true });
      } catch (err) {}
    }
  };

  await addLog(`🚀 Starting Hybrid Processing for: ${userEmail}`);
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

    const inStockProducts = allProducts.filter(p => p.stock_status === 'instock' || p.stock_status === 'onbackorder');
    await addLog(`🏪 Found ${inStockProducts.length} in-stock products to process.`);

    for (let i = 0; i < inStockProducts.length; i++) {
      const product = inStockProducts[i];
      try {
        await addLog(`\n🟡 Hybrid Processing: ${product.name} (${i+1}/${inStockProducts.length})`);
        
        // 1. Clean description
        const cleanedDescription = parseHtmlToPlainText(product.description);
        
        // 2. Visual description
        const visualDescription = await describeImages(product);
        
        // 3. Metadata summary
        const metadataSummary = await summarizeMetadata(product.meta_data);
        
        // 4. Categories
        const categoriesText = (product.categories || []).map(c => c.name).join(', ');

        // 5. Combine and Translate
        // We emphasize description and characteristics by putting them first and providing both original and visual
        const combinedRaw = `Product: ${product.name}\nDescription: ${cleanedDescription}\nVisual Characteristics: ${visualDescription}\nTechnical Details: ${metadataSummary}\nCategories: ${categoriesText}`;
        
        const enrichedDescription = await translateAndEnrich(combinedRaw);
        await addLog(`✅ Enriched description created (Hybrid)`);

        // 6. Classification
        const variantData = processWooCommerceVariants(product);
        const classification = await classifyProduct(enrichedDescription, product.name, categories, userTypes, softCategories, variantData.variants);
        await addLog(`✅ Classified: ${classification.category.join(', ')}`);

        // 7. Embeddings
        const embedding = await generateEmbeddings(enrichedDescription);
        
        // 8. Update DB
        const updateDoc = {
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          description1: enrichedDescription,
          embedding: embedding,
          category: classification.category,
          type: classification.type,
          softCategory: classification.softCategory,
          price: parsePrice(product.price),
          regular_price: parsePrice(product.regular_price),
          sale_price: parsePrice(product.sale_price),
          image: product.images?.[0]?.src || null,
          url: product.permalink,
          stockStatus: 'instock',
          onSale: product.on_sale,
          variants: variantData.variants,
          sizes: variantData.sizes,
          colors: variantData.colors,
          processedAt: new Date()
        };

        await collection.updateOne({ id: product.id }, { $set: updateDoc }, { upsert: true });
        
        // Update progress
        await statusCol.updateOne({ dbName }, { $set: { progress: Math.round(((i + 1) / inStockProducts.length) * 100) } });

      } catch (error) {
        await addLog(`❌ Error processing ${product.name}: ${error.message}`);
      }
    }

    await statusCol.updateOne({ dbName }, { $set: { state: "done", finishedAt: new Date(), progress: 100 } });
    await addLog(`✅ Hybrid Processing Complete!`);
    
  } catch (error) {
    await addLog(`❌ Global Error: ${error.message}`);
  } finally {
    await client.close();
  }
  return logs;
}

module.exports = { processWooHybrid };

