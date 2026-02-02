const { MongoClient } = require("mongodb");
const { GoogleGenAI } = require('@google/genai');
const { OpenAIEmbeddings } = require("@langchain/openai");
const dotenv = require("dotenv");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const puppeteer = require('puppeteer');

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LOCK_DIR = os.tmpdir();

const getLockFilePath = (dbName) => path.join(LOCK_DIR, `reprocessing_${dbName}.lock`);

// Shared browser instance for image fetching
let sharedBrowser = null;

async function getBrowser() {
  if (!sharedBrowser) {
    console.log("🚀 Launching stealth browser for image fetching...");
    sharedBrowser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
  }
  return sharedBrowser;
}

async function fetchImageWithPuppeteer(imageUrl) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    
    const origin = new URL(imageUrl).origin;
    
    // Set a realistic viewport and User Agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // 🛡️ DEEP STEALTH: Visit the origin first to get cookies and bypass hotlink protection
    console.log(`🕵️ Establishing session with origin: ${origin}`);
    await page.goto(origin, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    
    console.log(`🕵️ Stealth fetching image via Puppeteer: ${imageUrl}`);
    
    // Set Referer to look like it's a request from their own site
    await page.setExtraHTTPHeaders({
      'Referer': origin + '/',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    // Try navigating to the image
    const response = await page.goto(imageUrl, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    if (!response || !response.ok()) {
      console.warn(`⚠️ Direct Puppeteer goto failed (${response ? response.status() : 'no response'}). Trying internal page fetch...`);
      
      // 🔄 FINAL ATTEMPT: Fetch from WITHIN the page context (bypasses most WAFs)
      const base64Data = await page.evaluate(async (url) => {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      }, imageUrl);

      if (base64Data && base64Data.includes('base64,')) {
        const parts = base64Data.split(',');
        const mimeType = parts[0].match(/:(.*?);/)[1];
        const data = parts[1];
        console.log(`✅ Successfully fetched image via INTERNAL page fetch!`);
        return { data, mimeType };
      }
      
      return null;
    }
    
    const buffer = await response.buffer();
    const mimeType = response.headers()['content-type'] || 'image/jpeg';
    const base64 = buffer.toString('base64');
    
    console.log(`✅ Successfully fetched image via Puppeteer: ${imageUrl} (${mimeType})`);
    return { data: base64, mimeType };
  } catch (error) {
    console.warn(`❌ Puppeteer error fetching image ${imageUrl}:`, error.message);
    return null;
  } finally {
    if (page) await page.close();
  }
}

// Initialize Google AI if available
const ai = GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== "YOUR_GOOGLE_AI_KEY" 
  ? new GoogleGenAI({apiKey: GOOGLE_AI_API_KEY})
  : null;

// Initialize OpenAI embeddings if available
const embeddings = OPENAI_API_KEY && OPENAI_API_KEY !== "YOUR_OPENAI_API_KEY" 
  ? new OpenAIEmbeddings({
      model: "text-embedding-3-large",
      apiKey: OPENAI_API_KEY
    })
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

function isValidImageUrl(url) {
  if (typeof url !== "string") return false;
  try { new URL(url); } catch { return false; }
  return /\.(jpe?g|png|gif|webp)$/i.test(url);
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

    const allAttributes = variants.flatMap(v => v.attributes || []);
    const sizes = [...new Set(allAttributes.filter(attr => 
      attr.name?.toLowerCase().includes('size')).map(attr => attr.option))].filter(Boolean);
    const colors = [...new Set(allAttributes.filter(attr => 
      attr.name?.toLowerCase().includes('color') || attr.name?.toLowerCase().includes('colour')).map(attr => attr.option))].filter(Boolean);

    return { variants, sizes, colors };
  }

  return { variants: [], sizes: [], colors: [] };
}

// Helper function to fetch image as base64
async function fetchImageAsBase64(imageUrl) {
  try {
    console.log(`📥 Fetching image: ${imageUrl}`);
    
    // 🛡️ Added browser-like headers to bypass 403 Forbidden errors
    // Many servers block requests from cloud services (like Render/Gemini) if they don't look like a real browser.
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/', // Make it look like it came from Google search
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand)";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });

    if (!response.ok) {
      console.warn(`❌ Failed to fetch image: ${imageUrl}, status: ${response.status}`);
      
      // 🔄 Fallback to Puppeteer for 403 Forbidden errors
      if (response.status === 403) {
        console.log(`🔄 Status 403 detected for ${imageUrl}. Retrying with stealth browser...`);
        return await fetchImageWithPuppeteer(imageUrl);
      }
      
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine MIME type from URL or response
    let mimeType = 'image/jpeg'; // default
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.startsWith('image/')) {
      mimeType = contentType;
    } else {
      // Guess from URL extension
      if (imageUrl.match(/\.(png)$/i)) mimeType = 'image/png';
      else if (imageUrl.match(/\.(gif)$/i)) mimeType = 'image/gif';
      else if (imageUrl.match(/\.(webp)$/i)) mimeType = 'image/webp';
    }
    
    console.log(`✅ Successfully fetched and converted image: ${imageUrl} (${mimeType}, ${Math.round(base64.length / 1024)}KB)`);
    return { data: base64, mimeType };
  } catch (error) {
    console.warn(`❌ Error fetching image ${imageUrl}:`, error.message);
    return null;
  }
}

// Image description function with proper base64 handling
async function describeImages(product) {
  console.log(`🖼️ Starting Gemini image analysis for product: ${product.name}`);
  
  if (!ai) {
    console.warn("❌ Google AI client not initialized - falling back to basic description");
    return `Product: ${product.name}. Description not available due to missing AI configuration.`;
  }

  let imageUrls = [];
  // Case 1: product.images is a valid array of objects with .src
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    console.log(`📷 Found 'images' array with ${product.images.length} items.`);
    imageUrls = product.images
      .map(img => img && img.src) // Extract src
      .filter(src => src && isValidImageUrl(src)); // Filter for valid URLs
  } 
  // Case 2: product.image is a valid string URL
  else if (product.image && typeof product.image === 'string' && isValidImageUrl(product.image)) {
    console.log(`📷 Found 'image' string: ${product.image}`);
    imageUrls = [product.image];
  }

  const validImages = imageUrls.slice(0, 3);

  console.log(`🖼️ Found ${validImages.length} valid images for ${product.name}`);
  if (validImages.length > 0) {
    console.log(`🖼️ Image URLs: ${validImages.map(img => img.src).join(', ')}`);
  }

  if (validImages.length === 0) {
    console.log(`⚠️ No valid images available for analysis for ${product.name}`);
    return `Product: ${product.name}. No valid images available for analysis.`;
  }

  try {
    console.log(`📥 Fetching and converting ${validImages.length} images to base64 for ${product.name}...`);
    
    // Fetch and convert images to base64
    const imagePromises = validImages.map(url => fetchImageAsBase64(url));
    const imageResults = await Promise.all(imagePromises);
    const validBase64Images = imageResults.filter(result => result !== null);

    console.log(`✅ Successfully converted ${validBase64Images.length}/${validImages.length} images to base64 for ${product.name}`);

    if (validBase64Images.length === 0) {
      console.log(`❌ Failed to fetch any images for analysis for ${product.name}`);
      return `Product: ${product.name}. Failed to fetch images for analysis.`;
    }

    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `You are an AI data specialist for e-commerce semantic search.
Create a keyword-rich, factual, and objective description in English, optimized for embeddings.
Analyze the provided text and images to extract key attributes like design, shape, colors, materials, and unique features.

Product Name: ${product.name}

Provide ONLY the optimized product description as a plain text response.`
          },
          ...validBase64Images.map(img => ({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data
            }
          }))
        ]
      }
    ];

    console.log(`🤖 Sending ${validBase64Images.length} images to Gemini for analysis of ${product.name}...`);

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

    const finalResult = result?.trim() || `Product: ${product.name}. Image analysis completed but no description generated.`;
    
    console.log(`✅ Gemini image analysis completed for ${product.name}`);
    console.log(`📝 Generated description (${finalResult.length} chars): ${finalResult.substring(0, 100)}${finalResult.length > 100 ? '...' : ''}`);
    
    return finalResult;

  } catch (error) {
    console.warn(`❌ Gemini image description failed for ${product.name}:`, error);
    return `Product: ${product.name}. Image analysis failed: ${error.message}`;
  }
}

// Simplified embedding function from processWooImages
async function embed(text) {
  try { 
    return await embeddings.embedQuery(text); 
  } catch (e) { 
    console.warn("Embedding failed:", e); 
    return null; 
  }
}

// Translation function to translate Hebrew text to English before embedding
async function translateToEnglish(text) {
  if (!ai) {
    console.warn("Google AI client not initialized - translation not available");
    return text;
  }

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text;
  }

  try {
    const messages = [
      {
        role: "user",
        parts: [{
          text: `Translate the following text to English and enhance it for e-commerce search.
Rules:
1. Preserve ALL information from the original text - do not shorten or summarize
2. Make it keyword-rich and factual
3. Keep all details, specifications, and features
4. Expand abbreviations if needed but keep everything
5. If already in English, still enhance it for better searchability
6. Only return the translated/enhanced text, no additional commentary

Text to translate and enhance:
${text}`
        }]
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

    return result?.trim() || text;

  } catch (error) {
    console.warn("Translation failed:", error);
    return text; // Return original text if translation fails
  }
}

// Simplified metadata summarization from processWooImages
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
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.candidates[0].content.parts[0].text;
    } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      result = response.response.candidates[0].content.parts[0].text;
    }
    return result?.trim() || '';
  } catch (error) {
    console.warn('Gemini metadata summarization failed:', error.message);
    return '';
  }
}

// Incremental classification function - only adds new soft categories to existing ones
async function classifyIncremental(text, name, newSoftCategories, existingSoftCategories = [], variants = [], imageForContext = null) {
  const newSoftCategoriesArray = Array.isArray(newSoftCategories) ? newSoftCategories : [];
  const existingSoftCategoriesArray = Array.isArray(existingSoftCategories) ? existingSoftCategories : [];
  
  const softCategoryList = newSoftCategoriesArray.join(", ");

  if (!ai) {
    console.warn("Google AI client not initialized - falling back to existing categories");
    return { softCategory: existingSoftCategoriesArray };
  }

  // Prepare variant information
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

  const promptText = `You are an AI e-commerce assistant. Your task is to identify which of the NEW soft categories apply to this product.
Follow these rules:
1. ONLY consider these NEW soft categories: [${softCategoryList}]
2. Return ONLY the soft categories from the NEW list that match this product
3. If NONE of the new soft categories match, return an empty array
4. The product already has these soft categories: [${existingSoftCategoriesArray.join(', ')}] - you will ADD to these, not replace them
5. Use the product image and variant information (colors, sizes, options) to enhance your classification accuracy
6. Do NOT invent new categories - only use categories from the NEW list provided
7. Return a JSON array of matching soft categories

Product Name: ${name}
Description:
${text}${variantInfo}

Return ONLY a JSON object like: {"softCategory": ["Category1", "Category2"]} or {"softCategory": []} if none match`;

  const messageParts = [{ text: promptText }];
  if (imageForContext) {
    console.log(`🖼️ Using image in incremental classification for ${name}`);
    messageParts.push({
      inlineData: {
        mimeType: imageForContext.mimeType,
        data: imageForContext.data
      }
    });
  }

  const messages = [
    {
      role: "user",
      parts: messageParts
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

    // Validate against allowed values
    let newMatchedCategories = [];
    if (out.softCategory && Array.isArray(out.softCategory)) {
      newMatchedCategories = out.softCategory.filter(s => newSoftCategoriesArray.includes(s));
    }
    
    // Merge with existing soft categories (avoid duplicates)
    const mergedSoftCategories = [...new Set([...existingSoftCategoriesArray, ...newMatchedCategories])];
    
    return { softCategory: mergedSoftCategories };

  } catch (error) {
    console.warn(`Incremental classification failed for ${name}:`, error);
    return { softCategory: existingSoftCategoriesArray };
  }
}

// Simplified classification function from processWooImages
async function classify(text, name, categories, types, softCategories, variants = [], imageForContext = null) {
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
  
  const categoryList = categoriesArray.join(", ");
  const typeList = typesArray.join(", ");
  const softCategoryList = softCategoriesArray.join(", ");

  if (!ai) {
    console.warn("Google AI client not initialized - falling back to basic classification");
    return { category: [], type: [], softCategory: [] };
  }

  // Prepare variant information
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

  const promptText = `You are an AI e-commerce assistant. Classify the product based on its description, image, and variant information.
Follow these rules:
1. Category MUST be an array of one or more categories from this EXACT list: [${categoryList}].
2. If NO category from the list is a suitable match, you MUST return an empty array for the "category" field.
3. Type MUST be an array from: [${typeList}]. If no match, return an empty array.
4. Soft Category MUST be an array from: [${softCategoryList}]. If no match, return an empty array.
5. If the soft category is a color, analyze the image and ALL available variants to return the dominant colors available!
6. Use the product image and variant information (colors, sizes, options) to enhance your classification accuracy.
7. Always return the *single most dominant* color of the product and the products variants!
8. if you find a soft category called 'חלק' find the products with solid colors, w/o patterns or stripes.
9. Do NOT invent new categories, types, or soft categories.

Product Name: ${name}
Description:
${text}${variantInfo}

Return ONLY a JSON object like: {"category": ["The Category"], "type": ["The Type"], "softCategory": ["The Soft Category"]}`;

  const messageParts = [{ text: promptText }];
  if (imageForContext) {
    console.log(`🖼️ Using image in classification for ${name}`);
    messageParts.push({
      inlineData: {
        mimeType: imageForContext.mimeType,
        data: imageForContext.data
      }
    });
  }

  const messages = [
    {
      role: "user",
      parts: messageParts
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

    // Validate against allowed values
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
    console.warn(`Classification failed for ${name}:`, error);
    return { category: [], type: [], softCategory: [] };
  }
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
 * Find products with no embeddings that need reprocessing
 */
async function findProductsWithoutEmbeddings(dbName, limit = 100) {
  const client = new MongoClient(MONGO_URI, { 
    connectTimeoutMS: 60000,
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true
  });

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db(dbName);
    const collection = db.collection("products");
    
    const query = {
      $or: [
        { embedding: { $exists: false } },
        { embedding: null },
        { embedding: { $size: 0 } },
        { 
          description1: { $exists: true, $ne: "" },
          embedding: { $exists: false }
        }
      ],
      $or: [
        { stockStatus: "instock" },
        { stock_status: "instock" },
        { stockStatus: { $exists: false }, stock_status: { $exists: false } }
      ]
    };
    
    const productsWithoutEmbeddings = await collection.find(query)
      .limit(limit)
      .project({
        _id: 1,
        id: 1,
        name: 1,
        description1: { $ifNull: ["$description1", ""] },
        stockStatus: { $ifNull: ["$stockStatus", "$stock_status"] },
        url: { $ifNull: ["$url", "$permalink"] }
      })
      .toArray();
    
    const totalCount = await collection.countDocuments(query);
    const productsWithEmbeddings = await collection.countDocuments({
      embedding: { $exists: true, $ne: null, $not: { $size: 0 } }
    });
    
    console.log(`📊 Found ${totalCount} total products without embeddings`);
    console.log(`📊 Found ${productsWithEmbeddings} products with embeddings`);
    console.log(`📋 Returning ${productsWithoutEmbeddings.length} products for processing`);
    
    if (productsWithoutEmbeddings.length > 0) {
      console.log(`📋 Example product IDs without embeddings: ${productsWithoutEmbeddings.slice(0, 5).map(p => p.id).join(', ')}`);
    }
    
    return {
      products: productsWithoutEmbeddings,
      totalCount
    };
    
  } catch (error) {
    console.error(`❌ Error finding products without embeddings: ${error.message}`);
    throw error;
  } finally {
    await client.close();
    console.log("✅ Closed MongoDB connection");
  }
}

async function reprocessProducts({ 
  dbName, 
  categories, 
  userTypes, 
  softCategories, 
  targetCategory = null, 
  missingSoftCategoryOnly = false,
  onlyUnprocessed = false,
  incrementalMode = false,
  incrementalSoftCategories = [],
  options: initialOptions = {}
}) {
  const isRunningFromCli = require.main === module;
  
  console.log("🔍 REPROCESS FUNCTION CALLED WITH:");
  console.log("  - dbName:", dbName);
  console.log("  - missingSoftCategoryOnly:", missingSoftCategoryOnly);
  console.log("  - onlyUnprocessed:", onlyUnprocessed);
  console.log("  - targetCategory:", targetCategory);
  console.log("  - incrementalMode:", incrementalMode);
  console.log("  - incrementalSoftCategories:", incrementalSoftCategories);
  
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
      reprocessVariants: true,
      reprocessEmbeddings: true,
      reprocessDescriptions: true,
      translateBeforeEmbedding: true
    };
  }
  const logs = [];
  const lockFilePath = getLockFilePath(cliDbName);
  const safeSoftCategories = Array.isArray(softCategories) ? softCategories : [];
  
  // Helper function to add logs and write to DB
  let statusCol;
  const log = async (message) => {
    logs.push(message);
    console.log(message);
    if (statusCol) {
      try {
        await statusCol.updateOne(
          { dbName: cliDbName },
          { $push: { logs: message } },
          { upsert: true }
        );
      } catch (err) {
        console.error("Failed to write log to DB:", err);
      }
    }
  };

  try {
    await fs.mkdir(LOCK_DIR, { recursive: true });
    await fs.writeFile(lockFilePath, String(process.pid), { flag: 'w' });
    console.log(`Lock file created at: ${lockFilePath}`);
  } catch (error) {
    const errorMsg = `❌ Could not create lock file at ${lockFilePath}: ${error.message}`;
    logs.push(errorMsg);
    console.log(errorMsg);
    return logs;
  }

  await log(`🚀 Starting reprocessing for database: ${cliDbName}`);
  await log(`🔍 Categories: ${categories.join(', ') || 'None'}`);
  await log(`🏷️ User types: ${userTypes.join(', ') || 'None'}`);
  await log(`🎨 Soft categories: ${safeSoftCategories.join(', ') || 'None'}`);
  
  if (targetCategory) {
    await log(`🎯 Target category filter: "${targetCategory}" - will only reprocess products with this category`);
  } else {
    await log(`🌐 Processing all products (no category filter)`);
  }
  if (missingSoftCategoryOnly) {
    await log(`🎨 Special mode: Only targeting products with MISSING softCategory field (not empty arrays)`);
  }
  
  // Log what we're reprocessing
  await log(`\n📋 Reprocessing Options:`);
  await log(`${options.reprocessHardCategories ? '✅' : '❌'} Hard Categories (${options.reprocessHardCategories ? 'WILL' : 'will NOT'} be reprocessed)`);
  await log(`${options.reprocessSoftCategories ? '✅' : '❌'} Soft Categories (${options.reprocessSoftCategories ? 'WILL' : 'will NOT'} be reprocessed)`);
  await log(`${options.reprocessTypes ? '✅' : '❌'} Product Types (${options.reprocessTypes ? 'WILL' : 'will NOT'} be reprocessed)`);
  await log(`${options.reprocessVariants ? '✅' : '❌'} Variants (${options.reprocessVariants ? 'WILL' : 'will NOT'} be reprocessed)`);
  await log(`${options.reprocessEmbeddings ? '✅' : '❌'} Embeddings (${options.reprocessEmbeddings ? 'WILL' : 'will NOT'} be regenerated)`);
  await log(`${options.reprocessDescriptions ? '✅' : '❌'} Descriptions (${options.reprocessDescriptions ? 'WILL' : 'will NOT'} be retranslated/enriched)`);
  await log(`${options.translateBeforeEmbedding ? '✅' : '❌'} Translation (${options.translateBeforeEmbedding ? 'WILL' : 'will NOT'} translate to English before embedding)`);
  
  if (options.reprocessAll) {
    await log(`🔄 FULL REPROCESSING: All components will be updated`);
  }

  const client = new MongoClient(MONGO_URI, { 
    connectTimeoutMS: 60000,
    serverSelectionTimeoutMS: 60000,
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
      await log(`🔄 Attempting MongoDB connection (attempt ${retryCount + 1}/${maxRetries})`);
      await client.connect();
      await log("✅ Connected to MongoDB");
      break;
    } catch (err) {
      retryCount++;
      await log(`❌ MongoDB connection failed (attempt ${retryCount}/${maxRetries}): ${err.message}`);
      
      if (retryCount >= maxRetries) {
        await log(`❌ Failed to connect to MongoDB after ${maxRetries} attempts`);
        await fs.unlink(lockFilePath);
        return logs;
      }
      
      const waitTime = Math.pow(2, retryCount) * 1000;
      await log(`⏳ Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Fetch user data if running from CLI
  if (isRunningFromCli) {
    try {
      const userDb = client.db('users');
      const users = userDb.collection('users');
      const user = await users.findOne({ dbName: cliDbName });
      
      if (user) {
        categories = user.categories || [];
        userTypes = user.types || [];
        softCategories = user.softCategories || [];
        console.log(`👤 Fetched settings for user: ${cliDbName}`);
      } else {
        console.warn(`⚠️ Warning: No user found for dbName "${cliDbName}". Using empty settings.`);
      }
    } catch (err) {
      console.error('❌ Error fetching user settings:', err);
    }
  }

  // Check user's sync mode to determine classification method
  let isImageSyncMode = false;
  try {
    const usersDb = client.db("users");
    const userDoc = await usersDb.collection("users").findOne({ dbName: cliDbName });
    if (userDoc && userDoc.syncMode === "image") {
      isImageSyncMode = true;
      await log("🖼️ Image sync mode detected - will use image-based classification");
    } else {
      await log("📝 Text sync mode detected - will use text-only classification");
    }
  } catch (err) {
    await log(`⚠️ Could not determine sync mode, defaulting to text-only: ${err.message}`);
  }

  // Mark reprocess start on user document
  try {
    await client
      .db("users")
      .collection("users")
      .updateOne(
        { dbName: cliDbName },
        { $set: { reprocessStartedAt: runStartedAt } },
        { upsert: false }
      );
    await log("🕒 Marked reprocess start for user");
  } catch (userErr) {
    await log(`⚠️ Could not update user reprocess start: ${userErr.message}`);
  }

  const db = client.db(cliDbName);
  const collection = db.collection("products");
  statusCol = db.collection("sync_status");

  // Clear existing logs and initialize status
  await statusCol.updateOne(
    { dbName: cliDbName },
    { 
      $set: { 
        dbName: cliDbName, 
        state: "reprocessing", 
        progress: 0, 
        done: 0, 
        startedAt: runStartedAt,
        logs: [] 
      } 
    },
    { upsert: true }
  );

  // Ensure every product has a stamp
  try {
    const initFromFetched = await collection.updateMany(
      { categoryTypeProcessedAt: { $exists: false }, fetchedAt: { $exists: true } },
      [ { $set: { categoryTypeProcessedAt: "$fetchedAt" } } ]
    );
    await log(`🧭 Initialized stamp from fetchedAt for ${initFromFetched.modifiedCount} products`);
  } catch (e) {
    await log(`⚠️ Pipeline update not supported, skipping init-from-fetchedAt: ${e.message}`);
  }

  const initToNow = await collection.updateMany(
    { categoryTypeProcessedAt: { $exists: false } },
    { $set: { categoryTypeProcessedAt: new Date() } }
  );
  await log(`🕒 Initialized missing stamp to now for ${initToNow.modifiedCount} products`);

  await log(`⏱️ Week threshold TEMPORARILY DISABLED - will reprocess all products with embeddings`);
  await log(`🛒 IMPORTANT: All reprocessing will ONLY target IN-STOCK products`);

  // Build query conditions based on sync mode
  let classificationConditions = null;
  
  await log(`🔍 Building query with:`);
  await log(`  - missingSoftCategoryOnly = ${missingSoftCategoryOnly}`);
  await log(`  - onlyUnprocessed = ${onlyUnprocessed}`);
  await log(`  - incrementalMode = ${incrementalMode}`);
  
  if (incrementalMode) {
    // Incremental mode: only process products that already have embeddings and categories
    classificationConditions = {
      $and: [
        { embedding: { $exists: true, $ne: null } },
        { category: { $exists: true, $ne: null, $ne: [] } },
        {
          $or: [
            { softCategory: { $exists: true, $ne: null } },
            { softCategory: { $eq: [] } }
          ]
        }
      ]
    };
    await log("➕ INCREMENTAL MODE: Will add new soft categories to already-processed products");
    await log(`➕ New soft categories to add: ${incrementalSoftCategories.join(', ')}`);
    await log(`🔍 Classification conditions: ${JSON.stringify(classificationConditions, null, 2)}`);
  } else if (onlyUnprocessed) {
    classificationConditions = {
      $and: [
        {
          $or: [
            { embedding: { $exists: false } },
            { embedding: null },
            { embedding: { $size: 0 } }
          ]
        },
        {
          $or: [
            { category: { $exists: false } },
            { category: { $eq: null } },
            { category: { $eq: [] } }
          ]
        },
        {
          $or: [
            { type: { $exists: false } },
            { type: { $eq: null } },
            { type: { $eq: [] } }
          ]
        },
        {
          $or: [
            { softCategory: { $exists: false } },
            { softCategory: { $eq: null } },
            { softCategory: { $eq: [] } }
          ]
        }
      ]
    };
    await log("🆕 Filter Active: Targeting FRESH UNPROCESSED products (No embeddings, No categories, No types)");
    await log(`🔍 Classification conditions: ${JSON.stringify(classificationConditions, null, 2)}`);
  } else if (missingSoftCategoryOnly) {
    classificationConditions = {
      $and: [
        { category: { $exists: true } },
        {
          $or: [
            { softCategory: { $exists: false } },
            { softCategory: { $eq: null } },
            { softCategory: { $eq: [] } },
            { softCategory: { $size: 0 } }
          ]
        }
      ]
    };
    await log("🎨 Filter Active: Will only process IN-STOCK products with categories but MISSING/EMPTY softCategory field");
    await log(`🔍 Classification conditions: ${JSON.stringify(classificationConditions, null, 2)}`);
  } else if (!isImageSyncMode) {
    // Standard text mode missing fields
    classificationConditions = {
      $or: [
        { category: { $exists: false } },
        { category: { $eq: [] } },
        { category: { $eq: null } },
        { type: { $exists: false } },
        { type: { $eq: [] } },
        { type: { $eq: null } },
        { softCategory: { $exists: false } },
        { softCategory: { $eq: [] } },
        { softCategory: { $eq: null } },
      ]
    };
    await log("📝 Text mode: Will process IN-STOCK products missing categories/types/softCategories");
  } else {
    await log("🖼️ Image mode: No specific classification filter (will process all based on baseQuery)");
  }

  // Build the base query - ALWAYS filter for in-stock products only
  const inStockFilter = {
    $or: [
      { stockStatus: "instock" },
      { stock_status: "instock" }
    ]
  };
  
  let baseQuery = {};
  
  if (onlyUnprocessed) {
    // For fresh unprocessed products, we only care about stock status in the base query
    baseQuery = {
      $and: [
        inStockFilter
      ]
    };
  } else if (options.reprocessEmbeddings) {
    baseQuery = {
      $and: [
        inStockFilter,
        {
          $or: [
            { embedding: { $exists: true, $ne: null } },
            { 
              description1: { $exists: true, $ne: "" },
              $or: [
                { embedding: { $exists: false } },
                { embedding: null },
                { embedding: { $size: 0 } }
              ]
            }
          ]
        }
      ]
    };
  } else {
    baseQuery = {
      $and: [
        inStockFilter,
        { embedding: { $exists: true, $ne: null } }
      ]
    };
  }

  let finalQuery;
  // Properly combine baseQuery with classificationConditions
  if (classificationConditions) {
    if (baseQuery.$and) {
      // Flatten the conditions properly
      if (classificationConditions.$and) {
        finalQuery = {
          $and: [
            ...baseQuery.$and,
            ...classificationConditions.$and
          ]
        };
      } else {
        finalQuery = {
          $and: [
            ...baseQuery.$and,
            classificationConditions
          ]
        };
      }
    } else {
      finalQuery = {
        $and: [
          baseQuery,
          classificationConditions
        ]
      };
    }
  } else {
    finalQuery = baseQuery;
  }

  if (isImageSyncMode) {
    await log("🖼️ Running in Image sync mode");
  } else {
    await log("📝 Running in Text sync mode");
  }

  // Add category filtering if targetCategory is specified
  if (targetCategory) {
    finalQuery = {
      ...finalQuery,
      category: { $in: [targetCategory] }
    };
    await log(`🎯 Added category filter: only products with category "${targetCategory}" will be processed`);
  }

  await log(`🔍 Final MongoDB query: ${JSON.stringify(finalQuery, null, 2)}`);
  
  // Log counts for debugging
  const totalInStock = await collection.countDocuments(inStockFilter);
  await log(`📊 Total in-stock products: ${totalInStock}`);
  
  if (missingSoftCategoryOnly) {
    const withSoftCategories = await collection.countDocuments({
      $and: [
        inStockFilter,
        { softCategory: { $exists: true, $ne: null, $ne: [] } }
      ]
    });
    const withoutSoftCategories = await collection.countDocuments({
      $and: [
        inStockFilter,
        {
          $or: [
            { softCategory: { $exists: false } },
            { softCategory: { $eq: null } },
            { softCategory: { $eq: [] } }
          ]
        }
      ]
    });
    await log(`📊 Products WITH soft categories: ${withSoftCategories}`);
    await log(`📊 Products WITHOUT soft categories: ${withoutSoftCategories}`);
  }

  if (onlyUnprocessed) {
    const freshProducts = await collection.countDocuments(finalQuery);
    await log(`📊 Fresh/Unprocessed products found: ${freshProducts}`);
  }
  
  // Count what the final query will actually return
  const finalQueryCount = await collection.countDocuments(finalQuery);
  await log(`📊 Products matching FINAL QUERY: ${finalQueryCount}`);
  
  const productsToProcess = await collection.find(finalQuery).toArray();
  
  const totalToProcess = productsToProcess.length;
  await statusCol.updateOne(
    { dbName: cliDbName },
    { $set: { state: totalToProcess > 0 ? "reprocessing" : "idle", total: totalToProcess } }
  );

  await log(`🔄 Processing ${totalToProcess} products for enrichment`);
  if (totalToProcess === 0) {
    if (isImageSyncMode && !onlyUnprocessed) {
      await log("✅ Nothing to do. No products with embeddings found for image-based reprocessing.");
    } else if (onlyUnprocessed) {
      await log("✅ Nothing to do. No fresh/unprocessed products found (all products already have embeddings or category data).");
    } else if (missingSoftCategoryOnly) {
      await log("✅ Nothing to do. No products found with categories but missing softCategory field.");
    } else {
      await log("✅ Nothing to do. All products with embeddings already have category/type data.");
    }
  }

  let done = 0;
  for (const product of productsToProcess) {
    try {
      await fs.access(lockFilePath);
    } catch (error) {
      await log("🛑 Reprocessing stopped by user.");
      await statusCol.updateOne(
        { dbName: cliDbName },
        { $set: { state: "idle", stoppedAt: new Date() } }
      );
      break;
    }

    try {
      await log(`\n🟡 Processing: ${product.name} (ID: ${product.id})`);
      const { name, categories: productCategories, metadata, images, image } = product; // Added image
      const originalDescription = getProductDescription(product);

      if (!originalDescription || originalDescription.trim() === "") {
        await log("⚠️ Skipping - no original description found");
        await collection.updateOne(
          { _id: product._id },
          { $set: { categoryTypeProcessedAt: new Date() } }
        );
      } else {
        // Initialize updateData
        const updateData = {
          categoryTypeProcessedAt: new Date(),
          url: product.url || product.permalink || product.link || null,
          image: product.image || (product.images && product.images.length > 0 ? product.images[0].src : null)
        };
        
        // Always convert price fields to numbers properly
        if (product.price) updateData.price = parsePrice(product.price);
        if (product.regular_price) updateData.regular_price = parsePrice(product.regular_price);
        if (product.sale_price) updateData.sale_price = parsePrice(product.sale_price);
        
        // Process variants if enabled
        let variantData = { variants: [], sizes: [], colors: [] };
        if (options.reprocessVariants) {
          variantData = processProductVariants(product);
          await log(`🔧 Processed variants for ${name}: ${variantData.variants.length} variants, ${variantData.sizes.length} sizes, ${variantData.colors.length} colors`);
          
          updateData.variants = variantData.variants;
          updateData.sizes = variantData.sizes;
          updateData.colors = variantData.colors;
        }
        
        // Create enriched description
        let enrichedDescription = product.description || originalDescription;

        if (options.reprocessDescriptions) {
          const hasPluralImages = images && Array.isArray(images) && images.length > 0;
          const hasSingularImage = image && typeof image === 'string';
          
          await log(`🔍 Image mode check for ${name}: isImageSyncMode=${isImageSyncMode}, has 'images' array=${hasPluralImages}, has 'image' string=${hasSingularImage}`);
          
          if (isImageSyncMode && (hasPluralImages || hasSingularImage)) {
            // Use image-based description for image sync mode
            await log(`🖼️ Creating image-based description for ${name}`);
            const imageDescription = await describeImages(product);
            
            // Add metadata and category info
            let metadataAppend = '';
            
            // Handle WooCommerce metadata
            if (metadata && Array.isArray(metadata)) {
              metadataAppend = await summarizeMetadata(metadata);
            }
            
            // Handle Shopify-specific fields
            if (product.productType) {
              metadataAppend += `${metadataAppend ? '\n' : ''}Product Type: ${product.productType}`;
            }
            if (product.vendor) {
              metadataAppend += `${metadataAppend ? '\n' : ''}Vendor: ${product.vendor}`;
            }
            if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
              metadataAppend += `${metadataAppend ? '\n' : ''}Tags: ${product.tags.join(', ')}`;
            }

            let categoryAppend = '';
            if (productCategories && Array.isArray(productCategories)) {
              categoryAppend = productCategories
                .filter(cat => cat.name)
                .map(cat => cat.name)
                .join('\n');
            }

            enrichedDescription = `${imageDescription}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();
            updateData.description1 = enrichedDescription;
            await log(`✅ Generated image-based enriched description for ${name} (${enrichedDescription.length} chars)`);
          } else {
            // Use original description with metadata
            let metadataAppend = '';
            
            // Handle WooCommerce metadata
            if (metadata && Array.isArray(metadata)) {
              metadataAppend = await summarizeMetadata(metadata);
            }
            
            // Handle Shopify-specific fields
            if (product.productType) {
              metadataAppend += `${metadataAppend ? '\n' : ''}Product Type: ${product.productType}`;
            }
            if (product.vendor) {
              metadataAppend += `${metadataAppend ? '\n' : ''}Vendor: ${product.vendor}`;
            }
            if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
              metadataAppend += `${metadataAppend ? '\n' : ''}Tags: ${product.tags.join(', ')}`;
            }

            let categoryAppend = '';
            if (productCategories && Array.isArray(productCategories)) {
              categoryAppend = productCategories.map(c => c.name).join(' ');
            }

            enrichedDescription = `${originalDescription}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();
            updateData.description1 = enrichedDescription;
            await log(`✅ Generated text-based enriched description for ${name} (${enrichedDescription.length} chars)`);
          }
        }
        
        // Translate description if enabled (do this before embedding)
        if (options.translateBeforeEmbedding && options.reprocessDescriptions) {
          try {
            await log(`🌐 Translating description to English for ${name}`);
            const translatedDescription = await translateToEnglish(enrichedDescription);
            if (translatedDescription && translatedDescription !== enrichedDescription) {
              enrichedDescription = translatedDescription;
              updateData.description1 = enrichedDescription;
              await log(`✅ Translation completed and saved to description1 for ${name}`);
            } else {
              await log(`⚠️ Translation returned same text or failed for ${name}`);
            }
          } catch (translationError) {
            await log(`❌ Error translating description: ${translationError.message}`);
          }
        }
        
        // Generate new embedding if enabled
        if (options.reprocessEmbeddings) {
          try {
            await log(`🧮 Generating embedding for ${name}`);
            
            if (embeddings) {
              // Use the (possibly translated) enriched description for embedding
              const embeddingVector = await embed(enrichedDescription);
              if (embeddingVector) {
                updateData.embedding = embeddingVector;
                await log(`✅ Generated new embedding for ${name}${options.translateBeforeEmbedding ? ' (using translated text)' : ''}`);
              } else {
                await log(`⚠️ Failed to generate embedding for ${name}`);
              }
            } else {
              await log(`⚠️ Cannot generate embedding - OpenAI API key not configured`);
            }
          } catch (embeddingError) {
            await log(`❌ Error generating embedding: ${embeddingError.message}`);
          }
        }

        // Initialize with existing product data or defaults
        let gptCategory = product.category || [];
        let productType = product.type || [];
        let softCategory = product.softCategory || [];
        
        // Handle incremental mode separately
        if (incrementalMode) {
          await log(`➕ Incremental classification for: ${name}`);
          
          // Build context for classification
          let classificationContext = originalDescription;
          
          // Add metadata context
          let contextMetadata = '';
          
          if (metadata && Array.isArray(metadata)) {
            const metadataSummary = await summarizeMetadata(metadata);
            if (metadataSummary) {
              contextMetadata += `\n${metadataSummary}`;
            }
          }
          
          if (product.productType) {
            contextMetadata += `\nProduct Type: ${product.productType}`;
          }
          if (product.vendor) {
            contextMetadata += `\nVendor: ${product.vendor}`;
          }
          if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
            contextMetadata += `\nTags: ${product.tags.join(', ')}`;
          }
          
          if (productCategories && Array.isArray(productCategories)) {
            const categoryNames = productCategories.map(c => c.name).filter(Boolean).join(', ');
            if (categoryNames) {
              contextMetadata += `\nProduct Categories: ${categoryNames}`;
            }
          }
          
          classificationContext = `${originalDescription}${contextMetadata}`.trim();
          
          // Fetch the primary image for context if in image mode
          let imageForContext = null;
          if (isImageSyncMode) {
            const hasPluralImages = images && Array.isArray(images) && images.length > 0;
            const hasSingularImage = image && typeof image === 'string';
            let imageUrl = null;

            if (hasPluralImages && images[0].src) {
              imageUrl = images[0].src;
            } else if (hasSingularImage) {
              imageUrl = image;
            }

            if (imageUrl) {
              console.log(`🖼️ Fetching primary image for incremental classification: ${imageUrl}`);
              imageForContext = await fetchImageAsBase64(imageUrl);
            }
          }

          const incrementalResult = await classifyIncremental(
            classificationContext,
            name,
            incrementalSoftCategories,
            softCategory, // Pass existing soft categories
            variantData.variants,
            imageForContext
          );
          
          // Update only soft categories
          updateData.softCategory = incrementalResult.softCategory;
          softCategory = incrementalResult.softCategory;
          
          await log(`➕ Added new soft categories to ${name}. Result: ${softCategory.join(', ') || 'None'}`);
        }
        // Only perform classification if any classification option is enabled
        else if (options.reprocessHardCategories || options.reprocessSoftCategories || options.reprocessTypes) {
          await log(`🔍 Classifying with variants for: ${name}`);

          // Build enriched context for classification (always include metadata even if not reprocessing descriptions)
          let classificationContext = originalDescription;
          
          // Add metadata context for better classification
          let contextMetadata = '';
          
          // Handle WooCommerce metadata
          if (metadata && Array.isArray(metadata)) {
            const metadataSummary = await summarizeMetadata(metadata);
            if (metadataSummary) {
              contextMetadata += `\n${metadataSummary}`;
            }
          }
          
          // Handle Shopify-specific fields
          if (product.productType) {
            contextMetadata += `\nProduct Type: ${product.productType}`;
          }
          if (product.vendor) {
            contextMetadata += `\nVendor: ${product.vendor}`;
          }
          if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
            contextMetadata += `\nTags: ${product.tags.join(', ')}`;
          }
          
          // Add categories if available
          if (productCategories && Array.isArray(productCategories)) {
            const categoryNames = productCategories.map(c => c.name).filter(Boolean).join(', ');
            if (categoryNames) {
              contextMetadata += `\nProduct Categories: ${categoryNames}`;
            }
          }
          
          classificationContext = `${originalDescription}${contextMetadata}`.trim();
          await log(`📝 Classification context built with metadata (${classificationContext.length} chars)`);

          // Fetch the primary image for context if in image mode
          let imageForContext = null;
          if (isImageSyncMode) {
            const hasPluralImages = images && Array.isArray(images) && images.length > 0;
            const hasSingularImage = image && typeof image === 'string';
            let imageUrl = null;

            if (hasPluralImages && images[0].src) {
              imageUrl = images[0].src;
            } else if (hasSingularImage) {
              imageUrl = image;
            }

            if (imageUrl) {
              console.log(`🖼️ Fetching primary image for classification context: ${imageUrl}`);
              imageForContext = await fetchImageAsBase64(imageUrl);
            }
          }

          const classificationResult = await classify(
            classificationContext, 
            name, 
            categories, 
            userTypes, 
            safeSoftCategories, 
            variantData.variants,
            imageForContext // Pass the fetched image
          );
          
          // Only update categories that are enabled
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
        }

        await collection.updateOne(
          { _id: product._id },
          { $set: updateData }
        );

        await log(`✅ Classified ${name} as Category: ${(gptCategory || []).join(', ') || 'None'}, Type: ${(productType || []).join(', ') || 'None'}, Soft Category: ${(softCategory || []).join(', ') || 'None'}`);
      }

      // progress tick
      done += 1;
      const progress = totalToProcess > 0 ? Math.round((done / totalToProcess) * 100) : 100;
      await statusCol.updateOne(
        { dbName: cliDbName },
        { $set: { done, progress } }
      );

    } catch (error) {
      await log(`❌ Error processing product ${product.id}: ${error.message}`);
    }
  }

  // Mark reprocess finished
  try {
    await client
      .db("users")
      .collection("users")
      .updateOne(
        { dbName: cliDbName },
        { $set: { lastReprocessAt: new Date(), reprocessFinishedAt: new Date() } },
        { upsert: false }
      );
    await log("🏁 Marked reprocess finished for user");
  } catch (userErr) {
    await log(`⚠️ Could not update user reprocess finish: ${userErr.message}`);
  }

  // Mark status as done
  await statusCol.updateOne(
    { dbName: cliDbName },
    { $set: { state: "done", finishedAt: new Date(), done, progress: 100 } }
  );

  await log("📦 Reprocess summary: processed=" + (productsToProcess?.length || 0));

  await client.close();
  
  // Close shared browser if active
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
      sharedBrowser = null;
      console.log("✅ Closed stealth browser");
    } catch (browserErr) {
      console.warn("⚠️ Error closing stealth browser:", browserErr.message);
    }
  }

  try {
    await fs.unlink(lockFilePath);
  } catch (error) {
    // Ignore errors if the file is already gone
  }
  await log("✅ Closed MongoDB connection");
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
    translateBeforeEmbedding: true, // Default to true for Hebrew products
    reprocessAll: false,
  };
  let targetCategory = null;
  let missingSoftCategoryOnly = false;
  let onlyUnprocessed = false;

  args.forEach(arg => {
    if (arg.startsWith('--limit=')) {
      // placeholder for future use
    } else if (arg.startsWith('--target-category=')) {
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

// If called directly from the command line, run the function
if (require.main === module) {
  reprocessProducts({}).catch(err => {
    console.error("❌ Unhandled error in reprocessProducts:", err);
    process.exit(1);
  });
}

// Export functions
const moduleExports = reprocessProducts;
moduleExports.reprocessProducts = reprocessProducts;
moduleExports.findProductsWithoutEmbeddings = findProductsWithoutEmbeddings;
moduleExports.describeImages = describeImages;
moduleExports.summarizeMetadata = summarizeMetadata;
moduleExports.translateToEnglish = translateToEnglish;

module.exports = moduleExports;