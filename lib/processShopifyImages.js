import { MongoClient } from "mongodb";
import { GraphQLClient, gql } from "graphql-request";
import pLimit from "p-limit";
import { appendLogs } from './syncStatus-esm.js';
import { embed, callGemini, summarizeMetadata } from './shared/ai.js';
import { parsePrice, parseHtmlToPlainText, isValidImageUrl, retryWithBackoff, gidToNumeric } from './shared/utils.js';
import { fetchImageAsBase64, fetchImageWithPuppeteer, closeBrowser } from './shared/browser.js';

const { MONGODB_URI, IMG_CONCURRENCY = "3" } = process.env;

/** Translate description using Gemini AI */
async function translateDescription(description) {
  if (!description || description.trim() === "") return null;
  try {
    const result = await callGemini({
      contents: [{ role: "user", parts: [{ text: `Translate the following text to English:\n\n${description}` }] }],
      responseMimeType: "text/plain",
      thinkingBudget: 0
    });
    return result?.trim() || description;
  } catch (error) {
    console.error("Translation error:", error.message);
    return description;
  }
}

// summarizeMetadata imported from shared/ai.js

// fetchImageAsBase64, fetchImageWithPuppeteer imported from shared/browser.js

async function describeImages(product) {
  const validImages = (product.images?.edges || [])
    .map(edge => edge.node)
    .filter(img => isValidImageUrl(img.src))
    .slice(0, 3);

  if (validImages.length === 0) {
    return `Product: ${product.title}. No valid images available for analysis.`;
  }

  try {
    const imagePromises = validImages.map(img => fetchImageAsBase64(img.src));
    const imageResults = await Promise.all(imagePromises);
    const validBase64Images = imageResults.filter(r => r !== null);
    if (validBase64Images.length === 0) return `Product: ${product.title}. Failed to fetch images.`;

    const result = await callGemini({
      contents: [{
        role: "user",
        parts: [
          { text: `Describe the main product details visible in the images for "${product.title}". Focus on design, shape, colors and unique attributes. Be concise and factual.` },
          ...validBase64Images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
        ]
      }],
      responseMimeType: "text/plain",
      thinkingBudget: 0
    });
    return result?.trim() || `Product: ${product.title}. Image analysis completed but no description generated.`;
  } catch (error) {
    console.warn("Gemini image description failed:", error.message);
    return `Product: ${product.title}. Image analysis failed: ${error.message}`;
  }
}

async function classifyWithImages(text, name, categories, types, softCategories, colors, images, variants = [], context) {
  // Ensure categories and types are arrays
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const typesArray = Array.isArray(types) ? types : [];
  const softCategoriesArray = Array.isArray(softCategories) ? softCategories : [];
  const colorsArray = Array.isArray(colors) ? colors : [];

  const categoryList = categoriesArray.join(", ");
  const typeList = typesArray.join(", ");
  const softCategoryList = softCategoriesArray.join(", ");
  const colorList = colorsArray.join(", ");

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
          text: `You are an expert product classifier. Analyze this product using ALL available information to assign accurate categories, types, soft categories, and colors.

ANALYZE CAREFULLY:
- IMAGES: Visual appearance, colors, style, materials, design elements
- DESCRIPTION: Features, materials, use case, target audience
- VARIANTS: Available sizes, colors, options (this confirms what's actually available)
- CONTEXT: Business type and target market${contextPrompt}

CLASSIFICATION FIELDS:
1. **Category** [Main product category - choose ALL that clearly apply]
   Available: [${categoryList}]
   
2. **Type** [Product characteristics/attributes - choose ALL that apply]
   Available: [${typeList}]
   
3. **Soft Category** [Flexible search tags - be GENEROUS, include ALL relevant tags]
   Available: [${softCategoryList}]
${colorsArray.length > 0 ? `
4. **Colors** [Select ONLY the primary or dominant colors of the product. Ignore minor accents, small details, or tiny stripes (e.g., if a shirt is white with a small blue logo, select ONLY "White").]
   Available: [${colorList}]` : ''}

CLASSIFICATION RULES:
✓ Use the IMAGES to identify visual characteristics (colors, style, materials, patterns)
✓ Use VARIANTS to confirm available options
✓ Be generous with soft categories - include all relevant search terms customers might use
✓ For categories and types, be more selective - only clear, confident matches${colorsArray.length > 0 ? '\n✓ For colors, select ONLY the DOMINANT or primary colors. Avoid selecting a color if it only appears as a minor accent.' : ''}
✓ ONLY use values from the provided lists - do NOT invent new ones
✓ Return empty array [] if no clear match exists
✓ Multiple selections are encouraged when appropriate

Product Name: ${name}
Description:
${text}${variantInfo}

Return ONLY a JSON object with this exact structure:
{"category": ["Category1", "Category2"], "type": ["Type1", "Type2"], "softCategory": ["Tag1", "Tag2", "Tag3"]${colorsArray.length > 0 ? ', "colors": ["MainColor"]' : ''}}`
        },
        ...imageParts // Add the processed images here
      ]
    }
  ];

  try {
    const result = await callGemini({
      contents: messages,
      responseMimeType: "application/json",
      thinkingBudget: 0
    });
    if (!result) throw new Error("No valid response from Gemini");

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

    // Validate colors
    if (out.colors && Array.isArray(out.colors)) {
      out.colors = out.colors.filter(c => colorsArray.includes(c));
    } else {
      out.colors = [];
    }

    return out;

  } catch (error) {
    console.warn(`Image-based classification failed for ${name}:`, error);
    return { category: [], type: [], softCategory: [] };
  }
}

async function generateEnglishDescriptionWithVision(originalText, productName, images, metadata, categories, context) {
  let generatedDescription = originalText;

  try {
    let imageParts = [];
    if (images && Array.isArray(images) && images.length > 0) {
      const validImages = images.filter(img => img && img.src && isValidImageUrl(img.src));
      if (validImages.length > 0) {
        const imagePromises = validImages.slice(0, 3).map(img => fetchImageAsBase64(img.src));
        const imageResults = await Promise.all(imagePromises);
        imageParts = imageResults.filter(r => r !== null).map(img => ({
          inlineData: { mimeType: img.mimeType, data: img.data }
        }));
      }
    }

    const contextPrompt = context ? `\n\nBusiness Context: ${context}` : '';

    const result = await callGemini({
      contents: [{
        role: "user",
        parts: [
          {
            text: `You are an expert e-commerce product analyst. Create a comprehensive, keyword-rich product description in English for semantic search.

ANALYZE IMAGES AND TEXT:
1. Visual Details: Colors, materials, textures, patterns, design elements
2. Product Features: Functionality, unique characteristics
3. Style: Modern/classic, casual/formal, elegant/sporty
4. Use Cases: Target audience, occasions

RULES:
- Clear, natural English, 100-200 words
- Include visual details from images
- Factual, keyword-rich, no marketing hype
- Do NOT include: price, brand name, category, metadata${contextPrompt}

Product Name: ${productName}
Original Text:
${originalText}

Provide ONLY the product description.` },
          ...imageParts
        ]
      }],
      responseMimeType: "text/plain",
      thinkingBudget: 1024
    });

    if (result) generatedDescription = result.trim();
  } catch (error) {
    console.warn(`Failed to generate description for ${productName}:`, error.message);
  }

  // Format metadata nicely for human readability and search optimization
  let metadataAppend = '';
  if (metadata) {
    if (metadata.productType) {
      metadataAppend += `\nProduct Type: ${metadata.productType}`;
    }
    if (metadata.vendor) {
      metadataAppend += `\nBrand: ${metadata.vendor}`;
    }
    if (metadata.availableColors && metadata.availableColors.length > 0) {
      metadataAppend += `\nAvailable Colors: ${metadata.availableColors.join(', ')}`;
    }
    if (metadata.availableSizes && metadata.availableSizes.length > 0) {
      metadataAppend += `\nAvailable Sizes: ${metadata.availableSizes.join(', ')}`;
    }
    if (metadata.tags && metadata.tags.length > 0) {
      metadataAppend += `\nTags: ${metadata.tags.join(', ')}`;
    }
  }

  return `${generatedDescription}${metadataAppend}`.trim();
}

// parsePrice imported from shared/utils.js

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

  // If product doesn't track inventory, we can check if tracksInventory is false
  if (product.tracksInventory === false) {
    return true;
  }

  // If no inventory info available, assume out of stock for safety
  return false;
}

/* ----------------------------------------------------------------- */


export default async function processShopifyImages({ shopifyDomain, shopifyToken, dbName, categories, userTypes, softCategories, colors, context }) {
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
    console.log(message);
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
            description
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

  // Step 2: Filter for AI processing (all products without embeddings)
  console.log('🔍 Step 2: Filtering for all products that need AI processing...');
  const productsWithoutEmbeddings = [];

  for (const product of products) {
    const existingProduct = await productsCol.findOne({ id: product.id });
    if (!existingProduct || !existingProduct.embedding) {
      productsWithoutEmbeddings.push(product);
    }
  }

  console.log(`📊 AI Processing Summary:`);
  console.log(`  🔄 Products needing AI processing: ${productsWithoutEmbeddings.length}`);
  console.log(`  ⏭️ Products already processed: ${products.length - productsWithoutEmbeddings.length}`);
  console.log(`  📦 Total products in database: ${products.length}`);

  await statusCol.updateOne(
    { dbName },
    { $set: { total: productsWithoutEmbeddings.length } }
  );

  // Process all products with limited concurrency
  console.log('🚀 Starting AI processing for ALL products...');
  const limit = pLimit(Number(IMG_CONCURRENCY));
  let done = 0;

  await Promise.all(
    productsWithoutEmbeddings.map(prod =>
      limit(async () => {
        console.log(`🔍 Processing product: ${prod.title} (${done + 1}/${productsWithoutEmbeddings.length})`);

        // 1) Process variants first to get structured data
        const variantData = processShopifyVariants(prod);
        console.log(`🔧 Processed variants for ${prod.title}: ${variantData.variants.length} variants, ${variantData.sizes.length} sizes, ${variantData.colors.length} colors`);

        // 2) Use the plain text description directly
        const rawDescription = prod.description || "";
        const cleanedDescription = rawDescription.trim();

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
          colors,
          productImages,
          variantData.variants, // Pass processed variants to classification
          context // Pass context here
        );

        const gptCategory = classificationResult.category || [];
        let productType = classificationResult.type || [];
        let softCategory = classificationResult.softCategory || [];
        const productColors = classificationResult.colors || [];

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

        await log(`✅ ${prod.title}: Cat: ${gptCategory.join(', ') || 'None'} | Types: ${productType.join(', ') || 'None'} | Soft: ${softCategory.join(', ') || 'None'} | Colors: ${productColors.join(', ') || 'None'}${onSale ? ' [ON SALE]' : ''}`);

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
          colors: productColors,
          price: price,
          image,
          url,
          stockStatus: stockStatus, // Add Shopify-compatible stock status
          onSale: onSale, // Add onSale flag
          active: prod.status === 'ACTIVE',
          // Add processed variant data
          variants: variantData.variants,
          sizes: variantData.sizes,
          variantColors: variantData.colors,
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

  await log(`🎉 Shopify sync completed! (DB: ${dbName})`);
  await log(`📊 Final Summary:`);
  await log(`  💾 Total products saved to database: ${products.length}`);
  await log(`  🧠 Products processed with AI: ${productsWithoutEmbeddings.length}`);
  await log(`  ✅ In-stock products: ${inStockProducts.length}`);
  await log(`  ❌ Out-of-stock products: ${outOfStockProducts.length}`);

  // Mark job as done
  await statusCol.updateOne(
    { dbName },
    { $set: { state: "done", finishedAt: new Date(), done: productsWithoutEmbeddings.length } }
  );

  await client.close();
  await closeBrowser();
}