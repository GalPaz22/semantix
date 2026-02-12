
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("Please define the MONGODB_URI environment variable in .env.local");
    process.exit(1);
}

// Hardcode the user's DB name if known, or list databases to find it
// From the conversation, the user likely uses a specific DB name stored in their onboarding data.
// However, I'll try to list databases first or try to access a likely one if I can't find it.
// Actually, `src/app/api/cart-analytics/route.js` expects `dbName` in the body.
// I will try to inspect the 'users' DB first since that's in the URI, 
// but the app seems to use dynamic DB names per user.
// I'll try to list available databases to identify the correct one.

async function main() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected directly to MongoDB");

        const admin = client.db().admin();
        const dbs = await admin.listDatabases();
        console.log("Databases:", dbs.databases.map(db => db.name));

        // Try to find a relevant database. 
        // The user mentioned "semantix-front-hebrew", maybe there's a DB named related to that or "semantix".
        // Or I'll just look for one that looks like a user DB.
        // For now, I'll iterate over non-system DBs and check for 'cart' or 'checkout_events' collections.

        for (const dbInfo of dbs.databases) {
            if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;

            const db = client.db(dbInfo.name);
            const collections = await db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);

            if (collectionNames.includes('cart') || collectionNames.includes('checkout_events')) {
                console.log(`\nAnalyzing Database: ${dbInfo.name}`);

                if (collectionNames.includes('cart')) {
                    const cartItem = await db.collection('cart').findOne({}, { sort: { _id: -1 } });
                    console.log("Latest Cart Item:", JSON.stringify(cartItem, null, 2));
                }

                if (collectionNames.includes('checkout_events')) {
                    const checkoutItem = await db.collection('checkout_events').findOne({}, { sort: { _id: -1 } });
                    console.log("Latest Checkout Event:", JSON.stringify(checkoutItem, null, 2));
                }

                // Just check one relevant DB to avoid noise, unless we want to be thorough
                // break; 
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

main();
