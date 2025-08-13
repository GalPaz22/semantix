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

async function describeImages(product) {
  // Check if Gemini AI is available
  if (!ai) {
    console.warn("Google AI client not initialized - falling back to basic description");
    return `Product: ${product.title}. Description not available due to missing AI configuration.`;
  }

  const validImages = (product.images?.edges || [])
    .map(edge => edge.node)
    .filter(img => isValidImageUrl(img.originalSrc))
    .slice(0, 3); // Limit to first 3 images for performance

  if (validImages.length === 0) {
    return `Product: ${product.title}. No valid images available for analysis.`;
  }

  try {
    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `Describe the main product details visible in the images for "${product.title}". Focus on design, shape, colors and unique attributes. Be concise and factual.`
          },
          ...validImages.map(img => ({
            inlineData: {
              mimeType: "image/jpeg", // Assume JPEG, Gemini will handle various formats
              data: img.originalSrc // Gemini can handle URLs directly
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
{"category": "T-Shirts", "type": ["Men", "On Sale"]}`
      }]
    }
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages,
      generationConfig: {
        responseMimeType: "application/json",
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


export default async function processShopifyImages({ shopifyDomain, shopifyToken, dbName, categories, type: userTypes }) {
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

  // Setup GraphQL Client for Shopify
// Using storeConfig to build the correct endpoint
const endpoint = `https://${shopifyDomain}.myshopify.com/admin/api/2025-01/graphql.json`;
const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    'X-Shopify-Access-Token': shopifyToken,
    'Content-Type': 'application/json',
  },
});

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
        const classification = await classify(description, prod.title, categories, validUserTypes);
        const category = classification?.category;
        const types = classification?.type || [];

        await log(`✅ Classification for ${prod.title}: ${category || 'None'}, Types: ${types.join(', ') || 'None'}`);

        const price = prod.priceRange?.minVariantPrice?.amount || 0;
        const image = prod.images?.edges?.[0]?.node?.src || null;
        const url = prod.onlineStoreUrl || `https://${shopifyDomain}.myshopify.com/products/${prod.handle}`;

        const updateData = {
          ...prod, // Spread the complete product JSON
          name: prod.title,
          description1: description,
          embedding,
          category,
          type: types,
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