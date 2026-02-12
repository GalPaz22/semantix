import { MongoClient } from "mongodb";
import { GraphQLClient, gql } from "graphql-request";
import pLimit from "p-limit";
import { appendLogs } from './syncStatus-esm.js';
import { embed, callGemini } from './shared/ai.js';
import { parsePrice, gidToNumeric } from './shared/utils.js';

const { MONGODB_URI, IMG_CONCURRENCY = "3" } = process.env;

/** Translate description using Gemini AI with image context */
async function translateDescription(description, productName = "", images = []) {
  console.log("🌐 Translation input length:", description?.length || 0);
  console.log("🖼️ Images provided:", images?.length || 0);
  
  if (!description || description.trim() === "") {
    console.log("❌ No description provided to translate");
    return null;
  }

  try {
    // callGemini returns null if AI not available - handled below

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

    const result = await callGemini({
      contents: messages,
      responseMimeType: "text/plain",
      thinkingBudget: 1024
    });
    
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

async function classify(text, name, categories, types, softCategories, colors) {
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
  const colorsArray = Array.isArray(colors) ? colors : [];

  const categoryList = categoriesArray.join(", ");
  const typeList = typesArray.join(", ");
  const softCategoryList = softCategoriesArray.join(", ");
  const colorList = colorsArray.join(", ");

  const colorsField = colorsArray.length > 0
    ? `\n4. **Colors** [Product colors - choose ALL that apply]\n   Available: [${colorList}]`
    : '';
  const colorsExample = colorsArray.length > 0 ? ', "colors": []' : '';

  const prompt = `You are an expert product classifier. Analyze this product and assign accurate categories, types, soft categories${colorsArray.length > 0 ? ', and colors' : ''}.

CLASSIFICATION FIELDS:
1. **Category** [Main product category - choose ALL that clearly apply]
   Available: [${categoryList}]
   
2. **Type** [Product characteristics/attributes - choose ALL that apply]
   Available: [${typeList}]
   
3. **Soft Category** [Flexible search tags - be GENEROUS, include ALL relevant tags]
   Available: [${softCategoryList}]
${colorsField}

RULES:
✓ ONLY use values from the provided lists - do NOT invent new ones
✓ Return empty array [] if no clear match exists

Product Name: ${name}
Description:
${text}

Return ONLY a JSON object: {"category": [], "type": [], "softCategory": []${colorsExample}}`;

  try {
    const result = await callGemini({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      responseMimeType: "application/json",
      thinkingBudget: 0
    });
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
    if (out.colors && Array.isArray(out.colors)) {
      out.colors = out.colors.filter(c => colorsArray.includes(c));
    } else {
      out.colors = [];
    }
    return out;
  } catch (e) {
    console.warn("Gemini classification failed:", e);
    return { category: [], type: [], softCategory: [], colors: [] };
  }
}

function toPlainMoney(x) { try { return x != null ? parseFloat(x) : null; } catch { return null; } }

export default async function processShopifyDescriptions({ shopifyDomain, shopifyToken, dbName, categories, type: userTypes, softCategories, colors }) {
  const logs = [];
  const log = async (message) => {
    console.log(message);
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
  // Includes full stock/inventory fields to match image mode query
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
            totalInventory
            tracksInventory
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
                  inventoryQuantity
                  inventoryPolicy
                  availableForSale
                  image { id src: url altText }
                  selectedOptions { name value }
                }
              }
            }
            priceRange {
              minVariantPrice { amount }
              maxVariantPrice { amount }
            }
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
    const validColors = Array.isArray(colors) ? colors : [];
    const classification = await classify(enrichedDescription, prod.title, categories, validUserTypes, softCategories, validColors);
    const category = classification?.category || null;
    const types = classification?.type || [];
    const softCategory = classification?.softCategory || [];
    const productColors = classification?.colors || [];

    await log(`✅ ${prod.title}: Cat: ${category || 'None'} | Types: ${types.join(', ') || 'None'} | Soft: ${softCategory.join(', ') || 'None'} | Colors: ${productColors.join(', ') || 'None'}`);

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

    // Determine stock status based on product status + variant inventory
    const isActive = prod.status === 'ACTIVE';
    let stockStatus = 'outofstock';
    if (isActive) {
      // Check if any variant is available for sale
      const hasAvailableVariant = variantEdges.some(({ node }) => {
        if (node.availableForSale) return true;
        if (typeof node.inventoryQuantity === 'number' && node.inventoryQuantity > 0) return true;
        return false;
      });
      // Fallback: check totalInventory at product level
      if (hasAvailableVariant || (typeof prod.totalInventory === 'number' && prod.totalInventory > 0)) {
        stockStatus = 'instock';
      }
      // If product doesn't track inventory but is active, assume in stock
      if (prod.tracksInventory === false) {
        stockStatus = 'instock';
      }
    }

    const updateData = {
      ...prod,
      name: prod.title,
      description1: enrichedDescription,
      embedding,
      category,
      type: types,
      softCategory: softCategory,
      colors: productColors,
      price: parsePrice(price),
      url: baseUrl,
      image: mainImage,
      images: (prod.images?.edges || []).map(e => e.node?.src).filter(Boolean),
      variants,
      sizes,
      stockStatus, // proper stock status based on inventory data
      fetchedAt: new Date(),
      active: isActive
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
