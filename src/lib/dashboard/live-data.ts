import type { CollectionHealth, NormalizedRecord } from "@/lib/dashboard/types";

import type { Db } from "mongodb";

const DATE_FIELDS = [
  "createdAt",
  "created_at",
  "timestamp",
  "date",
  "occurredAt",
  "updatedAt",
  "closedAt"
];

const REVENUE_FIELDS = ["amount", "total", "revenue", "value", "price", "subtotal"];
const CUSTOMER_FIELDS = ["customer", "customerName", "customerId", "account", "accountName"];
const PRODUCT_FIELDS = ["product", "productName", "sku", "item", "service"];
const STATUS_FIELDS = ["status", "state", "stage", "phase"];
const REGION_FIELDS = ["region", "territory", "market"];
const CHANNEL_FIELDS = ["channel", "source"];
const TEAM_FIELDS = ["team", "ownerTeam", "department"];
const QUERY_FIELDS = ["query", "search", "searchTerm", "searchQuery", "term", "keyword"];
const SESSION_FIELDS = ["sessionId", "session_id", "session"];
const USER_FIELDS = ["userId", "user_id", "user", "customerId"];
const IP_FIELDS = ["ipAddress", "ip_address", "ip"];
const RESULT_FIELDS = ["resultsCount", "result_count", "matches", "matchedProducts", "productsFound"];
const EVENT_TYPE_FIELDS = ["eventType", "event_type", "action", "type"];

const TIMESTAMP_CANDIDATES = [
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "timestamp",
  "date",
  "occurredAt",
  "closedAt",
  "closed_at"
];

const STATUS_CANDIDATES = ["status", "state", "stage", "phase"];
const DIMENSION_CANDIDATES = ["region", "channel", "team", "product", "productName"];

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function pickString(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function pickNumber(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function pickArrayLength(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return undefined;
}

function pickObject(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function normalizeProductIdCandidate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized || /^-+$/.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function extractDeliveredProducts(record: Record<string, unknown>) {
  const delivered = record.deliveredProducts;
  if (!Array.isArray(delivered)) {
    return {
      ids: [] as string[],
      names: [] as string[]
    };
  }

  const ids = new Set<string>();
  const names = new Set<string>();

  for (const item of delivered) {
    if (typeof item === "string") {
      names.add(item.trim().toLowerCase());
      continue;
    }

    if (typeof item === "number") {
      ids.add(String(item));
      continue;
    }

    if (typeof item !== "object" || item === null) {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const numericId = pickNumber(candidate, ["product_id", "id"]);
    const id =
      numericId != null
        ? String(numericId)
        : normalizeProductIdCandidate(pickString(candidate, ["product_id", "productId", "id", "_id", "sku"]));
    const name = pickString(candidate, ["product_name", "productName", "name", "title"]);

    if (id) {
      ids.add(id);
    }
    if (name) {
      names.add(name.trim().toLowerCase());
    }
  }

  return {
    ids: [...ids],
    names: [...names]
  };
}

function normalizeSource(record: Record<string, unknown>): NormalizedRecord["source"] {
  const source = pickString(record, ["source"])?.toLowerCase();
  if (record.zero_recovery === true) {
    return "zero-results";
  }
  if (!source) {
    return "unknown";
  }
  if (source === "native") return "native";
  if (source === "inject") return "inject";
  if (source === "rerank") return "rerank";
  if (source === "ai") return "ai";
  if (source === "zero-results" || source === "zero_results" || source === "zero results") {
    return "zero-results";
  }
  return "unknown";
}

function pickDate(record: Record<string, unknown>) {
  for (const field of DATE_FIELDS) {
    const value = record[field];
    if (!value) {
      continue;
    }
    const date = new Date(value as string | number | Date);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

function detectException(status?: string, record?: Record<string, unknown>) {
  if (status && /(error|failed|blocked|cancelled|exception)/i.test(status)) {
    return true;
  }

  if (!record) {
    return false;
  }

  return ["error", "failed", "isException"].some((field) => record[field] === true);
}

function detectClosed(status?: string) {
  return status ? /(closed|complete|completed|won|resolved|paid|shipped)/i.test(status) : false;
}

function detectEventType(
  status: string | undefined,
  revenue: number | undefined,
  product: string | undefined,
  record: Record<string, unknown>
): NormalizedRecord["eventType"] {
  const explicit = pickString(record, EVENT_TYPE_FIELDS)?.toLowerCase();
  if (explicit) {
    if (explicit.includes("purchase")) return "purchase";
    if (explicit.includes("cart")) return "add_to_cart";
    if (explicit.includes("click")) return "click";
    if (explicit.includes("search") || explicit.includes("query")) return "query";
  }

  if (revenue && revenue > 0) {
    return "purchase";
  }
  if (status && /(cart|checkout|basket)/i.test(status)) {
    return "add_to_cart";
  }
  if (product) {
    return "click";
  }
  return "query";
}

function normalizeQueryRecord(collection: string, record: Record<string, unknown>): NormalizedRecord {
  const query = pickString(record, ["query", "search_query", "searchQuery", "q"]);
  const deliveredProducts = extractDeliveredProducts(record);
  const resultsCount =
    pickArrayLength(record, ["deliveredProducts", "matchedProducts"]) ??
    pickNumber(record, RESULT_FIELDS);

  return {
    id:
      pickString(record, ["event_id", "id"]) ??
      `query-${slugify(query ?? "search")}-${pickString(record, ["timestamp", "created_at", "createdAt"]) ?? crypto.randomUUID()}`,
    collection,
    timestamp: pickDate(record),
    revenue: undefined,
    customer: undefined,
    product: undefined,
    region: pickString(record, ["softCategory", "category"]),
    channel: "search",
    team: undefined,
    status: pickString(record, ["category", "type"]),
    isException: false,
    isClosed: false,
    summary: query ? `Search query: ${query}` : `${collection} record`,
    query,
    sessionId: pickString(record, SESSION_FIELDS),
    userId: pickString(record, USER_FIELDS),
    ipAddress: pickString(record, IP_FIELDS),
    resultsCount,
    matchedProducts: resultsCount,
    deliveredProductIds: deliveredProducts.ids,
    deliveredProductNames: deliveredProducts.names,
    eventType: "query"
  };
}

function normalizeProductClickRecord(collection: string, record: Record<string, unknown>): NormalizedRecord {
  const query = pickString(record, ["search_query", "query", "searchQuery"]);
  const product = pickString(record, ["product_name", "productName", "product"]);
  const price = pickNumber(record, ["price", "value", "amount"]);
  const numericProductId = pickNumber(record, ["product_id"]);
  const productId =
    numericProductId != null
      ? String(numericProductId)
      : normalizeProductIdCandidate(pickString(record, ["product_id", "productId"]));

  return {
    id:
      pickString(record, ["event_id", "id"]) ??
      `click-${slugify(query ?? product ?? collection)}-${pickString(record, ["timestamp", "created_at", "createdAt"]) ?? crypto.randomUUID()}`,
    collection,
    timestamp: pickDate(record),
    revenue: price,
    customer: undefined,
    product,
    region: undefined,
    channel: pickString(record, ["source", "platform", "query_source"]) ?? "search",
    team: undefined,
    status: pickString(record, ["interaction_type", "type"]) ?? "click",
    isException: false,
    isClosed: false,
    summary: product ? `Clicked ${product}` : `${collection} record`,
    query,
    sessionId: pickString(record, ["session_id", "sessionId"]),
    userId: pickString(record, ["user_id", "userId"]),
    ipAddress: pickString(record, ["ip_address", "ipAddress"]),
    productId,
    resultsCount: undefined,
    matchedProducts: undefined,
    eventType: "click",
    source: normalizeSource(record)
  };
}

function normalizeProfileRecord(collection: string, record: Record<string, unknown>): NormalizedRecord {
  const preferences = pickObject(record, "preferences");
  const softCategories = preferences ? pickObject(preferences, "softCategories") : undefined;
  const preferenceTopics = softCategories
    ? Object.entries(softCategories)
        .map(([label, value]) => ({
          label,
          clicks: pickNumber(asRecord(value), ["clicks"]) ?? 0
        }))
        .sort((a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label))
        .slice(0, 5)
        .map((entry) => entry.label)
    : [];
  const topQuery = preferenceTopics[0];

  const stats = pickObject(record, "stats");

  return {
    id: pickString(record, ["session_id", "sessionId", "id"]) ?? crypto.randomUUID(),
    collection,
    timestamp: pickDate(record),
    revenue: undefined,
    customer: undefined,
    product: undefined,
    region: topQuery,
    channel: "profile",
    team: undefined,
    status: "profile",
    isException: false,
    isClosed: false,
    summary: topQuery ? `Profile preference: ${topQuery}` : `${collection} record`,
    query: undefined,
    sessionId: pickString(record, ["session_id", "sessionId"]),
    userId: pickString(record, ["user_id", "userId"]),
    ipAddress: pickString(record, ["ip_address", "ipAddress"]),
    resultsCount: undefined,
    matchedProducts: undefined,
    eventType: "profile",
    profileClicks: pickNumber(stats ?? {}, ["totalClicks"]),
    profileTopQuery: topQuery,
    profilePreferenceTopics: preferenceTopics
  };
}

function normalizeCartRecord(collection: string, record: Record<string, unknown>): NormalizedRecord {
  const query = pickString(record, ["search_query", "query", "searchQuery"]);
  const product = pickString(record, ["product_name", "productName", "product"]);
  const numericProductId = pickNumber(record, ["product_id"]);
  const productId =
    numericProductId != null
      ? String(numericProductId)
      : normalizeProductIdCandidate(pickString(record, ["product_id", "productId"]));

  return {
    id:
      pickString(record, ["event_id", "id"]) ??
      `cart-${slugify(query ?? product ?? collection)}-${pickString(record, ["timestamp", "created_at", "createdAt"]) ?? crypto.randomUUID()}`,
    collection,
    timestamp: pickDate(record),
    revenue: pickNumber(record, ["price", "value", "amount"]),
    customer: undefined,
    product,
    region: undefined,
    channel: "cart",
    team: undefined,
    status: pickString(record, ["conversion_type", "event_type", "funnel_stage"]) ?? "add_to_cart",
    isException: false,
    isClosed: false,
    summary: product ? `Added to cart: ${product}` : `${collection} record`,
    query,
    sessionId: pickString(record, ["session_id", "sessionId"]),
    userId: pickString(record, ["user_id", "userId"]),
    ipAddress: pickString(record, ["ip_address", "ipAddress"]),
    productId,
    quantity: pickNumber(record, ["quantity"]),
    resultsCount: undefined,
    matchedProducts: undefined,
    eventType: "add_to_cart"
  };
}

export function normalizeGenericRecord(collection: string, input: unknown): NormalizedRecord {
  const record = asRecord(input);
  if (collection === "queries") {
    return normalizeQueryRecord(collection, record);
  }
  if (collection === "product_clicks") {
    return normalizeProductClickRecord(collection, record);
  }
  if (collection === "profiles") {
    return normalizeProfileRecord(collection, record);
  }
  if (collection === "cart") {
    return normalizeCartRecord(collection, record);
  }

  const status = pickString(record, STATUS_FIELDS);
  const customer = pickString(record, CUSTOMER_FIELDS);
  const product = pickString(record, PRODUCT_FIELDS);
  const revenue = pickNumber(record, REVENUE_FIELDS);
  const query = pickString(record, QUERY_FIELDS);
  const resultsCount = pickNumber(record, RESULT_FIELDS);
  const summarySource =
    pickString(record, ["title", "name", "description", "summary"]) ??
    [query, customer, product, status].filter(Boolean).join(" / ");

  return {
    id: String(record._id ?? crypto.randomUUID()),
    collection,
    timestamp: pickDate(record),
    revenue,
    customer,
    product,
    region: pickString(record, REGION_FIELDS),
    channel: pickString(record, CHANNEL_FIELDS),
    team: pickString(record, TEAM_FIELDS),
    status,
    isException: detectException(status, record),
    isClosed: detectClosed(status),
    summary: summarySource || `${collection} record`,
    query,
    sessionId: pickString(record, SESSION_FIELDS),
    userId: pickString(record, USER_FIELDS),
    ipAddress: pickString(record, IP_FIELDS),
    productId:
      pickNumber(record, ["product_id"]) != null
        ? String(pickNumber(record, ["product_id"]))
        : pickString(record, ["product_id", "productId"]),
    quantity: pickNumber(record, ["quantity"]),
    resultsCount,
    matchedProducts: resultsCount,
    eventType: detectEventType(status, revenue, product, record),
    source: normalizeSource(record)
  };
}

function flattenKeys(record: Record<string, unknown>) {
  return Object.keys(record);
}

export async function inspectCollection(db: Db, collectionName: string): Promise<CollectionHealth> {
  const collection = db.collection(collectionName);
  const samples = await collection.find({}, { projection: { _id: 1 } }).limit(50).toArray();
  const fullSamples = samples.length
    ? await collection.find({ _id: { $in: samples.map((item) => item._id) } }).limit(50).toArray()
    : [];

  const sampleFields = Array.from(
    new Set(
      fullSamples.flatMap((sample) =>
        flattenKeys(sample as Record<string, unknown>).filter((key) => key !== "_id")
      )
    )
  );

  const timestampField = TIMESTAMP_CANDIDATES.find((field) => sampleFields.includes(field));
  const statusField = STATUS_CANDIDATES.find((field) => sampleFields.includes(field));
  const dimensionFields = DIMENSION_CANDIDATES.filter((field) => sampleFields.includes(field));

  let latestTimestamp: string | undefined;
  if (timestampField) {
    const latest = await collection
      .find(
        { [timestampField]: { $exists: true } },
        { sort: { [timestampField]: -1 }, projection: { [timestampField]: 1 } }
      )
      .limit(1)
      .toArray();
    const raw = latest[0]?.[timestampField];
    const date = raw ? new Date(raw as string | number | Date) : undefined;
    latestTimestamp = date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  }

  const estimatedCount = await collection.estimatedDocumentCount();
  const nullCount = fullSamples.reduce((total, sample) => {
    const values = Object.values(sample as Record<string, unknown>);
    return total + values.filter((value) => value == null).length;
  }, 0);

  const totalValues = fullSamples.reduce(
    (total, sample) => total + Object.keys(sample as Record<string, unknown>).length,
    0
  );
  const freshnessHours = latestTimestamp
    ? Math.max(0, (Date.now() - new Date(latestTimestamp).getTime()) / 36e5)
    : undefined;

  return {
    collection: collectionName,
    estimatedCount,
    timestampField,
    statusField,
    dimensionFields,
    sampleFields: sampleFields.slice(0, 16),
    nullRate: totalValues ? nullCount / totalValues : 0,
    latestTimestamp,
    freshnessHours,
    warning: !timestampField ? "No canonical timestamp field detected." : undefined
  };
}

export async function inspectCollections(db: Db, collections: string[]) {
  const results = await Promise.allSettled(collections.map((collection) => inspectCollection(db, collection)));

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      collection: collections[index],
      estimatedCount: 0,
      dimensionFields: [],
      sampleFields: [],
      nullRate: 0,
      warning: "Collection inspection failed."
    } satisfies CollectionHealth;
  });
}
