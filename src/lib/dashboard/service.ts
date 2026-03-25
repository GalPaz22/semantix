import type {
  ApiResponse,
  AttributionDashboardData,
  CollectionHealth,
  CustomerProfilePageData,
  CustomersDashboardData,
  DashboardFilters,
  DataFreshness,
  DataHealthData,
  DimensionOption,
  FilterOptionsData,
  NormalizedRecord,
  OperationsData,
  ProductsDashboardData,
  QueriesDashboardData,
  SemantixOverviewData
} from "@/lib/dashboard/types";

import { buildAttribution, buildCustomerProfile, buildCustomersDashboard, buildInsightsDashboard, buildProductsDashboard, buildQueriesDashboard, buildSemantixOverview } from "@/lib/dashboard/semantix";
import { inspectCollections, normalizeGenericRecord } from "@/lib/dashboard/live-data";
import { getCurrentDashboardContext, getDashboardMongoClient } from "@/lib/dashboard/runtime";

type DashboardSnapshot = {
  dbName: string;
  collections: CollectionHealth[];
  records: NormalizedRecord[];
  warnings: string[];
  errors: string[];
};

type SnapshotCacheEntry = {
  snapshot: DashboardSnapshot;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __semantixDashboardSnapshotCache__: Map<string, SnapshotCacheEntry> | undefined;
}

const SNAPSHOT_TTL_MS = 30_000;
const DEFAULT_ANALYTICS_COLLECTIONS = ["queries", "profiles", "product_clicks", "cart"] as const;

function getSnapshotCache() {
  if (!global.__semantixDashboardSnapshotCache__) {
    global.__semantixDashboardSnapshotCache__ = new Map<string, SnapshotCacheEntry>();
  }

  return global.__semantixDashboardSnapshotCache__;
}

function applyFilters(records: NormalizedRecord[], filters: DashboardFilters) {
  const from = new Date(filters.from);
  const to = new Date(filters.to);
  to.setHours(23, 59, 59, 999);

  return records.filter((record) => {
    if (record.timestamp) {
      if (record.timestamp < from || record.timestamp > to) {
        return false;
      }
    }

    if (filters.region && record.region !== filters.region) {
      return false;
    }
    if (filters.status && record.status !== filters.status) {
      return false;
    }
    if (filters.channel && record.channel !== filters.channel) {
      return false;
    }
    if (filters.product && record.product !== filters.product) {
      return false;
    }
    if (filters.team && record.team !== filters.team) {
      return false;
    }

    return true;
  });
}

function buildOperationsData(records: NormalizedRecord[], filters: DashboardFilters): OperationsData {
  const filtered = applyFilters(records, filters);
  const statusCounts = new Map<string, number>();
  const exceptionCount = filtered.filter((record) => record.isException).length;

  for (const record of filtered) {
    const status = record.status ?? "לא ידוע";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  return {
    backlogCount: filtered.filter((record) => !record.isClosed).length,
    exceptionRate: filtered.length ? exceptionCount / filtered.length : 0,
    statusBreakdown: Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value })),
    records: filtered
      .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0))
      .slice(0, 20)
      .map((record) => ({
        id: record.id,
        collection: record.collection,
        timestamp: record.timestamp?.toISOString(),
        customer: record.customer,
        product: record.product,
        region: record.region,
        channel: record.channel,
        team: record.team,
        status: record.status,
        revenue: record.revenue,
        isException: record.isException,
        isClosed: record.isClosed,
        summary: record.summary
      }))
  };
}

function buildFilterOptions(records: NormalizedRecord[]): FilterOptionsData {
  const collect = (field: keyof NormalizedRecord) =>
    Array.from(new Set(records.map((record) => record[field]).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 100)
      .map((value) => ({ label: value, value })) satisfies DimensionOption[];

  return {
    regions: collect("region"),
    statuses: collect("status"),
    channels: collect("channel"),
    products: collect("product"),
    teams: collect("team")
  };
}

function buildFreshness(collections: CollectionHealth[]): DataFreshness {
  const hours = collections
    .map((collection) => collection.freshnessHours)
    .filter((value): value is number => value != null);

  if (!hours.length) {
    return { status: "unknown" };
  }

  const maxFreshnessHours = Math.max(...hours);
  const latestCollection = collections
    .filter((collection) => collection.latestTimestamp)
    .sort((a, b) => (b.latestTimestamp ?? "").localeCompare(a.latestTimestamp ?? ""))[0];

  return {
    status: maxFreshnessHours >= 72 ? "stale" : maxFreshnessHours >= 24 ? "aging" : "fresh",
    asOf: latestCollection?.latestTimestamp,
    maxFreshnessHours
  };
}

function baseResponse<T>(
  filters: DashboardFilters,
  data: T,
  collections: CollectionHealth[],
  warnings: string[],
  errors: string[]
): ApiResponse<T> {
  return {
    filtersApplied: filters,
    generatedAt: new Date().toISOString(),
    dataFreshness: buildFreshness(collections),
    data,
    warnings,
    errors
  };
}

function resolveConfiguredCollections() {
  const configured = process.env.MONGODB_COLLECTIONS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured?.length ? configured : [...DEFAULT_ANALYTICS_COLLECTIONS];
}

async function resolveAnalyticsCollections(dbName: string) {
  const client = await getDashboardMongoClient();
  const db = client.db(dbName);
  const available = (await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name);
  const configured = resolveConfiguredCollections();
  const resolved = configured.filter((collection) => available.includes(collection));
  const missing = configured.filter((collection) => !available.includes(collection));

  return {
    db,
    available,
    resolved,
    missing
  };
}

async function loadCollectionRecords(
  db: Awaited<ReturnType<typeof resolveAnalyticsCollections>>["db"],
  collectionName: string,
  timestampField?: string
) {
  const collection = db.collection(collectionName);
  const limit = 10_000;
  const cursor = timestampField
    ? collection.find({ [timestampField]: { $exists: true } }).sort({ [timestampField]: -1 }).limit(limit)
    : collection.find({}).limit(limit);

  return cursor.toArray();
}

async function loadSnapshotUncached(dbName: string): Promise<DashboardSnapshot> {
  try {
    const { db, available, resolved, missing } = await resolveAnalyticsCollections(dbName);

    if (!resolved.length) {
      return {
        dbName,
        collections: [],
        records: [],
        warnings: [],
        errors: [
          `לא נמצאו קולקציות אנליטיקה תואמות ב־${dbName}. הקולקציות הזמינות: ${available.join(", ") || "אין"}`
        ]
      };
    }

    const collections = await inspectCollections(db, resolved);
    const warnings = missing.length
      ? [`חסרות בדאטהבייס ${dbName} הקולקציות: ${missing.join(", ")}`]
      : [];
    const errors: string[] = [];

    const settled = await Promise.allSettled(
      collections.map(async (collection) => {
        const raw = await loadCollectionRecords(db, collection.collection, collection.timestampField);
        return raw.map((record) => normalizeGenericRecord(collection.collection, record));
      })
    );

    const records = settled.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      errors.push(`לא ניתן היה לטעון נתונים מתוך ${collections[index]?.collection ?? "unknown"}.`);
      return [];
    });

    for (const collection of collections) {
      if (collection.warning) {
        warnings.push(`${collection.collection}: ${collection.warning}`);
      }
    }

    return {
      dbName,
      collections,
      records,
      warnings,
      errors
    };
  } catch (error) {
    return {
      dbName,
      collections: [],
      records: [],
      warnings: [],
      errors: [error instanceof Error ? error.message : "Unknown dashboard error."]
    };
  }
}

async function loadSnapshot(dbName: string) {
  const cache = getSnapshotCache();
  const now = Date.now();
  const cached = cache.get(dbName);

  if (cached && cached.expiresAt > now) {
    return cached.snapshot;
  }

  const snapshot = await loadSnapshotUncached(dbName);
  cache.set(dbName, {
    snapshot,
    expiresAt: now + SNAPSHOT_TTL_MS
  });

  return snapshot;
}

async function getLiveSnapshot() {
  const { dbName } = await getCurrentDashboardContext();
  return loadSnapshot(dbName);
}

export async function getOperationsView(filters: DashboardFilters): Promise<ApiResponse<OperationsData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    buildOperationsData(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getDataHealthView(filters: DashboardFilters): Promise<ApiResponse<DataHealthData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    {
      collections: snapshot.collections
    },
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getFilterOptions(filters: DashboardFilters): Promise<ApiResponse<FilterOptionsData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    buildFilterOptions(snapshot.records),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getSemantixOverview(filters: DashboardFilters): Promise<ApiResponse<SemantixOverviewData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    buildSemantixOverview(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getAttributionView(filters: DashboardFilters): Promise<ApiResponse<AttributionDashboardData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    buildAttribution(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getSemantixInsightsView(
  filters: DashboardFilters
): Promise<ApiResponse<import("@/lib/dashboard/types").InsightsDashboardData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    buildInsightsDashboard(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getCustomersView(
  filters: DashboardFilters
): Promise<ApiResponse<CustomersDashboardData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    buildCustomersDashboard(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getCustomerProfileView(
  filters: DashboardFilters,
  profileId: string
): Promise<ApiResponse<CustomerProfilePageData> | null> {
  const snapshot = await getLiveSnapshot();
  const detail = buildCustomerProfile(snapshot.records, filters, profileId);
  if (!detail) {
    return null;
  }

  return baseResponse(filters, detail, snapshot.collections, snapshot.warnings, snapshot.errors);
}

export async function getProductsView(
  filters: DashboardFilters
): Promise<ApiResponse<ProductsDashboardData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    buildProductsDashboard(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getQueriesView(
  filters: DashboardFilters
): Promise<ApiResponse<QueriesDashboardData>> {
  const snapshot = await getLiveSnapshot();
  return baseResponse(
    filters,
    buildQueriesDashboard(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}
