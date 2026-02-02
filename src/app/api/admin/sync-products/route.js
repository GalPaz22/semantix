import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '/src/app/api/auth/[...nextauth]/route';
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
    
    // Categories, types, softCategories can be in configuration (as objects with list) or credentials (as arrays)
    const categories = configuration.categories?.list || credentials.categories || [];
    const userTypes = configuration.types?.list || credentials.type || [];
    const softCategories = configuration.softCategories?.list || credentials.softCategories || [];
    
    // Sync mode and context
    const syncMode = user.syncMode || credentials.syncMode || configuration.syncMode || 'text';
    const context = user.context || user.onboarding?.context || configuration.context || '';

    // Debug logging
    console.log('🔍 [Admin Sync] User data structure:', {
      hasPlatform: !!platform,
      platform: platform,
      hasDbName: !!userDbName,
      dbName: userDbName,
      credentialsKeys: Object.keys(credentials),
      configurationKeys: Object.keys(configuration),
      userTopLevelKeys: Object.keys(user).filter(k => !['password', '_id'].includes(k))
    });

    if (!platform || !userDbName) {
      return NextResponse.json({ 
        error: 'User configuration incomplete',
        message: 'Platform and database name are required',
        debug: {
          platform: platform || 'missing',
          dbName: userDbName || 'missing',
          availableFields: {
            userPlatform: user.platform,
            credentialsPlatform: credentials.platform,
            configPlatform: configuration.platform,
            credentialsDbName: credentials.dbName,
            configDbName: configuration.dbName,
            onboardingDbName: user.onboarding?.dbName
          }
        }
      }, { status: 400 });
    }

    // Set initial sync state
    await setJobState(userDbName, "running");

    let logs = [];

    try {
      // Trigger sync based on platform
      if (platform === "woocommerce") {
        const { wooUrl, wooKey, wooSecret } = credentials;
        if (!wooUrl || !wooKey || !wooSecret) {
          throw new Error('WooCommerce credentials are missing');
        }

        if (syncMode === "image") {
          logs = await processWooImages({ 
            wooUrl, 
            wooKey, 
            wooSecret, 
            userEmail: user.email, 
            categories, 
            userTypes, 
            softCategories, 
            dbName: userDbName 
          });
        } else {
          logs = await processWooProducts({ 
            wooUrl, 
            wooKey, 
            wooSecret, 
            userEmail: user.email, 
            categories, 
            userTypes, 
            softCategories, 
            dbName: userDbName 
          });
        }
      } else if (platform === "shopify") {
        const { shopifyDomain, shopifyToken } = credentials;
        if (!shopifyDomain || !shopifyToken) {
          throw new Error('Shopify credentials are missing');
        }

        if (syncMode === "image") {
          logs = await processShopifyImages({ 
            shopifyDomain, 
            shopifyToken, 
            dbName: userDbName, 
            categories, 
            userTypes, 
            softCategories, 
            context 
          });
        } else {
          logs = await processShopify({ 
            shopifyDomain, 
            shopifyToken, 
            dbName: userDbName, 
            categories, 
            userTypes, 
            softCategories 
          });
        }
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      await setJobState(userDbName, "done");

      return NextResponse.json({ 
        success: true, 
        state: "done",
        message: "Product sync initiated successfully",
        logs: logs
      }, { status: 200 });

    } catch (err) {
      console.error("Sync error:", err);
      await setJobState(userDbName, "error");
      
      return NextResponse.json({ 
        success: false, 
        error: err.message,
        state: "error"
      }, { status: 500 });
    }

  } catch (err) {
    console.error("[admin sync-products error]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// Increase function timeout for Vercel
export const maxDuration = 60;

