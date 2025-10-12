// lib/processWooImages.js
import { MongoClient }          from "mongodb";
import WooCommerceRestApi       from "@woocommerce/woocommerce-rest-api";
import pLimit                   from "p-limit";
import { OpenAI }               from "openai";
import { OpenAIEmbeddings }     from "@langchain/openai";
import { parse }                from "node-html-parser";
import { GoogleGenAI }          from '@google/genai';
import { appendLogs }           from './syncStatus-esm.js';

const {
  MONGODB_URI        : MONGO_URI,
  OPENAI_API_KEY     : OPENAI_API_KEY,
  GOOGLE_AI_API_KEY,
  // tweak at will ↓
  IMG_CONCURRENCY    = "3"     // how many products to process in parallel
} = process.env;

/* ---------- OpenAI helpers --------------------------------------- */
const openai     = new OpenAI({ apiKey: OPENAI_API_KEY });
const embeddings = new OpenAIEmbeddings({
  model : "text-embedding-3-large",
  apiKey: OPENAI_API_KEY
});

// Initialize Google AI if you have the API key
const ai = GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== "YOUR_GOOGLE_AI_KEY" 
  ? new GoogleGenAI({apiKey: GOOGLE_AI_API_KEY})
  : null;

function isValidImageUrl (url){
  if (typeof url !== "string") return false;
  try { new URL(url); } catch { return false; }
  return /\.(jpe?g|png|gif|webp)$/i.test(url);
}

// Helper function to properly parse prices from strings to numbers
function parsePrice(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') {
    return 0;
  }
  
  // Handle numeric values that are already numbers
  if (typeof priceValue === 'number') {
    return isNaN(priceValue) ? 0 : priceValue;
  }
  
  // Convert to string and clean
  let cleanPrice = String(priceValue);
  
  // Remove common currency symbols and non-numeric characters except decimal point and minus
  cleanPrice = cleanPrice.replace(/[$₪€£¥,\s]/g, ''); // Remove common currencies and spaces
  cleanPrice = cleanPrice.replace(/[^\d.-]/g, ''); // Remove everything except digits, decimal point, and minus
  
  // Handle empty string after cleaning
  if (cleanPrice === '' || cleanPrice === '-' || cleanPrice === '.') {
    return 0;
  }
  
  const numericPrice = parseFloat(cleanPrice);
  const result = isNaN(numericPrice) ? 0 : numericPrice;
  
  // Additional validation for reasonable price ranges
  if (result < 0) {
    console.warn(`⚠️ Negative price detected: ${priceValue} -> ${result}, setting to 0`);
    return 0;
  }
  
  return result;
}

function composeImageMessages(product){
  return (product.images||[])
    .filter(img => isValidImageUrl(img.src))
    .map(img => ({ type:"image_url", image_url:{ url: img.src } }));
}

async function describeImages(product){
  // Check if Gemini AI is available
  if (!ai) {
    console.warn("Google AI client not initialized - falling back to basic description");
    return `Product: ${product.name}. Description not available due to missing AI configuration.`;
  }

  const validImages = (product.images || [])
    .filter(img => isValidImageUrl(img.src))
    .slice(0, 3); // Limit to first 3 images for performance

  if (validImages.length === 0) {
    return `Product: ${product.name}. No valid images available for analysis.`;
  }

  try {
    // Fetch and convert images to base64
    const imageDataPromises = validImages.map(async (img) => {
      try {
        const response = await fetch(img.src);
        if (!response.ok) {
          console.warn(`Failed to fetch image: ${img.src}`);
          return null;
        }
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        // Determine mime type from URL or response
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        return {
          inlineData: {
            mimeType: contentType,
            data: base64
          }
        };
      } catch (err) {
        console.warn(`Error fetching image ${img.src}:`, err.message);
        return null;
      }
    });

    const imageDataList = (await Promise.all(imageDataPromises)).filter(Boolean);

    if (imageDataList.length === 0) {
      return `Product: ${product.name}. Failed to load images for analysis.`;
    }

    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `Describe the main product details visible in the images for "${product.name}". Focus on design, shape, colors and unique attributes. Be concise and factual.`
          },
          ...imageDataList
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    return result?.trim() || `Product: ${product.name}. Image analysis completed but no description generated.`;

  } catch (error) {
    console.warn("Gemini image description failed:", error);
    return `Product: ${product.name}. Image analysis failed: ${error.message}`;
  }
}

async function embed(text){
  try   { return await embeddings.embedQuery(text); }
  catch (e){ console.warn("Embedding failed:",e); return null; }
}

async function summarizeMetadata(metadata) {
  if (!metadata || !Array.isArray(metadata)) return '';
  try {
    if (!ai) {
      console.warn("Google AI client not initialized - metadata summarization not available");
      return '';
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

async function classify(text, name, categories, types) {
  // Ensure categories and types are arrays
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  
  const categoryList = categoriesArray.join(", ");
  const typeList = typesArray.join(", ");

  // Check if Gemini AI is available
  if (!ai) {
    console.warn("Google AI client not initialized - falling back to basic classification");
    return { category: null, type: [] };
  }

  const messages = [
    {
      role: "user",
      parts: [{
        text: `You are an advanced AI model specialized in e-commerce. Your task is to classify a product based on its description and name.
You MUST follow these rules strictly:
1.  Choose a category or an array of categories for the product from this EXACT list: [${categoryList}].
2.  If and only if NO category from the list is a suitable match, you MUST return null for the "category" field.
3.  Do NOT invent, create, or suggest a new category.
4.  For the "type" field, you may select zero or more types that apply to the product from this EXACT list: [${typeList}].
5.  If no types apply, return an empty array for "type".

Product Details:
${text}

Product Name:
${name}

Return ONLY a JSON object with two keys: "category" and "type". For example:
{"category": "יין אדום", "type": ["כשר"]}`
      }]
    }
  ];

  try {
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

    if (!result) {
      throw new Error("No valid response from Gemini");
    }

    // Extract JSON from markdown code blocks if present
    let jsonString = result.trim();
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const out = JSON.parse(jsonString);
    
    // Final validation to prevent hallucinated values
    if (out.category && !categoriesArray.includes(out.category)) {
      out.category = null;
    }
    if (out.type && Array.isArray(out.type)) {
      out.type = out.type.filter(t => typesArray.includes(t));
    } else {
      out.type = [];
    }
    return out;
  } catch (e) {
    console.warn("Gemini classification failed:", e);
    return { category: null, type: [] };
  }
}
/* ----------------------------------------------------------------- */

export default async function processWooImages({ wooUrl, wooKey, wooSecret, dbName, categories, type: userTypes })
{
  const logs = [];
  const log = async (message) => {
    logs.push(message);
    await appendLogs(dbName, [message]);
  };
  
  await log(`🚀 Starting WooCommerce image processing for database: ${dbName}`);
  await log(`🔍 [WooCommerce Images Processing] wooUrl: ${wooUrl}`);
  await log(`🔍 [WooCommerce Images Processing] dbName: ${dbName}`);
  await log(`🔍 [WooCommerce Images Processing] categories: ${categories}`);
  await log(`🔍 [WooCommerce Images Processing] type (userTypes): ${userTypes}`);
  await log(`🔍 [WooCommerce Images Processing] userTypes is array: ${Array.isArray(userTypes)}`);
  await log(`🔍 [WooCommerce Images Processing] userTypes length: ${Array.isArray(userTypes) ? userTypes.length : 'not array'}`);

  // Validate and ensure userTypes is an array
  const validUserTypes = Array.isArray(userTypes) ? userTypes : [];
  await log(`🏷️ User types: ${validUserTypes.length > 0 ? validUserTypes.join(', ') : 'none'}`);

  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const db           = client.db(dbName);
  const productsCol  = db.collection("products");
  const statusCol    = db.collection("sync_status");

  /* mark job “running” -------------------------------------------- */
  await statusCol.updateOne(
    { dbName }, { $set:{ state:"running", startedAt:new Date(), done:0, total:0 } }, { upsert:true }
  );

  /* fetch products ------------------------------------------------- */
  const api       = new WooCommerceRestApi({
    url: wooUrl, consumerKey: wooKey, consumerSecret: wooSecret, version:"wc/v3"
  });
  const { data:products=[] } = await api.get("products",{ per_page:100, _embed: true });
  
  // Fetch variations for variable products
  for (const product of products) {
    if (product.type === 'variable' && product.variations && product.variations.length > 0) {
      try {
        await log(`🔧 Fetching ${product.variations.length} variations for: ${product.name}`);
        const variationsResponse = await api.get(`products/${product.id}/variations`, {
          per_page: 100
        });
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

  await statusCol.updateOne(
    { dbName }, { $set:{ total: products.length } }
  );

  /* process with limited concurrency ------------------------------ */
  const limit = pLimit(Number(IMG_CONCURRENCY));
  let   done  = 0;

  await Promise.all(products.map(prod => limit(async () => {
    const imageDescription = await describeImages(prod);
    
    // Summarize metadata
    let metadataAppend = '';
    if (prod.meta_data && Array.isArray(prod.meta_data)) {
      metadataAppend = await summarizeMetadata(prod.meta_data);
    }

    // Extract category names
    let categoryAppend = '';
    if (prod.categories && Array.isArray(prod.categories)) {
      categoryAppend = prod.categories
        .filter(cat => cat.name)
        .map(cat => cat.name)
        .join('\n');
    }

    // Create enriched description
    const enrichedDescription = `${imageDescription}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();
    
    const embedding = await embed(enrichedDescription);
    const classification = await classify(enrichedDescription, prod.name, categories, validUserTypes);
    const category = classification?.category;
    const types = classification?.type || [];

    await log(`✅ Classification for ${prod.name}: ${category || 'None'}, Types: ${types.join(', ') || 'None'}`);

    const originalPrice = prod.sale_price || prod.regular_price || prod.price;
    const parsedPrice = parsePrice(originalPrice);
    
    await log(`🔍 Price conversion for ${prod.name}: Original "${originalPrice}" -> Parsed ${parsedPrice} (type: ${typeof parsedPrice})`);

    await productsCol.updateOne(
      { id: prod.id },
      {
        $set: {
          name        : prod.name,
          description1: enrichedDescription,
          embedding   : embedding,
          category    : category,
          type        : types,
          price       : parsedPrice,
          image       : prod.images?.[0]?.src ?? null,
          url         : prod.permalink,
          stockStatus : prod.stock_status,
          onSale      : prod.on_sale,
          fetchedAt   : new Date()
        }
      },
      { upsert:true }
    );

    /* progress tick ---------------------------------------------- */
    done += 1;
    await statusCol.updateOne(
      { dbName },
      { $set:{ done } }
    );
  })));

  /* mark job “done” ----------------------------------------------- */
  await statusCol.updateOne(
    { dbName },
    { $set:{ state:"done", finishedAt:new Date(), done:products.length } }
  );

  await client.close();
}
