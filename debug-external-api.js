
const fetch = require('node-fetch'); // functionality is built-in to node 18+, but just in case
// Note: in recent node versions fetch is global.

async function main() {
    // I need a valid dbName. I'll use 'manoVino' from the previous debug output as a test case, 
    // or I can try to find the one for the current user.
    // The debug output showed 'manoVino' had a cart item recently.
    const dbName = 'manoVino';

    console.log(`Fetching queries for DB: ${dbName}...`);

    try {
        const res = await fetch("https://dashboard-server-ae00.onrender.com/queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbName })
        });

        if (!res.ok) {
            console.log("Error status:", res.status);
            return;
        }

        const data = await res.json();
        console.log("Response Data Keys:", Object.keys(data));

        if (data.queries && Array.isArray(data.queries) && data.queries.length > 0) {
            console.log(`Found ${data.queries.length} queries.`);
            console.log("First query item:", JSON.stringify(data.queries[0], null, 2));
            console.log("Last query item:", JSON.stringify(data.queries[data.queries.length - 1], null, 2));

            // Check timestamp types
            const timestamps = data.queries.map(q => q.timestamp).filter(t => t);
            console.log("Sample timestamps:", timestamps.slice(0, 5));

            const type = typeof timestamps[0];
            console.log("Timestamp type:", type);
        } else {
            console.log("No queries found or empty array.");
        }

    } catch (error) {
        console.error("Fetch error:", error);
    }
}

main();
