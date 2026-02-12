/**
 * Debug API endpoint: Fetch a sample product schema from Shopify or WooCommerce.
 * Shows the FULL raw product data to verify all fields are captured.
 * 
 * Usage: POST /api/debug/product-schema
 * Body: { dbName: "..." }
 */
import { NextResponse } from "next/server";
import clientPromise from "/lib/mongodb";
import { GraphQLClient, gql } from "graphql-request";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

export async function POST(request) {
  try {
    const { dbName } = await request.json();
    if (!dbName) {
      return NextResponse.json({ error: "dbName is required" }, { status: 400 });
    }

    // Get user credentials from DB
    const mongoClient = await clientPromise;
    const usersDb = mongoClient.db("users");
    const user = await usersDb.collection("users").findOne({ dbName });

    if (!user) {
      return NextResponse.json({ error: `No user found for dbName: ${dbName}` }, { status: 404 });
    }

    const { platform, syncMode } = user;
    const credentials = user.credentials || {};

    const result = {
      platform,
      syncMode,
      timestamp: new Date().toISOString(),
      sampleProduct: null,
      allFieldKeys: [],
      stockFields: {},
      variantSample: null,
      notes: []
    };

    // ==================== SHOPIFY ====================
    if (platform === "shopify") {
      const shopifyDomain = credentials.shopifyDomain || credentials.domain;
      const shopifyToken = credentials.shopifyToken || credentials.token || credentials.accessToken;

      if (!shopifyDomain || !shopifyToken) {
        return NextResponse.json({ error: "Missing Shopify credentials", credentials: Object.keys(credentials) }, { status: 400 });
      }

      const cleanDomain = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const fullDomain = cleanDomain.includes('.myshopify.com') ? cleanDomain : `${cleanDomain}.myshopify.com`;

      const graphQLClient = new GraphQLClient(`https://${fullDomain}/admin/api/2024-01/graphql.json`, {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Comprehensive query — excludes inventoryLevels (needs read_inventory scope)
      // and fields not available on all API versions (weight on variants, mediaCount, compareAtPriceRange)
      const query = gql`
        query getSampleProduct {
          products(first: 3) {
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
                descriptionHtml
                totalInventory
                tracksInventory
                publishedAt
                createdAt
                updatedAt
                hasOnlyDefaultVariant
                hasOutOfStockVariants
                isGiftCard
                totalVariants
                options {
                  id
                  name
                  values
                  position
                }
                seo {
                  title
                  description
                }
                images(first: 5) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      sku
                      title
                      price
                      compareAtPrice
                      position
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
                        url
                        altText
                      }
                    }
                  }
                }
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      `;

      try {
        const data = await graphQLClient.request(query);
        const products = data.products.edges.map(e => e.node);

        if (products.length > 0) {
          const sample = products[0];
          result.sampleProduct = sample;
          result.allFieldKeys = Object.keys(sample);

          // Extract stock-specific fields
          result.stockFields = {
            productLevel: {
              status: sample.status,
              totalInventory: sample.totalInventory,
              tracksInventory: sample.tracksInventory,
              hasOutOfStockVariants: sample.hasOutOfStockVariants,
            },
            variantLevel: sample.variants?.edges?.slice(0, 3).map(({ node: v }) => ({
              id: v.id,
              title: v.title,
              sku: v.sku,
              price: v.price,
              inventoryQuantity: v.inventoryQuantity,
              inventoryPolicy: v.inventoryPolicy,
              availableForSale: v.availableForSale,
              taxable: v.taxable,
              barcode: v.barcode
            }))
          };

          result.variantSample = sample.variants?.edges?.[0]?.node || null;

          // Add sample of other products for status comparison
          result.otherProductStatuses = products.map(p => ({
            title: p.title,
            status: p.status,
            totalInventory: p.totalInventory,
            tracksInventory: p.tracksInventory,
            hasOutOfStockVariants: p.hasOutOfStockVariants,
            variantCount: p.variants?.edges?.length || 0,
            isGiftCard: p.isGiftCard
          }));

          // Stock status determination logic (same as processShopify.js)
          result.stockStatusAnalysis = products.map(p => {
            const isActive = p.status === 'ACTIVE';
            let computed = 'outofstock';
            let reason = '';
            if (!isActive) {
              reason = `status=${p.status} (not ACTIVE)`;
            } else {
              const hasAvailable = p.variants?.edges?.some(({ node: v }) => 
                v.availableForSale || (typeof v.inventoryQuantity === 'number' && v.inventoryQuantity > 0)
              );
              const hasTotalInv = typeof p.totalInventory === 'number' && p.totalInventory > 0;
              const notTracked = p.tracksInventory === false;
              if (hasAvailable || hasTotalInv) {
                computed = 'instock';
                reason = hasAvailable ? 'has available variant' : `totalInventory=${p.totalInventory}`;
              } else if (notTracked) {
                computed = 'instock';
                reason = 'tracksInventory=false (inventory not tracked, assume in stock)';
              } else {
                reason = 'ACTIVE but no available variants and no positive totalInventory';
              }
            }
            return { title: p.title, status: p.status, computed, reason };
          });
        }

        result.notes.push("✅ Shopify GraphQL query successful");
        result.notes.push(`📦 Fetched ${products.length} sample products`);
        result.notes.push(`⚠️ IMPORTANT: 'status' field values: ACTIVE, ARCHIVED, DRAFT`);
        result.notes.push(`⚠️ 'inventoryPolicy' values: DENY (stop selling when out of stock), CONTINUE (sell even when out of stock)`);
        result.notes.push(`⚠️ 'availableForSale' = Shopify's own determination if variant can be purchased`);
        result.notes.push(`⚠️ 'tracksInventory' = whether inventory tracking is enabled for this product`);
        result.notes.push(`⚠️ Note: inventoryItem.inventoryLevels requires 'read_inventory' scope (not included)`);
        
      } catch (graphqlError) {
        result.notes.push(`❌ GraphQL error: ${graphqlError.message}`);
        
        // Some fields might not be available - try a simpler query
        result.notes.push("🔄 Trying simplified query without advanced inventory fields...");
        
        const simpleQuery = gql`
          query getSampleProduct {
            products(first: 1) {
              edges {
                node {
                  id
                  title
                  status
                  totalInventory
                  tracksInventory
                  description
                  variants(first: 5) {
                    edges {
                      node {
                        id
                        title
                        price
                        inventoryQuantity
                        inventoryPolicy
                        availableForSale
                        selectedOptions { name value }
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        try {
          const simpleData = await graphQLClient.request(simpleQuery);
          result.sampleProduct = simpleData.products.edges[0]?.node || null;
          result.notes.push("✅ Simplified query succeeded");
          result.notes.push("⚠️ Some advanced inventory fields may not be available on this API version/plan");
        } catch (simpleError) {
          result.notes.push(`❌ Simplified query also failed: ${simpleError.message}`);
        }
      }
    }
    // ==================== WOOCOMMERCE ====================
    else if (platform === "woocommerce" || platform === "woo") {
      const wooUrl = credentials.wooUrl || credentials.url;
      const wooKey = credentials.wooKey || credentials.consumerKey;
      const wooSecret = credentials.wooSecret || credentials.consumerSecret;

      if (!wooUrl || !wooKey || !wooSecret) {
        return NextResponse.json({ error: "Missing WooCommerce credentials", credentials: Object.keys(credentials) }, { status: 400 });
      }

      const api = new WooCommerceRestApi({
        url: wooUrl,
        consumerKey: wooKey,
        consumerSecret: wooSecret,
        version: "wc/v3"
      });

      try {
        // Fetch 3 products with full data
        const response = await api.get("products", { per_page: 3 });
        const products = response.data || [];

        if (products.length > 0) {
          const sample = products[0];
          result.sampleProduct = sample;
          result.allFieldKeys = Object.keys(sample);

          // Extract stock-specific fields
          result.stockFields = {
            productLevel: {
              status: sample.status,
              stock_status: sample.stock_status,
              stock_quantity: sample.stock_quantity,
              manage_stock: sample.manage_stock,
              backorders: sample.backorders,
              backorders_allowed: sample.backorders_allowed,
              backordered: sample.backordered,
              low_stock_amount: sample.low_stock_amount,
              sold_individually: sample.sold_individually,
              purchasable: sample.purchasable,
              on_sale: sample.on_sale
            }
          };

          // If variable product, fetch variations
          if (sample.type === 'variable' && sample.variations && sample.variations.length > 0) {
            try {
              const variationsResponse = await api.get(`products/${sample.id}/variations`, { per_page: 5 });
              const variations = variationsResponse.data || [];
              result.variantSample = variations[0] || null;
              result.stockFields.variationLevel = variations.slice(0, 3).map(v => ({
                id: v.id,
                sku: v.sku,
                stock_status: v.stock_status,
                stock_quantity: v.stock_quantity,
                manage_stock: v.manage_stock,
                backorders: v.backorders,
                backorders_allowed: v.backorders_allowed,
                purchasable: v.purchasable,
                attributes: v.attributes
              }));
            } catch (varError) {
              result.notes.push(`⚠️ Could not fetch variations: ${varError.message}`);
            }
          }

          result.otherProductStatuses = products.map(p => ({
            name: p.name,
            status: p.status,
            stock_status: p.stock_status,
            stock_quantity: p.stock_quantity,
            manage_stock: p.manage_stock,
            type: p.type,
            purchasable: p.purchasable,
            on_sale: p.on_sale
          }));
        }

        result.notes.push("✅ WooCommerce REST API query successful");
        result.notes.push(`📦 Fetched ${products.length} sample products`);
        result.notes.push(`⚠️ 'status' values: publish, draft, pending, private`);
        result.notes.push(`⚠️ 'stock_status' values: instock, outofstock, onbackorder`);
        result.notes.push(`⚠️ 'manage_stock' = whether stock is being tracked`);
        result.notes.push(`⚠️ 'backorders' values: no, notify, yes`);
        
      } catch (wooError) {
        result.notes.push(`❌ WooCommerce API error: ${wooError.message}`);
      }
    } else {
      return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

