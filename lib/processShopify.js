import { MongoClient } from "mongodb";
import { GraphQLClient, gql } from "graphql-request";
import pLimit from "p-limit";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { parse } from "node-html-parser";
import clientPromise from './mongodb';

// Environment variables
const {
  MONGODB_URI,
  OPENAI_API_KEY,
  IMG_CONCURRENCY = "3" // how many products to process in parallel
} = process.env;

/* ---------- OpenAI helpers --------------------------------------- */
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
  apiKey: OPENAI_API_KEY
});

async function embed(text) {
  try {
    return await embeddings.embedQuery(text);
  } catch (e) {
    console.warn("Embedding failed:", e);
    return null;
  }
}

async function classify(text, name, categories, types) {
  const categoryList = categories.join(", ");
  const typeList = types.join(", ");

  const prompt = `You are an advanced AI model specialized in e-commerce. Your task is to classify a product based on the details provided.
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
{"category": "T-Shirts", "type": ["Men", "On Sale"]}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  try {
    const out = JSON.parse(res.choices?.[0]?.message?.content?.trim() || '{}');
    // Final validation to prevent hallucinated values
    if (out.category && !categories.includes(out.category)) {
      out.category = null;
    }
    if (out.type && Array.isArray(out.type)) {
      out.type = out.type.filter(t => types.includes(t));
    } else {
      out.type = [];
    }
    return out;
  } catch (e) {
    console.warn("Could not parse classification JSON:", e);
    return { category: null, type: [] };
  }
}

/* Helper to convert HTML to plain text */
function parseHtmlToPlainText(html) {
  // Use node-html-parser to remove any HTML tags
  const root = parse(html || "");
  return root.textContent.trim();
}

/* ----------------------------------------------------------------- */

/**
 * Process Shopify product descriptions.
 * Instead of analyzing images, this function analyzes the product description.
 *
 * @param {object} params
 * @param {string} params.shopifyDomain - The shop's domain (e.g., "mystore")
 * @param {string} params.shopifyToken - Shopify Admin API token
 * @param {string} params.dbName - MongoDB database name
 * @param {array}  params.categories - Array of categories for classification
 * @param {array}  params.type - Array of types for classification
 */
export default async function processShopifyDescriptions({ shopifyDomain, shopifyToken, dbName, categories, type: userTypes }) {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log(shopifyDomain, shopifyToken, dbName, categories, userTypes);

  const db = client.db(dbName);
  const productsCol = db.collection("products");
  const statusCol = db.collection("sync_status");

  // Mark job as running
  await statusCol.updateOne(
    { dbName },
    { $set: { state: "running", startedAt: new Date(), done: 0, total: 0 } },
    { upsert: true }
  );

  // Initialize GraphQL client with proper SSL configuration
  const cleanDomain = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const fullDomain = cleanDomain.includes('.myshopify.com') ? cleanDomain : `${cleanDomain}.myshopify.com`;
  
  const clientGraphQL = new GraphQLClient(`https://${fullDomain}/admin/api/2023-10/graphql.json`, {
    headers: {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json',
      'User-Agent': 'Semantix/1.0'
    },
    timeout: 30000, // 30 second timeout
    agent: new (await import('https')).Agent({
      rejectUnauthorized: true,
      secureProtocol: 'TLS_method',
      minVersion: 'TLSv1.2'
    })
  });

  // GraphQL query to fetch products including product description (bodyHtml)
  const query = gql`
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            onlineStoreUrl
            handle
            bodyHtml
            priceRange {
              minVariantPrice {
                amount
              }
            }
          }
        }
      }
    }
  `;
  const data = await clientGraphQL.request(query, { first: 100 });
  const products = data.products.edges.map(edge => edge.node);

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
        // Extract and clean up the product description from HTML
        const rawDescription = prod.bodyHtml || "";
        const description = parseHtmlToPlainText(rawDescription);
        const embedding = await embed(description);
        const classification = await classify(description, prod.title, categories, userTypes);
        const category = classification?.category;
        const types = classification?.type || [];
        const price = prod.priceRange?.minVariantPrice?.amount || 0;
        // Use onlineStoreUrl if available, otherwise build a URL using shopifyDomain and product handle
        const url = prod.onlineStoreUrl || `https://${fullDomain}/products/${prod.handle}`;

        await productsCol.updateOne(
          { id: prod.id },
          {
            $set: {
              name: prod.title,
              description1: description,
              embedding,
              category,
              type: types,
              price: Number(price),
              url,
              fetchedAt: new Date()
            }
          },
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