import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '/src/app/api/auth/[...nextauth]/route';
import clientPromise from '/lib/mongodb.js';
import { fetchPublicShopifyProducts } from '/lib/shared/shopifyPublicProducts.js';
import { applyWooDefaultBoosts, fetchPublicWooProducts } from '/lib/shared/wooPublicProducts.js';
import { bulkUpsertCatalogProducts } from '/lib/shared/catalogUpsert.js';
import { parsePrice } from '/lib/shared/utils.js';
import { setJobState, appendLogs } from '/lib/syncStatus.js';

function validateDbName(dbName) {
  return typeof dbName === 'string' && /^[a-zA-Z0-9_-]+$/.test(dbName.trim());
}

function catalogSetFromShopifyProduct(product) {
  const minPrice = parsePrice(product.priceRange?.minVariantPrice?.amount, false);
  const image = product.images?.edges?.[0]?.node?.src || null;

  return {
    ...product,
    name: product.title,
    title: product.title,
    price: minPrice,
    stockStatus: product.stockStatus || 'outofstock',
    stock_status: product.stockStatus || 'outofstock',
    url: product.onlineStoreUrl || product.url || null,
    image: product.images?.edges?.[0]?.node?.src || product.image || null,
    active: product.status === 'ACTIVE'
  };
}

function catalogSetFromWooProduct(product) {
  return {
    ...product,
    name: product.name || product.title,
    title: product.title || product.name,
    price: product.price ?? 0,
    regular_price: product.regular_price ?? product.price ?? 0,
    sale_price: product.sale_price ?? 0,
    stockStatus: product.stockStatus || product.stock_status || 'outofstock',
    stock_status: product.stock_status || product.stockStatus || 'outofstock',
    url: product.url || product.permalink || null,
    image: product.image || product.images?.[0]?.src || null,
    active: product.active !== false
  };
}

async function runPublicCatalogImport({ platform, fetchType, url, dbName }) {
  try {
    await appendLogs(dbName, [`🚀 Starting public ${platform} catalog import from ${url} (fetch type: ${fetchType})`]);

    let products = [];
    if (platform === 'shopify') {
      products = await fetchPublicShopifyProducts(url, {
        onPage: ({ page, count, total }) => appendLogs(dbName, [`📄 Shopify page ${page}: ${count} products (total: ${total})`])
      });
    } else if (platform === 'woocommerce') {
      products = await fetchPublicWooProducts(url, {
        fetchType: fetchType,
        onPage: ({ page, count, kept, total, source }) => appendLogs(dbName, [
          `📄 Woo page ${page} (${source || 'api'}): ${count} fetched, ${kept ?? count} kept (running total: ${total})`
        ])
      });
    }

    if (products.length === 0) {
      await setJobState(dbName, 'done', {
        progress: 100,
        done: 0,
        total: 0,
        inserted: 0,
        modified: 0,
        matched: 0,
        finishedAt: new Date()
      });
      await appendLogs(dbName, [
        '⚠️ No in-stock products to upsert.',
        'Use the shop homepage URL (https://yourshop.com/) so Woo Store API (wc/store/v1) is used — not wp-json/wp/v2/product.'
      ]);
      return;
    }

    const client = await clientPromise;
    const collection = client.db(dbName).collection('products');
    const mapCatalogSet = platform === 'shopify' ? catalogSetFromShopifyProduct : catalogSetFromWooProduct;

    await appendLogs(dbName, [`💾 Upserting ${products.length} products into ${dbName}.products (updates existing rows)...`]);
    await setJobState(dbName, 'running', { total: products.length, done: 0, progress: 0 });

    const stats = await bulkUpsertCatalogProducts(collection, products, platform, {
      mapCatalogSet,
      onChunk: async ({ processed, total, inserted, modified, matched }) => {
        await setJobState(dbName, 'running', {
          done: processed,
          total,
          inserted,
          modified,
          matched,
          progress: total ? Math.round((processed / total) * 100) : 100
        });
        await appendLogs(dbName, [`💾 Upserted ${processed}/${total} (${modified} updated, ${inserted} new)`]);
      }
    });
    let popularityStats = null;
    if (platform === 'woocommerce') {
      popularityStats = await applyWooDefaultBoosts(collection, products);
      await appendLogs(dbName, [
        `⭐ Woo popularity: ${popularityStats.detected} detected, ${popularityStats.boosted} received default boost level 1`
      ]);
    }

    await setJobState(dbName, 'done', {
      progress: 100,
      done: stats.processed,
      total: products.length,
      inserted: stats.inserted,
      modified: stats.modified,
      matched: stats.matched,
      finishedAt: new Date()
    });
    await appendLogs(dbName, [
      `✅ Public catalog import complete.`,
      `📊 ${stats.processed} products processed — ${stats.modified} updated, ${stats.inserted} inserted (${stats.matched} matched)`
    ]);
  } catch (err) {
    console.error('[public-catalog-import background error]', err);
    await setJobState(dbName, 'error', { error: err.message, finishedAt: new Date() });
    await appendLogs(dbName, [`❌ Public catalog import failed: ${err.message}`]);
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== 'galpaz2210@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { platform, fetchType, url, dbName, username, password } = await request.json();
    const cleanPlatform = String(platform || '').toLowerCase();
    const cleanFetchType = String(fetchType || 'default').toLowerCase();
    let cleanUrl = String(url || '').trim();
    const cleanDbName = String(dbName || '').trim();
    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '').trim();

    if (!['shopify', 'woocommerce'].includes(cleanPlatform)) {
      return NextResponse.json({ error: 'platform must be shopify or woocommerce' }, { status: 400 });
    }

    // If Semantix Custom endpoint, embed credentials into the URL
    if (cleanPlatform === 'woocommerce' && cleanFetchType === 'semantix-custom') {
      if (!cleanUrl) {
        return NextResponse.json({ error: 'url is required for semantix-custom fetch type' }, { status: 400 });
      }
      if (cleanUsername && cleanPassword) {
        const parsedUrl = new URL(cleanUrl);
        parsedUrl.username = encodeURIComponent(cleanUsername);
        parsedUrl.password = encodeURIComponent(cleanPassword);
        cleanUrl = parsedUrl.toString();
      }
    } else if (!cleanUrl) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    if (!validateDbName(cleanDbName)) {
      return NextResponse.json({ error: 'dbName may contain only letters, numbers, underscores, and dashes' }, { status: 400 });
    }

    await setJobState(cleanDbName, 'running', {
      dbName: cleanDbName,
      progress: 0,
      done: 0,
      total: 0,
      logs: [],
      startedAt: new Date()
    });

    void runPublicCatalogImport({
      platform: cleanPlatform,
      fetchType: cleanFetchType,
      url: cleanUrl,
      dbName: cleanDbName
    });

    return NextResponse.json({
      success: true,
      dbName: cleanDbName,
      platform: cleanPlatform,
      state: 'running'
    });
  } catch (err) {
    console.error('[public-catalog-import error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const maxDuration = 60;
