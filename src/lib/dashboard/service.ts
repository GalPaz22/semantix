import type {
  ApiResponse,
  AttributionDashboardData,
  CollectionHealth,
  CustomerProfilePageData,
  CustomersDashboardData,
  DashboardFilters,
  DataFreshness,
  DataHealthData,
  FilterOptionsData,
  InsightsData,
  InsightsDashboardData,
  OverviewData,
  OperationsData,
  ProductsDashboardData,
  QueriesDashboardData,
  SemantixOverviewData
} from "@/lib/dashboard/types";

import { cache } from "react";

import { buildFilterOptions, buildKpis, buildOperationsData, buildOverviewDimensions, buildTrendPoints, splitCurrentAndPrevious } from "@/lib/analytics/metrics";
import { getEnv } from "@/lib/config/env";
import { inspectCollections } from "@/lib/data/discovery";
import { demoSemantixRecords } from "@/lib/dashboard/demo";
import { buildAttribution, buildCustomerProfile, buildCustomersDashboard, buildInsightsDashboard, buildProductsDashboard, buildQueriesDashboard, buildSemantixOverview } from "@/lib/dashboard/semantix";
import { normalizeGenericRecord } from "@/lib/data/normalizers/generic";
import { generateInsights } from "@/lib/insights/rules";
import { getMongoDb } from "@/lib/mongodb/client";

type DashboardSnapshot = {
  collections: CollectionHealth[];
  records: ReturnType<typeof normalizeGenericRecord>[];
  warnings: string[];
  errors: string[];
  usingDemoData?: boolean;
};

type SnapshotCacheEntry = {
  snapshot: DashboardSnapshot;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __dashboardSnapshotCache__: SnapshotCacheEntry | undefined;
}

const SNAPSHOT_TTL_MS = 30_000;

function fallbackResponse<T>(filters: DashboardFilters, data: T, error: unknown): ApiResponse<T> {
  const message = error instanceof Error ? error.message : "Unknown dashboard error.";
  return {
    filtersApplied: filters,
    generatedAt: new Date().toISOString(),
    dataFreshness: {
      status: "unknown"
    },
    data,
    warnings: [],
    errors: [message]
  };
}

async function loadCollectionRecords(collectionName: string, timestampField?: string) {
  const db = await getMongoDb();
  const collection = db.collection(collectionName);
  const limit = 10_000;
  const cursor = timestampField
    ? collection.find({ [timestampField]: { $exists: true } }).sort({ [timestampField]: -1 }).limit(limit)
    : collection.find({}).limit(limit);

  return cursor.toArray();
}

async function loadSnapshotUncached(): Promise<DashboardSnapshot> {
  try {
    const { collections: collectionNames } = getEnv();
    const collections = await inspectCollections(collectionNames);
    const warnings: string[] = [];
    const errors: string[] = [];

    const settled = await Promise.allSettled(
      collections.map(async (collection) => {
        const raw = await loadCollectionRecords(collection.collection, collection.timestampField);
        return raw.map((record) => normalizeGenericRecord(collection.collection, record));
      })
    );

    const records = settled.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      errors.push(`Unable to load records for ${collections[index]?.collection ?? "unknown collection"}.`);
      return [];
    });

    for (const collection of collections) {
      if (collection.warning) {
        warnings.push(`${collection.collection}: ${collection.warning}`);
      }
    }

    if (!records.length) {
      return {
        collections,
        records: demoSemantixRecords,
        warnings: [...warnings, "Showing demo Semantix analytics while live MongoDB data is unavailable."],
        errors,
        usingDemoData: true
      };
    }

    return {
      collections,
      records,
      warnings,
      errors
    };
  } catch (error) {
    return {
      collections: [],
      records: demoSemantixRecords,
      warnings: ["Showing demo Semantix analytics while MongoDB configuration is incomplete."],
      errors: [error instanceof Error ? error.message : "Unknown dashboard error."],
      usingDemoData: true
    };
  }
}

const loadSnapshot = cache(async (): Promise<DashboardSnapshot> => {
  const now = Date.now();
  const cached = global.__dashboardSnapshotCache__;

  if (cached && cached.expiresAt > now) {
    return cached.snapshot;
  }

  const snapshot = await loadSnapshotUncached();
  global.__dashboardSnapshotCache__ = {
    snapshot,
    expiresAt: now + SNAPSHOT_TTL_MS
  };

  return snapshot;
});

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

export async function getOverviewData(filters: DashboardFilters): Promise<ApiResponse<OverviewData>> {
  const snapshot = await loadSnapshot();
  const { current, previous } = splitCurrentAndPrevious(snapshot.records, filters);
  const insights = generateInsights(snapshot.records, filters, snapshot.collections);
  const dimensions = buildOverviewDimensions(snapshot.records, filters);

  return baseResponse(
    filters,
    {
      headline: snapshot.usingDemoData
        ? "Demo data is active while Semantix waits for live MongoDB search events."
        : "Sales and operations pulse across your configured MongoDB collections.",
      kpis: buildKpis(current, previous),
      trends: buildTrendPoints(snapshot.records, filters),
      insights: insights.slice(0, 4),
      topCustomers: dimensions.topCustomers,
      topProducts: dimensions.topProducts
    },
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getOperationsView(filters: DashboardFilters): Promise<ApiResponse<OperationsData>> {
  const snapshot = await loadSnapshot();
  return baseResponse(
    filters,
    buildOperationsData(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getInsightsView(filters: DashboardFilters): Promise<ApiResponse<InsightsData>> {
  const snapshot = await loadSnapshot();
  return baseResponse(
    filters,
    {
      insights: generateInsights(snapshot.records, filters, snapshot.collections)
    },
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getDataHealthView(filters: DashboardFilters): Promise<ApiResponse<DataHealthData>> {
  const snapshot = await loadSnapshot();
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
  const snapshot = await loadSnapshot();
  return baseResponse(
    filters,
    buildFilterOptions(snapshot.records),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getSemantixOverview(filters: DashboardFilters): Promise<ApiResponse<SemantixOverviewData>> {
  const snapshot = await loadSnapshot();
  return baseResponse(
    filters,
    buildSemantixOverview(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}

export async function getAttributionView(filters: DashboardFilters): Promise<ApiResponse<AttributionDashboardData>> {
  const snapshot = await loadSnapshot();
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
): Promise<ApiResponse<InsightsDashboardData>> {
  const snapshot = await loadSnapshot();
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
  const snapshot = await loadSnapshot();
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
  const snapshot = await loadSnapshot();
  const detail = buildCustomerProfile(snapshot.records, filters, profileId);
  if (!detail) {
    return null;
  }

  return baseResponse(filters, detail, snapshot.collections, snapshot.warnings, snapshot.errors);
}

export async function getProductsView(
  filters: DashboardFilters
): Promise<ApiResponse<ProductsDashboardData>> {
  const snapshot = await loadSnapshot();
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
  const snapshot = await loadSnapshot();
  return baseResponse(
    filters,
    buildQueriesDashboard(snapshot.records, filters),
    snapshot.collections,
    snapshot.warnings,
    snapshot.errors
  );
}
