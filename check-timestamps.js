
const fetch = require('node-fetch');

async function main() {
    const dbName = 'wineRoute'; // Found in previous step

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`Fetching queries for ${dbName} from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

    try {
        const response = await fetch('https://dashboard-server-ae00.onrender.com/queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
        });

        if (!response.ok) {
            console.error("Error fetching queries:", response.status, response.statusText);
            const txt = await response.text();
            console.error(txt);
            return;
        }

        const raw = await response.text();
        console.log("Raw Response Length:", raw.length);
        try {
            const queries = JSON.parse(raw);
            console.log("Response type:", typeof queries);
            console.log("Is Array:", Array.isArray(queries));
            if (Array.isArray(queries)) {
                console.log("Array length:", queries.length);
                if (queries.length > 0) {
                    console.log("First item:", JSON.stringify(queries[0], null, 2));
                    console.log("Timestamp:", queries[0].timestamp, typeof queries[0].timestamp);
                }
            } else {
                console.log("Keys:", Object.keys(queries));
                console.log("Sample:", JSON.stringify(queries, null, 2).slice(0, 500));
            }
        } catch (e) {
            console.error("JSON parse error:", e);
            console.log("Raw Start:", raw.slice(0, 200));
        }

    } catch (err) {
        console.error("Fetch failed:", err);
    }
}
main();
