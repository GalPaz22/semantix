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

/** Translate description using Gemini AI with image context */
async function translateDescription(description, productName = "", images = []) {
  console.log("🌐 Translation input length:", description?.length || 0);
  console.log("🖼️ Images provided:", images?.length || 0);
  
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

    // Process images (first 3) for vision analysis
    let imageParts = [];
    if (images && Array.isArray(images) && images.length > 0) {
      const validImages = images.slice(0, 3).filter(img => img && img.src);
      if (validImages.length > 0) {
        console.log(`🔍 Processing ${validImages.length} images for translation context`);
        try {
          const imagePromises = validImages.map(async (img) => {
            try {
              const response = await fetch(img.src);
              if (!response.ok) return null;
              const buffer = await response.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');
              const mimeType = response.headers.get('content-type') || 'image/jpeg';
              return { data: base64, mimeType };
            } catch (err) {
              console.warn(`Failed to fetch image ${img.src}:`, err.message);
              return null;
            }
          });
          const imageResults = await Promise.all(imagePromises);
          const validBase64Images = imageResults.filter(result => result !== null);
          
          imageParts = validBase64Images.map(img => ({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data
            }
          }));
          
          console.log(`✅ Successfully processed ${imageParts.length} images for translation`);
        } catch (err) {
          console.warn("Failed to process images:", err.message);
        }
      }
    }

    const productContext = productName ? `\nProduct Name: ${productName}\n` : '';
    const imageContext = imageParts.length > 0 ? '\nAnalyze the provided product images along with the text to create a comprehensive description.' : '';

    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `You are an expert e-commerce product analyst. Create a comprehensive, keyword-rich product description in English.

ANALYZE:
1. Text Content: Translate and enhance the provided description
2. Visual Details: If images provided, incorporate colors, materials, design elements you observe
3. Key Features: Extract and emphasize unique characteristics and benefits
4. Search Optimization: Include relevant keywords customers would use

RULES:
- Write in clear, natural, flowing English (not bullet points)
- Preserve ALL information from original text - do not shorten
- If images provided, mention specific visual details (colors, materials, style)
- Keep it factual and objective - no marketing hype
- Focus on searchable keywords
- Length: 100-200 words
- Do NOT include: price, brand name, category names, or metadata
${productContext}
Text to translate and enhance:
${description}${imageContext}`
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
          thinkingBudget: 3000  // Balanced: good quality but cost-effective
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
        text: `You are an expert product classifier. Analyze this product and assign accurate categories, types, and soft categories.

CLASSIFICATION FIELDS:
1. **Category** [Main product category - choose ALL that clearly apply]
   Available: [${categoryList}]
   
2. **Type** [Product characteristics/attributes - choose ALL that apply]
   Available: [${typeList}]
   
3. **Soft Category** [Flexible search tags - be GENEROUS, include ALL relevant tags]
   Available: [${softCategoryList}]

RULES:
✓ Analyze the description carefully to identify key features and characteristics
✓ Be generous with soft categories - include all relevant search terms
✓ For categories and types, be selective - only clear, confident matches
✓ ONLY use values from the provided lists - do NOT invent new ones
✓ Return empty array [] if no clear match exists
✓ Multiple selections are encouraged when appropriate

Product Name: ${name}
Description:
${text}

Return ONLY a JSON object with this exact structure:
{"category": ["Category1"], "type": ["Type1", "Type2"], "softCategory": ["Tag1", "Tag2", "Tag3"]}`
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
          thinkingBudget: 2000  // Moderate thinking for better accuracy
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

  // NOTE: use description field to get plain text directly
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
            description
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
    // 1) Use the plain text description directly
    const rawDescription = prod.description || "";
    const cleanedDescription = rawDescription.trim();
    
    // 2) Extract images for context (first 3)
    const productImages = (prod.images?.edges || [])
      .slice(0, 3)
      .map(edge => ({
        src: edge.node?.src,
        altText: edge.node?.altText
      }))
      .filter(img => img.src);
    
    // 3) Translate and enhance the description with image context
    const translatedDescription = await translateDescription(cleanedDescription, prod.title, productImages);
    if (!translatedDescription) {
      await log(`⚠️ Skipping ${prod.title} - translation failed`);
      done += 1;
      await statusCol.updateOne({ dbName }, { $set: { done } });
      return;
    }
    
    // 4) Build structured metadata enrichment
    let metadataAppend = '';
    
    // Add product type if exists
    if (prod.productType) {
      metadataAppend += `\nProduct Type: ${prod.productType}`;
    }
    
    // Add vendor/brand if exists
    if (prod.vendor) {
      metadataAppend += `\nBrand: ${prod.vendor}`;
    }
    
    // Extract and add variant information (colors, sizes)
    const variantEdgesForMetadata = prod.variants?.edges || [];
    if (variantEdgesForMetadata.length > 0) {
      // Extract unique colors and sizes from variants
      const colors = new Set();
      const sizes = new Set();
      
      variantEdgesForMetadata.forEach(({ node }) => {
        const options = node.selectedOptions || [];
        options.forEach(opt => {
          const name = opt.name?.toLowerCase();
          const value = opt.value;
          if (name === 'color' || name === 'colour' || name === 'צבע') {
            colors.add(value);
          } else if (name === 'size' || name === 'מידה') {
            sizes.add(value);
          }
        });
      });
      
      if (colors.size > 0) {
        metadataAppend += `\nAvailable Colors: ${Array.from(colors).join(', ')}`;
      }
      if (sizes.size > 0) {
        metadataAppend += `\nAvailable Sizes: ${Array.from(sizes).join(', ')}`;
      }
    }
    
    // Add tags if exists (limit to first 5 most relevant)
    if (prod.tags && prod.tags.length > 0) {
      const relevantTags = prod.tags.slice(0, 5);
      metadataAppend += `\nTags: ${relevantTags.join(', ')}`;
    }
    
    // 5) Create final enriched description with translated text + structured metadata
    const enrichedDescription = `${translatedDescription}${metadataAppend}`.trim();
    
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
      price: parsePrice(price),
      url: baseUrl,
      image: mainImage,
      images: (prod.images?.edges || []).map(e => e.node?.src).filter(Boolean),
      variants,
      sizes, // <- for quick rendering in cards
      fetchedAt: new Date(),
      active: prod.status === 'ACTIVE'
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
