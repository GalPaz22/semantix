import { ObjectId } from "mongodb";
import { z } from "zod";

import type {
  BoostApiResponse,
  BoostDashboardData,
  BoostFilters,
  BoostLevel,
  BoostProductRow,
  BoostSummary,
  DimensionOption
} from "@/lib/dashboard/types";

import { getCurrentDashboardContext } from "@/lib/dashboard/runtime";

const PAGE_SIZE = 50;
const PRODUCTS_COLLECTION = "products";

const boostFiltersSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  boostState: z.enum(["all", "boosted", "not-boosted"]).default("all"),
  sort: z.enum(["name", "clicks", "carts", "boost-high", "price-high", "price-low"]).default("boost-high"),
  page: z.coerce.number().int().positive().default(1)
});

const boostWriteSchema = z.object({
  productId: z.string().min(1),
  boost: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
});

function getPathValue(record: Record<string, unknown>, path?: string) {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, record);
}

function asString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  return undefined;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function asBoostLevel(value: unknown): BoostLevel {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  if (value === 1 || value === 2 || value === 3) {
    return value;
  }

  return 0;
}

function getFirstString(record: Record<string, unknown>, candidates: string[]) {
  for (const candidate of candidates) {
    const value = getPathValue(record, candidate);
    const normalized = asString(value);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function getStringList(record: Record<string, unknown>, candidates: string[]) {
  for (const candidate of candidates) {
    const value = getPathValue(record, candidate);
    if (Array.isArray(value)) {
      return value
        .flatMap((entry) => {
          if (typeof entry === "object" && entry !== null) {
            const named = asString((entry as Record<string, unknown>).name);
            return named ? [named] : [];
          }

          const normalized = asString(entry);
          return normalized ? [normalized] : [];
        })
        .filter((entry, index, all) => all.indexOf(entry) === index);
    }

    const normalized = asString(value);
    if (normalized) {
      return [normalized];
    }
  }

  return [] as string[];
}

function normalizeKey(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ");
}

function mapBoostProductDocument(document: Record<string, unknown>): BoostProductRow | null {
  const id =
    asString(getPathValue(document, "id")) ??
    asString(getPathValue(document, "_id")) ??
    asString(getPathValue(document, "product_id"));
  const name =
    getFirstString(document, ["name", "productName", "title", "product_name"]) ??
    getFirstString(document, ["heName", "displayName"]);

  if (!id || !name) {
    return null;
  }

  const categoryList = getStringList(document, [
    "category",
    "categories",
    "categories.name",
    "mainCategory",
    "type"
  ]);

  return {
    id,
    name,
    category: categoryList[0] ?? getFirstString(document, ["category.name", "mainCategory", "category"]),
    softCategories: [
      ...categoryList.slice(1),
      ...getStringList(document, ["softCategories", "softCategory", "tags", "keywords"])
    ].filter((entry, index, all) => all.indexOf(entry) === index),
    type: getFirstString(document, ["type", "productType"]),
    status:
      getFirstString(document, ["status", "stockStatus", "inventoryStatus"]) ??
      (getPathValue(document, "inStock") === true ? "In Stock" : getPathValue(document, "inStock") === false ? "Out of Stock" : undefined),
    price:
      asNumber(getPathValue(document, "price")) ??
      asNumber(getPathValue(document, "salePrice")) ??
      asNumber(getPathValue(document, "amount")),
    imageUrl:
      getFirstString(document, ["image", "imageUrl", "image.url", "images.0.src", "images.0.url"]) ?? undefined,
    currentBoost: asBoostLevel(getPathValue(document, "boost")),
    clicks: 0,
    carts: 0
  };
}

async function loadAnalyticsProductMetrics() {
  const { db } = await getCurrentDashboardContext();
  const availableCollections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name);

  if (!availableCollections.includes("product_clicks") && !availableCollections.includes("cart")) {
    return {
      clicksByProduct: new Map<string, number>(),
      cartsByProduct: new Map<string, number>()
    };
  }

  const [clickDocs, cartDocs] = await Promise.all([
    availableCollections.includes("product_clicks")
      ? db.collection("product_clicks").find({}, { projection: { product_name: 1 } }).limit(20000).toArray()
      : Promise.resolve([]),
    availableCollections.includes("cart")
      ? db.collection("cart").find({}, { projection: { product_name: 1 } }).limit(20000).toArray()
      : Promise.resolve([])
  ]);

  const clicksByProduct = new Map<string, number>();
  const cartsByProduct = new Map<string, number>();

  for (const doc of clickDocs) {
    const key = normalizeKey(asString((doc as Record<string, unknown>).product_name));
    if (!key) continue;
    clicksByProduct.set(key, (clicksByProduct.get(key) ?? 0) + 1);
  }

  for (const doc of cartDocs) {
    const key = normalizeKey(asString((doc as Record<string, unknown>).product_name));
    if (!key) continue;
    cartsByProduct.set(key, (cartsByProduct.get(key) ?? 0) + 1);
  }

  return {
    clicksByProduct,
    cartsByProduct
  };
}

function attachAnalyticsMetrics(
  rows: BoostProductRow[],
  analytics: Awaited<ReturnType<typeof loadAnalyticsProductMetrics>>
) {
  return rows.map((row) => {
    const key = normalizeKey(row.name);
    return {
      ...row,
      clicks: key ? analytics.clicksByProduct.get(key) ?? 0 : 0,
      carts: key ? analytics.cartsByProduct.get(key) ?? 0 : 0
    };
  });
}

function sortBoostProducts(rows: BoostProductRow[], sort: NonNullable<BoostFilters["sort"]>) {
  const sorted = [...rows];

  sorted.sort((a, b) => {
    switch (sort) {
      case "clicks":
        if (b.clicks !== a.clicks) return b.clicks - a.clicks;
        if (b.carts !== a.carts) return b.carts - a.carts;
        if (b.currentBoost !== a.currentBoost) return b.currentBoost - a.currentBoost;
        return a.name.localeCompare(b.name);
      case "carts":
        if (b.carts !== a.carts) return b.carts - a.carts;
        if (b.clicks !== a.clicks) return b.clicks - a.clicks;
        if (b.currentBoost !== a.currentBoost) return b.currentBoost - a.currentBoost;
        return a.name.localeCompare(b.name);
      case "price-high":
        return (b.price ?? -Infinity) - (a.price ?? -Infinity) || a.name.localeCompare(b.name);
      case "price-low":
        return (a.price ?? Infinity) - (b.price ?? Infinity) || a.name.localeCompare(b.name);
      case "name":
        return a.name.localeCompare(b.name);
      case "boost-high":
      default:
        if (b.currentBoost !== a.currentBoost) return b.currentBoost - a.currentBoost;
        if (b.clicks !== a.clicks) return b.clicks - a.clicks;
        if (b.carts !== a.carts) return b.carts - a.carts;
        return a.name.localeCompare(b.name);
    }
  });

  return sorted;
}

function buildBoostSummary(allProducts: BoostProductRow[]): BoostSummary {
  const boostedProducts = allProducts.filter((product) => product.currentBoost > 0);
  const rankedBoostedProducts = [...boostedProducts].sort((a, b) => {
    if (b.clicks !== a.clicks) return b.clicks - a.clicks;
    if (b.carts !== a.carts) return b.carts - a.carts;
    return b.currentBoost - a.currentBoost;
  });
  const topBoostedProduct = rankedBoostedProducts[0];
  const boostedClicks = boostedProducts.reduce((sum, product) => sum + product.clicks, 0);
  const boostedCarts = boostedProducts.reduce((sum, product) => sum + product.carts, 0);
  const boostLevelCounts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };

  for (const product of boostedProducts) {
    if (product.currentBoost === 1 || product.currentBoost === 2 || product.currentBoost === 3) {
      boostLevelCounts[product.currentBoost] += 1;
    }
  }

  return {
    totalProducts: allProducts.length,
    boostedProducts: boostedProducts.length,
    boostedClicks,
    boostedCarts,
    avgClicksPerBoostedProduct: boostedProducts.length ? boostedClicks / boostedProducts.length : 0,
    boostCoverage: allProducts.length ? boostedProducts.length / allProducts.length : 0,
    boostLevelCounts,
    topBoostedProduct: topBoostedProduct
      ? {
          id: topBoostedProduct.id,
          name: topBoostedProduct.name,
          clicks: topBoostedProduct.clicks,
          carts: topBoostedProduct.carts,
          boost: topBoostedProduct.currentBoost,
          price: topBoostedProduct.price
        }
      : undefined,
    topBoostedProducts: rankedBoostedProducts.slice(0, 5).map((product) => ({
      id: product.id,
      name: product.name,
      clicks: product.clicks,
      carts: product.carts,
      boost: product.currentBoost,
      price: product.price
    }))
  };
}

function serializeResponse(data: BoostDashboardData, warnings: string[] = [], errors: string[] = []): BoostApiResponse {
  return {
    generatedAt: new Date().toISOString(),
    data,
    warnings,
    errors
  };
}

function emptyData(filters: BoostFilters): BoostDashboardData {
  return {
    products: [],
    pagination: {
      page: filters.page,
      pageSize: PAGE_SIZE,
      totalItems: 0,
      totalPages: 1
    },
    categories: [],
    filtersApplied: filters,
    summary: {
      totalProducts: 0,
      boostedProducts: 0,
      boostedClicks: 0,
      boostedCarts: 0,
      avgClicksPerBoostedProduct: 0,
      boostCoverage: 0,
      boostLevelCounts: { 1: 0, 2: 0, 3: 0 },
      topBoostedProducts: []
    }
  };
}

export function parseBoostFilters(
  input: URLSearchParams | Record<string, string | string[] | undefined>
): BoostFilters {
  const getValue = (key: keyof BoostFilters) => {
    if (input instanceof URLSearchParams) {
      return input.get(key) ?? undefined;
    }

    const value = input[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return boostFiltersSchema.parse({
    query: getValue("query"),
    category: getValue("category"),
    boostState: getValue("boostState"),
    sort: getValue("sort"),
    page: getValue("page")
  }) as BoostFilters;
}

export async function listBoostProducts(filters: BoostFilters): Promise<BoostApiResponse> {
  try {
    const { db, dbName } = await getCurrentDashboardContext();
    const availableCollections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name);

    if (!availableCollections.includes(PRODUCTS_COLLECTION)) {
      return serializeResponse(
        emptyData(filters),
        [],
        [`לא נמצאה הקולקציה ${PRODUCTS_COLLECTION} ב־${dbName}.`]
      );
    }

    const collection = db.collection(PRODUCTS_COLLECTION);
    const query: Record<string, unknown> = {};

    if (filters.query) {
      query.name = { $regex: filters.query, $options: "i" };
    }

    if (filters.category) {
      query.$or = [
        { category: filters.category },
        { categories: filters.category },
        { softCategory: filters.category },
        { softCategories: filters.category }
      ];
    }

    if (filters.boostState === "boosted") {
      query.boost = { $in: [1, 2, 3] };
    }

    if (filters.boostState === "not-boosted") {
      query.$and = [
        ...(Array.isArray(query.$and) ? query.$and : []),
        { $or: [{ boost: { $exists: false } }, { boost: 0 }, { boost: null }] }
      ];
    }

    const [documents, totalItems, allDocuments, analytics] = await Promise.all([
      collection.find(query).limit(20000).toArray(),
      collection.countDocuments(query),
      collection.find({}).limit(20000).toArray(),
      loadAnalyticsProductMetrics()
    ]);

    const allProducts = attachAnalyticsMetrics(
      allDocuments
        .map((document) => mapBoostProductDocument(document as Record<string, unknown>))
        .filter((row): row is BoostProductRow => row != null),
      analytics
    );

    const filteredProducts = sortBoostProducts(
      attachAnalyticsMetrics(
        documents
          .map((document) => mapBoostProductDocument(document as Record<string, unknown>))
          .filter((row): row is BoostProductRow => row != null),
        analytics
      ),
      filters.sort ?? "boost-high"
    );

    const skip = (filters.page - 1) * PAGE_SIZE;
    const pagedProducts = filteredProducts.slice(skip, skip + PAGE_SIZE);

    const categories = allProducts
      .flatMap((product) => [product.category, ...product.softCategories])
      .filter((value): value is string => Boolean(value))
      .filter((value, index, all) => all.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value })) satisfies DimensionOption[];

    const warnings = !availableCollections.includes("product_clicks") || !availableCollections.includes("cart")
      ? ["חלק ממדדי הקליקים או העגלות למוצרים אינם זמינים כי חסרות קולקציות אנליטיקה משלימות."]
      : [];

    return serializeResponse({
      products: pagedProducts,
      pagination: {
        page: filters.page,
        pageSize: PAGE_SIZE,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
      },
      categories,
      filtersApplied: filters,
      summary: buildBoostSummary(allProducts)
    }, warnings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "לא ניתן לטעון את מוצרי הבוסט.";
    return serializeResponse(emptyData(filters), [], [message]);
  }
}

function buildProductFilter(productId: string) {
  if (ObjectId.isValid(productId)) {
    return {
      $or: [{ _id: new ObjectId(productId) }, { id: productId }]
    };
  }

  if (/^\d+$/.test(productId)) {
    return {
      $or: [{ id: productId }, { id: Number(productId) }]
    };
  }

  return { id: productId };
}

export function parseBoostWritePayload(input: unknown) {
  return boostWriteSchema.parse(input);
}

export async function updateProductBoost(productId: string, boost: BoostLevel) {
  const { db, dbName } = await getCurrentDashboardContext();
  const availableCollections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name);

  if (!availableCollections.includes(PRODUCTS_COLLECTION)) {
    throw new Error(`הקולקציה ${PRODUCTS_COLLECTION} לא קיימת ב־${dbName}.`);
  }

  const collection = db.collection(PRODUCTS_COLLECTION);
  const filter = buildProductFilter(productId);
  const update =
    boost === 0
      ? { $unset: { boost: "" } }
      : { $set: { boost } };

  const result = await collection.updateOne(filter, update);

  if (!result.matchedCount) {
    throw new Error("המוצר לא נמצא בקולקציית המוצרים.");
  }

  return { ok: true as const };
}
