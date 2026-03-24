import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import clientPromise from '/lib/mongodb.js';
import { processWooProducts } from '/lib/processWoo.js';
import processWooImages from '/lib/processWooImages.js';
import processShopify from '/lib/processShopify.js';
import processShopifyImages from '/lib/processShopifyImages.js';
import { setJobState } from '/lib/syncStatus.js';

export async function POST(request) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== 'galpaz2210@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { apiKey, dbName } = await request.json();

    if (!apiKey && !dbName) {
      return NextResponse.json({ error: 'API key or dbName is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const usersCollection = client.db("users").collection("users");

    // Find user by API key or dbName
    let user;
    if (apiKey) {
      user = await usersCollection.findOne({ apiKey });
    } else {
      user = await usersCollection.findOne({ 
        $or: [
          { 'credentials.dbName': dbName },
          { 'onboarding.dbName': dbName }
        ]
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get credentials and configuration - check all possible locations
    const credentials = user.credentials || user.onboarding?.credentials || {};
    const configuration = user.configuration || {};
    
    // Platform can be at top level, in credentials, or in configuration
    const platform = user.platform || credentials.platform || configuration.platform;
    
    // dbName can be in credentials, configuration, or passed as parameter
    const userDbName = credentials.dbName || configuration.dbName || user.onboarding?.dbName || dbName;
    
    // Categories, types, softCategories, colors can be in configuration (as objects with list) or credentials (as arrays)
    const categories = configuration.categories?.list || credentials.categories || [];
    const userTypes = configuration.types?.list || credentials.type || [];
    const softCategories = configuration.softCategories?.list || credentials.softCategories || [];
    const colors = configuration.colors?.list || credentials.colors || [];
    
    // Sync mode and context
    const syncMode = user.syncMode || credentials.syncMode || configuration.syncMode || 'text';
    const context = user.context || user.onboarding?.context || configuration.context || '';

    // Detailed debug logging
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [Admin Sync] Starting sync...');
    console.log(`   📋 Platform: ${platform}`);
    console.log(`   📁 DB Name: ${userDbName}`);
    console.log(`   🖼️  Sync Mode: ${syncMode}`);
    console.log(`   📝 Context: ${context || '(none)'}`);
    console.log(`   📂 Categories: ${categories.length} items`);
    console.log(`   🏷️  Types: ${userTypes.length} items`);
    console.log(`   🏷️  Soft Categories: ${softCategories.length} items`);
    console.log(`   🎨 Colors: ${colors.length} items`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!platform || !userDbName) {
      return NextResponse.json({ 
        error: 'User configuration incomplete',
        message: 'Platform and database name are required',
        debug: {
          platform: platform || 'missing',
          dbName: userDbName || 'missing',
        }
      }, { status: 400 });
    }

    // Set initial sync state
    console.log(`⏳ [Admin Sync] Setting job state to "running" for ${userDbName}...`);
    await setJobState(userDbName, "running");
    console.log(`✅ [Admin Sync] Job state set. Calling processing function...`);

    const startTime = Date.now();
    let logs = [];

    try {
      // BLOCKING: await the full processing before returning
      if (platform === "woocommerce") {
        const { wooUrl, wooKey, wooSecret } = credentials;
        if (!wooUrl || !wooKey || !wooSecret) {
          throw new Error('WooCommerce credentials are missing');
        }

        console.log(`🛒 [Admin Sync] Calling WooCommerce ${syncMode} processor...`);

        if (syncMode === "image") {
          logs = await processWooImages({ 
            wooUrl, wooKey, wooSecret, 
            userEmail: user.email, 
            categories, type: userTypes, softCategories, colors,
            dbName: userDbName,
            context
          });
        } else {
          logs = await processWooProducts({ 
            wooUrl, wooKey, wooSecret, 
            userEmail: user.email, 
            categories, userTypes, softCategories, colors,
            dbName: userDbName 
          });
        }
      } else if (platform === "shopify") {
        const { shopifyDomain, shopifyToken } = credentials;
        if (!shopifyDomain || !shopifyToken) {
          throw new Error('Shopify credentials are missing');
        }

        console.log(`🛍️ [Admin Sync] Calling Shopify ${syncMode} processor...`);

        if (syncMode === "image") {
          logs = await processShopifyImages({ 
            shopifyDomain, shopifyToken, 
            dbName: userDbName, 
            categories, userTypes, softCategories, colors, context 
          });
        } else {
          logs = await processShopify({ 
            shopifyDomain, shopifyToken, 
            dbName: userDbName, 
            categories, type: userTypes, softCategories, colors
          });
        }
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ [Admin Sync] ${userDbName} completed in ${elapsed}s`);
      console.log(`   📊 Logs: ${logs?.length || 0} entries`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      await setJobState(userDbName, "done");

      return NextResponse.json({ 
        success: true, 
        state: "done",
        message: `Sync completed for ${userDbName} in ${elapsed}s`,
        logs: logs
      }, { status: 200 });

    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ [Admin Sync] ${userDbName} FAILED after ${elapsed}s`);
      console.error(`   Error: ${err.message}`);
      console.error(`   Stack: ${err.stack}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await setJobState(userDbName, "error");
      
      return NextResponse.json({ 
        success: false, 
        error: err.message,
        state: "error"
      }, { status: 500 });
    }

  } catch (err) {
    console.error("[admin sync-products error]", err);
    return NextResponse.json({ error: "Something went wrong: " + err.message }, { status: 500 });
  }
}

// Vercel Hobby plan allows 1-60 seconds for Serverless Functions
export const maxDuration = 60;
