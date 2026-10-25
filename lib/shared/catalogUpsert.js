/**
 * Shared MongoDB upsert helpers for catalog imports/sync refreshes.
 * Updates all catalog fields on every run; preserves AI enrichment fields on existing docs.
 */

const ENRICHMENT_DEFAULTS = {
  embedding: null,
  category: [],
  type: [],
  softCategory: [],
  colors: [],
  description1: null,
  processedAt: null
};

const TRANSIENT_MONGO_PATTERNS = [
  /server monitor timeout/i,
  /timed? out/i,
  /timeout/i,
  /interrupted/i,
  /connection .* closed/i,
  /not primary/i,
  /replicasetnoprimary/i,
  /socket disconnected/i,
  /network/i,
  /econnreset/i,
  /etimedout/i
];

export function isTransientMongoError(err) {
  const name = err?.name || '';
  if (
    name === 'MongoServerSelectionError' ||
    name === 'MongoNetworkError' ||
    name === 'MongoNetworkTimeoutError' ||
    name === 'MongoTimeoutError' ||
    name === 'MongoExpiredSessionError'
  ) {
    return true;
  }
  const message = err?.message || '';
  return TRANSIENT_MONGO_PATTERNS.some((pattern) => pattern.test(message));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function productIdFilter(id) {
  if (id === null || id === undefined) return { id };
  const asString = String(id);
  const asNumber = Number(id);
  if (Number.isFinite(asNumber) && asString === String(asNumber)) {
    return { $or: [{ id }, { id: asNumber }, { id: asString }] };
  }
  return { id };
}

export function buildCatalogUpsertOp(product, platform, catalogSet = null) {
  const setPayload = {
    ...(catalogSet || product),
    sourcePlatform: platform,
    fetchedAt: new Date()
  };

  return {
    updateOne: {
      filter: productIdFilter(product.id),
      update: {
        $set: setPayload,
        $setOnInsert: { ...ENRICHMENT_DEFAULTS }
      },
      upsert: true
    }
  };
}

async function bulkWriteWithRetry(getCollection, ops, { attempts = 5, onRetry } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await getCollection().bulkWrite(ops, { ordered: false });
    } catch (err) {
      lastErr = err;
      if (!isTransientMongoError(err) || attempt === attempts) throw err;
      const wait = Math.min(2000 * 2 ** (attempt - 1), 20000);
      if (onRetry) await onRetry({ attempt, attempts, wait, err });
      await sleep(wait);
    }
  }
  throw lastErr;
}

export async function bulkUpsertCatalogProducts(collection, products, platform, {
  mapCatalogSet,
  chunkSize = 25,
  onChunk,
  onRetry,
  getCollection
} = {}) {
  const coll = () => (typeof getCollection === 'function' ? getCollection() : collection);
  let processed = 0;
  let inserted = 0;
  let modified = 0;
  let matched = 0;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const result = await bulkWriteWithRetry(
      coll,
      chunk.map(product => {
        const catalogSet = mapCatalogSet ? mapCatalogSet(product) : null;
        return buildCatalogUpsertOp(product, platform, catalogSet);
      }),
      { onRetry }
    );

    processed += chunk.length;
    inserted += result.upsertedCount || 0;
    modified += result.modifiedCount || 0;
    matched += result.matchedCount || 0;

    if (onChunk) {
      await onChunk({ processed, total: products.length, inserted, modified, matched });
    }

    // Yield so Mongo heartbeats can run between large BSON writes.
    await new Promise((resolve) => setImmediate(resolve));
  }

  return { processed, inserted, modified, matched, upserted: inserted + modified };
}
