import { MongoClient } from "mongodb";
import { GraphQLClient, gql } from "graphql-request";
import pLimit from "p-limit";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { parse } from "node-html-parser";
import { GoogleGenAI } from '@google/genai';
import { appendLogs } from './syncStatus-esm.js';

// Environment variables
const {
  MONGODB_URI,
  OPENAI_API_KEY,
  GOOGLE_AI_API_KEY,
  IMG_CONCURRENCY = "3" // how many products to process in parallel
} = process.env;

const MONGO_URI = process.env.MONGODB_URI;

/* ---------- OpenAI helpers --------------------------------------- */
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
  apiKey: OPENAI_API_KEY
});

// Initialize Google AI if you have the API key
const ai = GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== "YOUR_GOOGLE_AI_KEY" 
  ? new GoogleGenAI({apiKey: GOOGLE_AI_API_KEY})
  : null;

function isValidImageUrl(url) {
  if (typeof url !== "string") return false;
  try { new URL(url); } catch { return false; }
  return /\.(jpe?g|png|gif|webp)$/i.test(url);
}

/**
 * Retry helper with exponential backoff for network requests
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryableError = 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('socket hang up');

      if (isLastAttempt || !isRetryableError) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      console.warn(`Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function parseHtmlToPlainText(html) {
  if (!html) return "";
  try {
    const root = parse(html);
    const text = root.text;
    return text.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.warn("Error parsing HTML:", error.message);
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }
}

/** Translate description using Gemini AI */
async function translateDescription(description) {
  console.log("🌐 Translation input length:", description?.length || 0);
  
  if (!description || description.trim() === "") {
    console.log("❌ No description provided to translate");
    return null;
  }

  try {
    if (!ai) {
      console.warn("Google AI client not initialized - translation not available");
      return description;
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
      model: "gemini-2.5-flash",
      contents: messages,
      config: {
        responseMimeType: "text/plain",
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
    
    const translated = result?.trim();
    console.log("🌐 Translation result length:", translated?.length || 0);
    
    return translated || description;
  } catch (error) {
    console.error("Translation error:", error);
    return description;
  }
}

async function summarizeMetadata(metadata) {
  if (!metadata || !Array.isArray(metadata) || metadata.length === 0) {
    return '';
  }

  try {
    if (!ai) {
      return JSON.stringify(metadata);
    }

    const metadataString = JSON.stringify(metadata, null, 2);
    
    const messages = [
      {
        role: "user",
        parts: [{
          text: `Summarize the following product metadata into a concise, keyword-rich description:\n\n${metadataString}`
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

    return result?.trim() || JSON.stringify(metadata);
  } catch (error) {
    console.warn("Metadata summarization error:", error);
    return JSON.stringify(metadata);
  }
}

/* Compose image messages for Shopify products.
   Shopify returns images as edges via GraphQL. */
function composeImageMessages(product) {
  return (product.images?.edges || [])
    .map(edge => edge.node.src) // Use 'src' instead of 'originalSrc'
    .filter(url => isValidImageUrl(url))
    .map(url => ({ type: "image_url", image_url: { url } }));
}

async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine MIME type from URL or response headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return {
      data: base64,
      mimeType: contentType
    };
  } catch (error) {
    console.warn(`Failed to fetch image ${imageUrl}:`, error.message);
    return null;
  }
}

async function describeImages(product) {
  console.log('🖼️ DEBUG: Product object structure:');
  console.log('Product title:', product.title);
  console.log('Product.images exists:', !!product.images);
  console.log('Product.images type:', typeof product.images);
  console.log('Product.images.edges exists:', !!product.images?.edges);
  console.log('Product.images.edges type:', typeof product.images?.edges);
  console.log('Product.images.edges length:', product.images?.edges?.length);
  
  if (product.images?.edges?.length > 0) {
    console.log('First image edge:', JSON.stringify(product.images.edges[0], null, 2));
  }

  if (!ai) {
    console.warn("Google AI client not initialized for image analysis.");
    return `Product: ${product.title}. AI client not available for image analysis.`;
  }

  const validImages = (product.images?.edges || [])
    .map(edge => edge.node) // Extract the actual image object from the edge
    .filter(img => isValidImageUrl(img.src)) // Use 'src' instead of 'originalSrc'
    .slice(0, 3); // Limit to first 3 images for performance

  console.log('🖼️ Valid images found:', validImages.length);
  if (validImages.length > 0) {
    console.log('First valid image URL:', validImages[0].src);
  }

  if (validImages.length === 0) {
    return `Product: ${product.title}. No valid images available for analysis.`;
  }

  try {
    // Fetch and convert images to base64
    const imagePromises = validImages.map(img => fetchImageAsBase64(img.src));
    const imageResults = await Promise.all(imagePromises);
    const validBase64Images = imageResults.filter(result => result !== null);

    if (validBase64Images.length === 0) {
      return `Product: ${product.title}. Failed to fetch images for analysis.`;
    }

    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `Describe the main product details visible in the images for "${product.title}". Focus on design, shape, colors and unique attributes. Be concise and factual.`
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

    return result?.trim() || `Product: ${product.title}. Image analysis completed but no description generated.`;

  } catch (error) {
    console.warn("Gemini image description failed:", error);
    return `Product: ${product.title}. Image analysis failed: ${error.message}`;
  }
}

async function embed(text) {
  try {
    return await embeddings.embedQuery(text);
  } catch (e) {
    console.warn("Embedding failed:", e);
    return null;
  }
}

async function classifyWithImages(text, name, categories, types, softCategories, images, variants = [], context) {
  // Ensure categories and types are arrays
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
  
  const categoryList = categoriesArray.join(", ");
  const typeList = typesArray.join(", ");
  const softCategoryList = softCategoriesArray.join(", ");

  // Check if Gemini AI is available
  if (!ai) {
    console.warn("Google AI client not initialized - falling back to basic classification");
    return { category: [], type: [], softCategory: [] };
  }

  console.log(`🖼️ Classifying ${name} with ${images ? images.length : 0} images`);

  // Process images for vision analysis
  let imageParts = [];
  if (images && Array.isArray(images) && images.length > 0) {
    const validImages = images.filter(img => img && img.src && isValidImageUrl(img.src));
    if (validImages.length > 0) {
      console.log(`🔍 Processing ${validImages.length} valid images for classification`);
      const imagePromises = validImages.slice(0, 3).map(img => fetchImageAsBase64(img.src));
      const imageResults = await Promise.all(imagePromises);
      const validBase64Images = imageResults.filter(result => result !== null);
      
      imageParts = validBase64Images.map(img => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      }));
      
      console.log(`✅ Successfully processed ${imageParts.length} images for classification`);
    }
  }

  const contextPrompt = context ? `\n\nBusiness Context: ${context}` : '';

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
      parts: [
        {
          text: `You are an AI e-commerce assistant. Classify the product based on its description, images, and variant information.
Follow these rules:
1.  Category MUST be an array from: [${categoryList}]. If no match, return an empty array.
2.  Type MUST be an array from: [${typeList}]. If no match, return an empty array.
3.  Soft Category MUST be an array from: [${softCategoryList}]. If no match, return an empty array.
4.  Use variant information (colors, sizes, options) to enhance your classification accuracy.
5.  If classifying colors in soft categories, analyze ALL available variants to determine available colors.
6.  Do NOT invent new categories, types, or soft categories.
7.  Use the description, images, AND variant data to make the most accurate classification.

Product Name: ${name}
Description:
${text}${contextPrompt}${variantInfo}

Return ONLY a JSON object like: {"category": ["The Category"], "type": ["The Type"], "softCategory": ["The Soft Category"]}`
        },
        ...imageParts // Add the processed images here
      ]
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
    
    // DEBUG: Log exactly what the AI returned
    console.log(`🔍 RAW AI RESPONSE for ${name}:`);
    console.log(`  Category: ${JSON.stringify(out.category)}`);
    console.log(`  Type: ${JSON.stringify(out.type)}`);
    console.log(`  SoftCategory: ${JSON.stringify(out.softCategory)}`);
    
    // Final validation and enforcement
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
    
    // Standard validation for soft categories
    if (out.softCategory && Array.isArray(out.softCategory)) {
      out.softCategory = out.softCategory.filter(s => softCategoriesArray.includes(s));
    } else {
      out.softCategory = [];
    }
    
    return out;

  } catch (error) {
    console.warn(`Image-based classification failed for ${name}:`, error);
    return { category: [], type: [], softCategory: [] };
  }
}

async function generateEnglishDescriptionWithVision(originalText, productName, images, metadata, categories, context) {
  let generatedDescription = originalText;

  if (ai) {
    try {
      let imageParts = [];
      if (images && Array.isArray(images) && images.length > 0) {
        const validImages = images.filter(img => img && img.src && isValidImageUrl(img.src));
        if (validImages.length > 0) {
          const imagePromises = validImages.slice(0, 3).map(img => fetchImageAsBase64(img.src));
          const imageResults = await Promise.all(imagePromises);
          const validBase64Images = imageResults.filter(result => result !== null);
          imageParts = validBase64Images.map(img => ({
            inlineData: { mimeType: img.mimeType, data: img.data }
          }));
        }
      }

      const contextPrompt = context ? `\n\nBusiness Context: ${context}` : '';

      const messages = [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI data specialist for e-commerce semantic search.
Your task is to create a keyword-rich, factual, and objective description in English, optimized for embeddings.
Analyze the provided text and images to extract key attributes. Do not include metadata or category information in your response.${contextPrompt}

Product Name: ${productName}
Original Text:
${originalText}

Provide ONLY the optimized product description as a plain text response.`
            },
            ...imageParts
          ]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages,
        config: {
          responseMimeType: "text/plain",
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      });

      let result;
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        result = response.candidates[0].content.parts[0].text;
      } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        result = response.response.candidates[0].content.parts[0].text;
      }

      if (result) {
        generatedDescription = result.trim();
      }

    } catch (error) {
      console.warn(`Failed to generate new English description for ${productName}:`, error);
    }
  }

  // Append raw metadata and categories (Shopify format)
  const metadataAppend = metadata ? JSON.stringify(metadata) : '';
  const categoryAppend = categories && Array.isArray(categories) ? categories.map(c => c.name || c).join(' ') : '';
  
  return `${generatedDescription}\n\n${metadataAppend}\n\n${categoryAppend}`.trim();
}

function parsePrice(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') {
    return 0;
  }
  if (typeof priceValue === 'number') {
    return isNaN(priceValue) ? 0 : priceValue / 100; // Convert cents to dollars
  }
  let cleanPrice = String(priceValue);
  cleanPrice = cleanPrice.replace(/[$₪€£¥,\s]/g, '');
  cleanPrice = cleanPrice.replace(/[^\d.-]/g, '');
  if (cleanPrice === '' || cleanPrice === '-' || cleanPrice === '.') {
    return 0;
  }
  const numericPrice = parseFloat(cleanPrice);
  const result = isNaN(numericPrice) ? 0 : numericPrice / 100; // Convert cents to dollars
  return result < 0 ? 0 : result;
}

/** Process and normalize Shopify variants into standardized format */
function processShopifyVariants(product) {
  if (!product.variants?.edges || product.variants.edges.length === 0) {
    return { variants: [], sizes: [], colors: [] };
  }

  const variants = product.variants.edges.map(({ node }) => {
    // Create options map for easy access
    const optMap = Object.fromEntries((node.selectedOptions || []).map(o => [o.name?.toLowerCase(), o.value]));
    
    const variantPrice = parsePrice(node.price);
    const variantCompareAtPrice = parsePrice(node.compareAtPrice);
    
    return {
      id: node.id,
      title: node.title,
      sku: node.sku || null,
      price: variantPrice,
      compareAtPrice: variantCompareAtPrice,
      image: node.image?.src || null,
      size: optMap['size'] || optMap['eu size'] || optMap['us size'] || null,
      color: optMap['color'] || optMap['colour'] || null,
      options: node.selectedOptions || [],
      inventoryQuantity: node.inventoryQuantity || 0,
      availableForSale: node.availableForSale || false,
      inventoryPolicy: node.inventoryPolicy || null,
      taxable: node.taxable || false,
      barcode: node.barcode || null,
      createdAt: node.createdAt || null,
      updatedAt: node.updatedAt || null
    };
  });

  // Extract unique sizes and colors from variants
  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))].sort();
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];

  return { variants, sizes, colors };
}

function isProductInStock(product) {
  // Check if any variant is available for sale and has inventory
  if (product.variants?.edges && product.variants.edges.length > 0) {
    return product.variants.edges.some(({ node: variant }) => {
      // Must be available for sale
      if (!variant.availableForSale) return false;
      
      // If inventoryQuantity is provided and is a number, check it
      if (typeof variant.inventoryQuantity === 'number') {
        return variant.inventoryQuantity > 0;
      }
      
      // If no specific inventory quantity but availableForSale is true, assume available
      // (This handles cases where inventory is not tracked)
      return true;
    });
  }
  
  // Fallback: check total inventory if available
  if (typeof product.totalInventory === 'number') {
    return product.totalInventory > 0;
  }
  
  // If no inventory info available, assume out of stock for safety
  return false;
}

/* ----------------------------------------------------------------- */


export default async function processShopifyImages({ shopifyDomain, shopifyToken, dbName, categories, userTypes, softCategories, context }) {
  console.log('🔍 Starting processShopifyImages with:', { shopifyDomain, dbName, context });

  // Clean and format the domain properly
  const cleanDomain = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const fullDomain = cleanDomain.includes('.myshopify.com') ? cleanDomain : `${cleanDomain}.myshopify.com`;
  
  console.log('🔧 Domain processing:', { original: shopifyDomain, clean: cleanDomain, final: fullDomain });

  // Test connection first with a simple fetch (with retry)
  const testEndpoint = `https://${fullDomain}/admin/api/2025-01/shop.json`;
  console.log('🧪 Testing connection to:', testEndpoint);
  
  try {
    // Import https module for custom agent
    const https = await import('https');
    
    const testResponse = await retryWithBackoff(async () => {
      return await fetch(testEndpoint, {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
          'User-Agent': 'Semantix/1.1'
        },
        // Add custom agent with permissive SSL settings
        agent: new https.Agent({
          rejectUnauthorized: false,
          secureProtocol: 'TLS_method',
          ciphers: 'DEFAULT'
        })
      });
    }, 3, 1000);
    
    if (testResponse.ok) {
      const shopData = await testResponse.json();
      console.log('✅ Connection test successful:', shopData.shop?.name);
    } else {
      console.error('❌ Connection test failed:', testResponse.status, testResponse.statusText);
      return [];
    }
  } catch (testError) {
    console.error('❌ Connection test error:', testError.message);
    console.error('Error details:', {
      code: testError.code,
      cause: testError.cause?.message || 'No cause available'
    });
    
    // If we can't even connect to the shop endpoint, skip GraphQL
    console.log('⏭️ Skipping GraphQL due to connection issues');
    return [];
  }

  // If connection test passes, proceed with GraphQL
  const endpoint = `https://${fullDomain}/admin/api/2025-01/graphql.json`;
  console.log('🔗 GraphQL endpoint:', endpoint);

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json',
      'User-Agent': 'Semantix/1.1'
    },
    timeout: 30000,
    fetch: async (url, options) => {
      const https = await import('https');
      return fetch(url, {
        ...options,
        agent: new https.Agent({
          rejectUnauthorized: false,
          secureProtocol: 'TLS_method',
          ciphers: 'DEFAULT'
        })
      });
    }
  });

  const logs = [];
  const log = async (message) => {
    logs.push(message);
    await appendLogs(dbName, [message]);
  };
  
  await log(`🚀 Starting Shopify image processing for database: ${dbName}`);

  const validUserTypes = Array.isArray(userTypes) ? userTypes : [];
  await log(`🏷️ User types: ${validUserTypes.length > 0 ? validUserTypes.join(', ') : 'none'}`);
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(dbName);
  const productsCol = db.collection("products");
  const statusCol = db.collection("sync_status");

  // Mark job as running
  await statusCol.updateOne(
    { dbName },
    { $set: { state: "running", startedAt: new Date(), done: 0, total: 0 } },
    { upsert: true }
  );

  // GraphQL query to fetch products (adjust fields as needed)
  const query = gql`
    query getProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            title
            handle
            vendor
            productType
            tags
            onlineStoreUrl
            status
            descriptionHtml
            totalInventory
            tracksInventory
            images(first: 10) {
              edges {
                node {
                  id
                  src: url
                  altText
                }
              }
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  sku
                  title
                  price
                  compareAtPrice
                  inventoryQuantity
                  inventoryPolicy
                  availableForSale
                  taxable
                  barcode
                  createdAt
                  updatedAt
                  selectedOptions {
                    name
                    value
                  }
                  image {
                    id
                    src: url
                    altText
                  }
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
              }
              maxVariantPrice {
                amount
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  console.log('🔄 Starting to fetch all products from Shopify...');

  while (hasNextPage) {
    const batchSize = 50; // Reduced from 250 to prevent connection timeouts
    const variables = { first: batchSize, after: cursor };
    
    console.log(`📦 Fetching batch of up to ${batchSize} products (cursor: ${cursor || 'start'})`);
    
    // Wrap GraphQL request with retry logic
    const data = await retryWithBackoff(async () => {
      return await graphQLClient.request(query, variables);
    }, 3, 2000); // 3 retries, starting with 2s delay
    
    const productsBatch = data.products.edges.map(edge => edge.node);
    allProducts.push(...productsBatch);
    
    console.log(`✅ Fetched ${productsBatch.length} products (total so far: ${allProducts.length})`);

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
    
    // Small delay between batches to be nice to Shopify API
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const products = allProducts;
  console.log(`🎉 Finished fetching all products. Total: ${products.length}`);
  
  // Categorize products by stock status
  console.log('📦 Categorizing products by stock status...');
  const inStockProducts = products.filter(product => isProductInStock(product));
  const outOfStockProducts = products.filter(product => !isProductInStock(product));
  
  console.log(`📊 Stock Status Summary:`);
  console.log(`  ✅ In-stock: ${inStockProducts.length}`);
  console.log(`  ❌ Out-of-stock: ${outOfStockProducts.length}`);
  console.log(`  📦 Total: ${products.length}`);
  
  // Step 1: Save ALL products (in-stock and out-of-stock) with basic data and stock status
  console.log('💾 Step 1: Saving ALL products with stock status to database...');
  for (const product of products) {
    const stockStatus = isProductInStock(product) ? "instock" : "outofstock";
    const variantData = processShopifyVariants(product);
    
    // Basic product data for all products
    const basicProductData = {
      ...product, // Complete Shopify data
      name: product.title,
      stockStatus: stockStatus,
      variants: variantData.variants,
      sizes: variantData.sizes,
      colors: variantData.colors,
      price: parsePrice(product.priceRange?.minVariantPrice?.amount),
      active: product.status === 'ACTIVE',
      fetchedAt: new Date()
    };

    await productsCol.updateOne(
      { id: product.id },
      { 
        $set: basicProductData,
        $setOnInsert: { 
          // Only set these on insert, don't overwrite existing AI data
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
  }
  
  console.log(`✅ Saved ${products.length} products to database with stock status`);
  
  // Step 2: Filter for AI processing (only in-stock products without embeddings)
  console.log('🔍 Step 2: Filtering for in-stock products that need AI processing...');
  const productsWithoutEmbeddings = [];
  
  for (const product of inStockProducts) {
    const existingProduct = await productsCol.findOne({ id: product.id });
    if (!existingProduct || !existingProduct.embedding) {
      productsWithoutEmbeddings.push(product);
    }
  }
  
  console.log(`📊 AI Processing Summary:`);
  console.log(`  🔄 In-stock products needing AI processing: ${productsWithoutEmbeddings.length}`);
  console.log(`  ⏭️ In-stock products already processed: ${inStockProducts.length - productsWithoutEmbeddings.length}`);
  console.log(`  📦 Total products in database: ${products.length}`);
  
  await statusCol.updateOne(
    { dbName },
    { $set: { total: productsWithoutEmbeddings.length } }
  );

  // Process products with limited concurrency (IN-STOCK ONLY)
  console.log('🚀 Starting AI processing for IN-STOCK products only...');
  const limit = pLimit(Number(IMG_CONCURRENCY));
  let done = 0;

  await Promise.all(
    productsWithoutEmbeddings.map(prod =>
      limit(async () => {
        console.log(`🔍 Processing product: ${prod.title} (${done + 1}/${productsWithoutEmbeddings.length})`);
        
        // 1) Process variants first to get structured data
        const variantData = processShopifyVariants(prod);
        console.log(`🔧 Processed variants for ${prod.title}: ${variantData.variants.length} variants, ${variantData.sizes.length} sizes, ${variantData.colors.length} colors`);
        
        // 2) Clean the original description (remove HTML, extra whitespace)
        const rawDescription = prod.descriptionHtml || "";
        const cleanedDescription = parseHtmlToPlainText(rawDescription).trim();
        
        // 3) Create Shopify metadata (similar to WooCommerce metadata)
        const shopifyMetadata = {
          productType: prod.productType,
          vendor: prod.vendor,
          tags: prod.tags,
          handle: prod.handle,
          onlineStoreUrl: prod.onlineStoreUrl,
          totalInventory: prod.totalInventory,
          tracksInventory: prod.tracksInventory,
          variantCount: variantData.variants.length,
          availableSizes: variantData.sizes,
          availableColors: variantData.colors,
          // Variant summary for AI context
          variantSummary: variantData.variants.map(v => ({
            title: v.title,
            sku: v.sku,
            price: v.price,
            size: v.size,
            color: v.color,
            availableForSale: v.availableForSale
          }))
        };
        
        // 4) Extract images for vision processing
        const productImages = (prod.images?.edges || []).map(edge => ({
          src: edge.node.src,
          altText: edge.node.altText,
          id: edge.node.id
        }));
        
        // 5) Generate English description with vision analysis
        const enrichedDescription = await generateEnglishDescriptionWithVision(
          cleanedDescription,
          prod.title,
          productImages,
          shopifyMetadata,
          [], // No native categories in Shopify like WooCommerce
          context // Pass context here
        );
        
        // 6) Create embedding
        const embedding = await embed(enrichedDescription);
        
        // 7) Classify the product using the enriched description and variants
        const classificationResult = await classifyWithImages(
          enrichedDescription, // Use the enriched description for classification
          prod.title, 
          categories, 
          userTypes, 
          softCategories, 
          productImages,
          variantData.variants, // Pass processed variants to classification
          context // Pass context here
        );
        
        const gptCategory = classificationResult.category || [];
        let productType = classificationResult.type || [];
        let softCategory = classificationResult.softCategory || [];

        // Check if product is on sale by comparing variant prices (use processed variants)
        let onSale = false;
        if (variantData.variants && variantData.variants.length > 0) {
          onSale = variantData.variants.some(variant => {
            const price = variant.price || 0;
            const compareAtPrice = variant.compareAtPrice || 0;
            return compareAtPrice > price; // On sale if compareAtPrice is higher than current price
          });
        }

        // Automatically append "מבצע" to type array if product is on sale
        if (onSale && !productType.includes("מבצע")) {
          productType.push("מבצע");
          console.log(`🏷️ Added "מבצע" to ${prod.title} - product is on sale`);
        }

        await log(`✅ Classification for ${prod.title}: Category: ${gptCategory.join(', ') || 'None'}, Types: ${productType.join(', ') || 'None'}, Soft Category: ${softCategory.join(', ') || 'None'}${onSale ? ' [ON SALE]' : ''}`);

        // 7) Prepare data for database - parse prices and add stock status
        const rawPrice = prod.priceRange?.minVariantPrice?.amount || 0;
        const price = parsePrice(rawPrice);
        
        const image = prod.images?.edges?.[0]?.node?.src || null;
        const url = prod.onlineStoreUrl || `https://${fullDomain}/products/${prod.handle}`;
        const stockStatus = isProductInStock(prod) ? "instock" : "outofstock";

        const updateData = {
          ...prod, // Spread the complete product JSON
          name: prod.title,
          description1: enrichedDescription,
          embedding,
          category: gptCategory,
          type: productType,
          softCategory,
          price: price,
          image,
          url,
          stockStatus: stockStatus, // Add Shopify-compatible stock status
          onSale: onSale, // Add onSale flag
          active: prod.status === 'ACTIVE',
          // Add processed variant data
          variants: variantData.variants,
          sizes: variantData.sizes,
          colors: variantData.colors,
          fetchedAt: new Date()
        };

        console.log(`📦 Stock Status: ${prod.title} = ${stockStatus}`);

        // 8) Save to database
        await productsCol.updateOne(
          { id: prod.id },
          { $set: updateData },
          { upsert: true }
        );

        done++;
        const progress = Math.round((done / productsWithoutEmbeddings.length) * 100);
        await statusCol.updateOne(
          { dbName },
          { $set: { done, progress } }
        );
        
        console.log(`✅ Completed ${prod.title} (${done}/${productsWithoutEmbeddings.length} - ${progress}%)`);
      })
    )
  );

  console.log(`🎉 Shopify sync completed!`);
  console.log(`📊 Final Summary:`);
  console.log(`  💾 Total products saved to database: ${products.length}`);
  console.log(`  🧠 In-stock products processed with AI: ${productsWithoutEmbeddings.length}`);
  console.log(`  ✅ In-stock products: ${inStockProducts.length}`);
  console.log(`  ❌ Out-of-stock products: ${outOfStockProducts.length}`);

  // Mark job as done
  await statusCol.updateOne(
    { dbName },
    { $set: { state: "done", finishedAt: new Date(), done: productsWithoutEmbeddings.length } }
  );

  await client.close();
}