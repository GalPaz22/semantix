import { MongoClient } from "mongodb";
import { GraphQLClient, gql } from "graphql-request";
import pLimit from "p-limit";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { parse } from "node-html-parser";
import { GoogleGenAI } from '@google/genai';
import { appendLogs } from './syncStatus-esm.js';

const {
  MONGODB_URI,
  OPENAI_API_KEY,
  GOOGLE_AI_API_KEY,
  IMG_CONCURRENCY = "3"
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY }); // eslint-disable-line no-unused-vars
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
  apiKey: OPENAI_API_KEY
});

const ai = GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== "YOUR_GOOGLE_AI_KEY" 
  ? new GoogleGenAI({apiKey: GOOGLE_AI_API_KEY})
  : null;

async function embed(text) {
  try { return await embeddings.embedQuery(text); }
  catch (e) { console.warn("Embedding failed:", e); return null; }
}

async function classify(text, name, categories, types, softCategories) {
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];

  const categoryList = categoriesArray.join(", ");
  const typeList = typesArray.join(", ");
  const softCategoryList = softCategoriesArray.join(", ");

  if (!ai) { console.warn("Google AI client not initialized - basic classification"); return { category: [], type: [], softCategory: [] }; }

  const messages = [
    {
      role: "user",
      parts: [{
        text: `You are an AI e-commerce assistant. Classify the product based on its description.
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
      model: "gemini-2.5-flash-lite",
      contents: messages,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingBudget: 0
        }
      },
    });

    let result;
    if (response.candidates?.[0]?.content?.parts?.length) {
      result = response.candidates[0].content.parts[0].text;
    } else if (response.response?.candidates?.[0]?.content?.parts?.length) {
      result = response.response.candidates[0].content.parts[0].text;
    }
    if (!result) throw new Error("No valid response from Gemini");

    let jsonString = result.trim();
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) jsonString = codeBlockMatch[1].trim();
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/); if (jsonMatch) jsonString = jsonMatch[0];
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
  } catch (e) {
    console.warn("Gemini classification failed:", e);
    return { category: [], type: [], softCategory: [] };
  }
}

function parseHtmlToPlainText(html) {
  const root = parse(html || "");
  return root.textContent.trim();
}

function toPlainMoney(x) { try { return x != null ? parseFloat(x) : null; } catch { return null; } }

function gidToNumeric(gid) {
  // gid://shopify/ProductVariant/123456789 -> 123456789
  if (!gid) return null;
  const parts = String(gid).split('/');
  return parts[parts.length - 1] || null;
}

export default async function processShopifyDescriptions({ shopifyDomain, shopifyToken, dbName, categories, type: userTypes, softCategories }) {
  const logs = [];
  const log = async (message) => {
    logs.push(message);
    await appendLogs(dbName, [message]);
  };

  await log(`🚀 Starting Shopify processing for database: ${dbName}`);

  const validUserTypes = Array.isArray(userTypes) ? userTypes : [];
  await log(`🏷️ User types: ${validUserTypes.length > 0 ? validUserTypes.join(', ') : 'none'}`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(dbName);
  const productsCol = db.collection("products");
  const statusCol = db.collection("sync_status");

  await statusCol.updateOne(
    { dbName },
    { $set: { state: "running", startedAt: new Date(), done: 0, total: 0 } },
    { upsert: true }
  );

  const cleanDomain = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const fullDomain = cleanDomain.includes('.myshopify.com') ? cleanDomain : `${cleanDomain}.myshopify.com`;

  const clientGraphQL = new GraphQLClient(`https://${fullDomain}/admin/api/2023-10/graphql.json`, {
    headers: {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json',
      'User-Agent': 'Semantix/1.1'
    },
    timeout: 30000,
    agent: new (await import('https')).Agent({ rejectUnauthorized: true, secureProtocol: 'TLS_method', minVersion: 'TLSv1.2' })
  });

  // NOTE: use descriptionHtml in the Admin GraphQL, then parse to text
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
            images(first: 30) {
              edges { node { id src: url altText } }
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  sku
                  title
                  price
                  compareAtPrice
                  image { id src: url altText }
                  selectedOptions { name value }
                }
              }
            }
            priceRange { minVariantPrice { amount } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const variables = { first: 100, after: cursor };
    const data = await clientGraphQL.request(query, variables);
    const productsBatch = data.products.edges.map(edge => edge.node);
    allProducts.push(...productsBatch);
    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  const products = allProducts;
  await statusCol.updateOne({ dbName }, { $set: { total: products.length } });

  const limit = pLimit(Number(IMG_CONCURRENCY));
  let done = 0;

  await Promise.all(products.map(prod => limit(async () => {
    // 1) Clean the original description (remove HTML, extra whitespace)
    const rawDescription = prod.descriptionHtml || "";
    const cleanedDescription = parseHtmlToPlainText(rawDescription).trim();
    
    // 2) For Shopify, we could potentially add metadata here if available
    // Currently Shopify doesn't provide metadata in the same way as WooCommerce
    // But we could add product type, vendor, tags, etc.
    let metadataAppend = '';
    if (prod.productType) {
      metadataAppend += `Product Type: ${prod.productType}\n`;
    }
    if (prod.vendor) {
      metadataAppend += `Vendor: ${prod.vendor}\n`;
    }
    if (prod.tags && prod.tags.length > 0) {
      metadataAppend += `Tags: ${prod.tags.join(', ')}\n`;
    }
    
    // 3) Create enriched description (Shopify descriptions are typically already in English)
    const enrichedDescription = `${cleanedDescription}\n\n${metadataAppend}`.trim();
    
    const embedding = await embed(enrichedDescription);
    const classification = await classify(enrichedDescription, prod.title, categories, validUserTypes, softCategories);
    const category = classification?.category || null;
    const types = classification?.type || [];
    const softCategory = classification?.softCategory || [];

    await log(`✅ Classification for ${prod.title}: ${category || 'None'}, Types: ${types.join(', ') || 'None'}, Soft Categories: ${softCategory.join(', ') || 'None'}`);

    const price = prod.priceRange?.minVariantPrice?.amount || 0;
    const baseUrl = prod.onlineStoreUrl || `https://${fullDomain}/products/${prod.handle}`;
    const mainImage = prod.images?.edges?.[0]?.node?.src || null;

    // Build normalized variants
    const variantEdges = prod.variants?.edges || [];
    const variants = variantEdges.map(({ node }) => {
      const numericId = gidToNumeric(node.id);
      const url = numericId ? `${baseUrl}?variant=${numericId}` : baseUrl;
      const optMap = Object.fromEntries((node.selectedOptions || []).map(o => [o.name?.toLowerCase(), o.value]));
      const size = optMap['size'] || optMap['eu size'] || optMap['us size'] || null;
      const color = optMap['color'] || optMap['colour'] || null;
      return {
        id: node.id,
        numericId,
        title: node.title,
        sku: node.sku || null,
        price: toPlainMoney(node.price),
        compareAtPrice: toPlainMoney(node.compareAtPrice),
        image: node.image?.src || null,
        url,
        size,
        color,
        options: node.selectedOptions || []
      };
    });

    // Aggregate sizes (unique, keep sort by numeric where possible)
    const sizesSet = new Set(variants.map(v => v.size).filter(Boolean));
    const sizes = Array.from(sizesSet).sort((a,b)=>{
      const na = parseFloat(a); const nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb; // numeric sizes
      return String(a).localeCompare(String(b));
    });

    const updateData = {
      ...prod,
      name: prod.title,
      description1: enrichedDescription, // Use enriched description
      embedding,
      category,
      type: types,
      softCategory: softCategory,
      price: parseFloat(price),
      url: baseUrl,
      image: mainImage,
      images: (prod.images?.edges || []).map(e => e.node?.src).filter(Boolean),
      variants,
      sizes, // <- for quick rendering in cards
      fetchedAt: new Date()
    };

    await productsCol.updateOne(
      { id: prod.id },
      { $set: updateData },
      { upsert: true }
    );

    done += 1;
    await statusCol.updateOne({ dbName }, { $set: { done } });
  })));

  await statusCol.updateOne(
    { dbName },
    { $set: { state: "done", finishedAt: new Date(), done: products.length } }
  );

  await client.close();
}
