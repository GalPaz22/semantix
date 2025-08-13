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

async function classify(text, name, categories, types) {
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  if (!ai) { console.warn("Google AI client not initialized - basic classification"); return { category: null, type: [] }; }

  const messages = [{
    role: "user",
    parts: [{
      text: `You are an advanced AI model specialized in e-commerce. Your task is to classify a product based on the details provided.
1) Choose a category (or array) for the product from: [${categoriesArray.join(", ")}]. If none apply, category=null.
2) For "type", select zero or more values from: [${typesArray.join(", ")}].\n\nProduct Details:\n${text}\n\nProduct Name:\n${name}\n\nReturn ONLY JSON: {"category":"...","type":["..."]}`
    }]
  }];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: messages,
      generationConfig: { responseMimeType: "application/json" },
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

    if (out.category && !categoriesArray.includes(out.category)) out.category = null;
    if (Array.isArray(out.type)) out.type = out.type.filter(t => typesArray.includes(t)); else out.type = [];
    return out;
  } catch (e) {
    console.warn("Gemini classification failed:", e);
    return { category: null, type: [] };
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

export default async function processShopifyDescriptions({ shopifyDomain, shopifyToken, dbName, categories, type: userTypes }) {
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
    const rawDescription = prod.descriptionHtml || ""; // FIX: was bodyHtml
    const description = parseHtmlToPlainText(rawDescription);
    const embedding = await embed(description);
    const classification = await classify(description, prod.title, categories, validUserTypes);
    const category = classification?.category || null;
    const types = classification?.type || [];

    await log(`✅ Classification for ${prod.title}: ${category || 'None'}, Types: ${types.join(', ') || 'None'}`);

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
      description1: description,
      embedding,
      category,
      type: types,
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
