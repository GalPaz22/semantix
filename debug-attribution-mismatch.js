
const { MongoClient } = require("mongodb");
const fetch = require('node-fetch');
require("dotenv").config({ path: ".env.local" });

// Mock the helper from dashboard/page.js
function trimAndNormalize(value = "") {
    return value.trim().replace(/\s+/g, ' ');
}

// Mock the normalizer
function normalizeTimestamp(ts) {
    if (!ts) return 0;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'string') return new Date(ts).getTime();
    if (typeof ts === 'number') {
        if (ts < 1000000000000) return ts * 1000;
        return ts;
    }
    return 0;
}

const uri = process.env.MONGODB_URI;
const dbName = 'wineRoute'; // We know this from previous steps

async function main() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db(dbName);

        // 1. Fetch recent queries from API
        // We'll mimic the dashboard fetch
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 2); // Last 2 days to be sure

        console.log(`Fetching queries from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

        const queriesRes = await fetch('https://dashboard-server-ae00.onrender.com/queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
        });

        const queriesData = await queriesRes.json();
        const queries = Array.isArray(queriesData) ? queriesData : queriesData.queries || [];
        console.log(`Fetched ${queries.length} queries.`);

        // 2. Fetch recent cart events from MongoDB
        const cartEvents = await db.collection('cart').find({
            created_at: { $gte: startDate.toISOString() } // simplified filter
        }).toArray();
        console.log(`Fetched ${cartEvents.length} cart events.`);

        // 3. Try to match them and log failures
        let matchCount = 0;

        // Check the last 20 queries
        const recentQueries = queries.slice(0, 20);

        for (const query of recentQueries) {
            const queryText = (query.query || '').toLowerCase().trim();
            const queryTime = normalizeTimestamp(query.timestamp);
            const deliveredProducts = query.deliveredProducts || [];

            // Log query details
            console.log(`\n---------------------------------------------------`);
            console.log(`Checking Query: "${queryText}" | Time: ${new Date(queryTime).toISOString()} (${queryTime})`);
            console.log(`Delivered Products (First 3):`, deliveredProducts.slice(0, 3));

            // Find POTENTIAL matches (just by query text)
            const potentialMatches = cartEvents.filter(c => (c.search_query || '').toLowerCase().trim() === queryText);

            if (potentialMatches.length === 0) {
                console.log(`  -> No cart events found with matching query text.`);
                continue;
            }

            console.log(`  -> Found ${potentialMatches.length} cart events with matching text.`);

            for (const item of potentialMatches) {
                const itemTime = normalizeTimestamp(item.timestamp || item.created_at);
                const timeDiff = itemTime - queryTime;
                const minutesDiff = timeDiff / 1000 / 60;
                const ATTRIBUTION_WINDOW_MS = 10 * 60 * 1000;

                console.log(`    -> Cart Item: "${item.product_name}" | Time: ${new Date(itemTime).toISOString()} (${itemTime})`);
                console.log(`       Diff: ${minutesDiff.toFixed(2)} min`);

                // Check 1: Time Window
                let passedTime = false;
                if (itemTime >= queryTime && itemTime <= queryTime + ATTRIBUTION_WINDOW_MS) {
                    passedTime = true;
                    console.log(`       [PASS] Time Check`);
                } else {
                    console.log(`       [FAIL] Time Check (Must be 0 to 10 min)`);
                }

                // Check 2: Product Delivery
                const deliveredProductsSet = new Set(deliveredProducts.map(p => trimAndNormalize(p).toLowerCase()));
                const normalizedProductName = trimAndNormalize(item.product_name || '').toLowerCase();

                let passedProduct = false;
                if (deliveredProductsSet.has(normalizedProductName)) {
                    passedProduct = true;
                    console.log(`       [PASS] Product Check`);
                } else {
                    console.log(`       [FAIL] Product Check. "${normalizedProductName}" not in delivered list.`);
                    // Fuzzy check?
                    const fuzzyMatch = [...deliveredProductsSet].find(p => p.includes(normalizedProductName) || normalizedProductName.includes(p));
                    if (fuzzyMatch) console.log(`          (But found similar: "${fuzzyMatch}")`);
                }

                if (passedTime && passedProduct) {
                    console.log(`       *** FULL MATCH ***`);
                    matchCount++;
                }
            }
        }

        console.log(`\nTotal Full Matches found: ${matchCount}`);

        // 3. Inspect Cart Events directly
        console.log(`\n\n--- INSPECTING LATEST CART EVENTS ---`);
        const latestCart = await db.collection('cart').find().sort({ _id: -1 }).limit(20).toArray();

        for (const item of latestCart) {
            console.log(`Cart Item: ${item._id}`);
            console.log(`  Query: "${item.search_query}"`);
            console.log(`  Product: "${item.product_name}"`);
            console.log(`  Time: ${item.timestamp || item.created_at}`);
            // Check if this query exists in our recent queries list
            const matchingQuery = queries.find(q => (q.query || '').trim().toLowerCase() === (item.search_query || '').trim().toLowerCase());
            if (matchingQuery) {
                console.log(`  [MATCH FOUND IN QUERIES API] -> Query TS: ${matchingQuery.timestamp}`);
            } else {
                console.log(`  [NO MATCH IN QUERIES API]`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

main();
