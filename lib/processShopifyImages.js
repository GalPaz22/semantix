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

/* Compose image messages for Shopify products.
   Shopify returns images as edges via GraphQL. */
function composeImageMessages(product) {
  return (product.images?.edges || [])
    .map(edge => edge.node.originalSrc)
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
  // Check if Gemini AI is available
  if (!ai) {
    console.warn("Google AI client not initialized - falling back to basic description");
    return `Product: ${product.title}. Description not available due to missing AI configuration.`;
  }

  const validImages = (product.images || [])
    .filter(img => isValidImageUrl(img.originalSrc))
    .slice(0, 3); // Limit to first 3 images for performance

  if (validImages.length === 0) {
    return `Product: ${product.title}. No valid images available for analysis.`;
  }

  try {
    // Fetch and convert images to base64
    const imagePromises = validImages.map(img => fetchImageAsBase64(img.originalSrc));
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

async function classifyWithImages(text, name, categories, types, softCategories, images) {
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

  const messages = [
    {
      role: "user",
      parts: [
        {
          text: `You are an AI e-commerce assistant. Classify the product based on its description and images.
Follow these rules:
1.  Category MUST be an array from: [${categoryList}]. If no match, return an empty array.
2.  Type MUST be an array from: [${typeList}]. If no match, return an empty array.
3.  Soft Category MUST be an array from: [${softCategoryList}]. If no match, return an empty array.
4.  Do NOT invent new categories, types, or soft categories.

Product Name: ${name}
Description:
${text}

Return ONLY a JSON object like: {"category": ["The Category"], "type": ["The Type"], "softCategory": ["The Soft Category"]}`
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
    
    // Final validation
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
    console.warn(`Image-based classification failed for ${name}:`, error);
    return { category: [], type: [], softCategory: [] };
  }
}

/* ----------------------------------------------------------------- */


export default async function processShopifyImages({ shopifyDomain, shopifyToken, dbName, categories, userTypes, softCategories }) {
  console.log('🔍 Starting processShopifyImages with:', { shopifyDomain, dbName });

  // Test connection first with a simple fetch
  const testEndpoint = `https://${shopifyDomain}.myshopify.com/admin/api/2025-01/shop.json`;
  console.log('🧪 Testing connection to:', testEndpoint);
  
  try {
    // Import https module for custom agent
    const https = await import('https');
    
    const testResponse = await fetch(testEndpoint, {
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
  const endpoint = `https://${shopifyDomain}.myshopify.com/admin/api/2025-01/graphql.json`;
  console.log('🔗 GraphQL endpoint:', endpoint);

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json',
      'User-Agent': 'Semantix/1.1'
    },
    timeout: 30000
    // Temporarily removed custom fetch to test basic connection
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
            descriptionHtml
            images(first: 10) {
              edges {
                node {
                  id
                  src: url
                  altText
                }
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  sku
                  title
                  price
                  compareAtPrice
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

  while (hasNextPage) {
    const variables = { first: 100, after: cursor };
    const data = await graphQLClient.request(query, variables);
    const productsBatch = data.products.edges.map(edge => edge.node);
    allProducts.push(...productsBatch);

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  const products = allProducts;
  
  await statusCol.updateOne(
    { dbName },
    { $set: { total: products.length } }
  );

  // Process products with limited concurrency
  const limit = pLimit(Number(IMG_CONCURRENCY));
  let done = 0;

  await Promise.all(
    products.map(prod =>
      limit(async () => {
        const description = await describeImages(prod);
        const embedding = await embed(description);
        const classificationResult = await classifyWithImages(description, prod.title, categories, userTypes, softCategories, prod.images);
        const gptCategory = classificationResult.category;
        let productType = classificationResult.type || [];
        let softCategory = classificationResult.softCategory || [];

        await log(`✅ Classification for ${prod.title}: Category: ${gptCategory.join(', ')}, Types: ${productType.join(', ')}, Soft Category: ${softCategory.join(', ')}`);

        const price = prod.priceRange?.minVariantPrice?.amount || 0;
        const image = prod.images?.edges?.[0]?.node?.src || null;
        const url = prod.onlineStoreUrl || `https://${shopifyDomain}.myshopify.com/products/${prod.handle}`;

        const updateData = {
          ...prod, // Spread the complete product JSON
          name: prod.title,
          description1: description,
          embedding,
          category: gptCategory,
          type: productType,
          softCategory: softCategory,
          price: parseFloat(price),
          image,
          url,
          fetchedAt: new Date()
        };

        await productsCol.updateOne(
          { id: prod.id },
          { $set: updateData },
          { upsert: true }
        );

        // Update progress
        done += 1;
        await statusCol.updateOne({ dbName }, { $set: { done } });
      })
    )
  );

  // Mark job as done
  await statusCol.updateOne(
    { dbName },
    { $set: { state: "done", finishedAt: new Date(), done: products.length } }
  );

  await client.close();
}