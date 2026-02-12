
/**
 * Helper to determine the correct timestamp field and query format for a collection.
 */
export async function buildDynamicDateFilter(db, collectionName, startDate, endDate) {
    try {
        // Get a recent sample document to inspect structure
        // Sort by _id desc to get the latest schema
        const sample = await db.collection(collectionName).findOne({}, { sort: { _id: -1 } });

        if (!sample) return {}; // Collection empty

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Check known fields in priority order
        const possibleFields = ['timestamp', 'created_at', 'createdAt', 'time', 'event_time'];

        let targetField = null;
        let targetValue = null;

        for (const field of possibleFields) {
            if (sample[field] !== undefined && sample[field] !== null) {
                targetField = field;
                targetValue = sample[field];
                break;
            }
        }

        if (!targetField) {
            // If no standard field found, fallback to created_at (most common)
            console.warn(`[Analytics Helper] No timestamp field found in ${collectionName}. Defaulting to created_at.`);
            return { created_at: { $gte: start.toISOString(), $lte: end.toISOString() } };
        }

        // Generate query based on value type
        if (targetValue instanceof Date) {
            return { [targetField]: { $gte: start, $lte: end } };
        }

        if (typeof targetValue === 'number') {
            // Heuristic: Unix seconds are usually < 10000000000 (year 2286)
            // Current millis are > 1000000000000
            const isSeconds = targetValue < 10000000000;
            const sVal = isSeconds ? Math.floor(start.getTime() / 1000) : start.getTime();
            const eVal = isSeconds ? Math.floor(end.getTime() / 1000) : end.getTime();
            return { [targetField]: { $gte: sVal, $lte: eVal } };
        }

        if (typeof targetValue === 'string') {
            // We'll compare lexicographically which works for standard ISO strings
            // Ensure we filter out non-date strings if possible, but for now assume it's a date string
            return { [targetField]: { $gte: start.toISOString(), $lte: end.toISOString() } };
        }

        return {};

    } catch (error) {
        console.error(`[Analytics Helper] Error building date filter for ${collectionName}:`, error);
        return {};
    }
}
