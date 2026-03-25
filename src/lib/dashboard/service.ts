import type {
  ApiResponse,
  AttributionDashboardData,
  CustomerProfilePageData,
  CustomersDashboardData,
  DashboardFilters,
  DataHealthData,
  FilterOptionsData,
  InsightsDashboardData,
  OperationsData,
  ProductsDashboardData,
  QueriesDashboardData,
  SemantixOverviewData,
  NormalizedRecord
} from "@/lib/dashboard/types";

import { demoSemantixRecords } from "@/lib/dashboard/demo";
import { buildAttribution, buildCustomerProfile, buildCustomersDashboard, buildInsightsDashboard, buildProductsDashboard, buildQueriesDashboard, buildSemantixOverview } from "@/lib/dashboard/semantix";
const dashboardRecords = demoSemantixRecords as NormalizedRecord[];
const dashboardWarning = "המערכת מציגה כרגע דאטה דמו מובנה בדיפלוי הזה.";

function baseResponse<T>(
  filters: DashboardFilters,
  data: T
): ApiResponse<T> {
  return {
    filtersApplied: filters,
    generatedAt: new Date().toISOString(),
    dataFreshness: { status: "unknown" },
    data,
    warnings: [dashboardWarning],
    errors: []
  };
}

export async function getOperationsView(filters: DashboardFilters): Promise<ApiResponse<OperationsData>> {
  return baseResponse(
    filters,
    {
      backlogCount: 0,
      exceptionRate: 0,
      statusBreakdown: [],
      records: []
    }
  );
}

export async function getDataHealthView(filters: DashboardFilters): Promise<ApiResponse<DataHealthData>> {
  return baseResponse(
    filters,
    {
      collections: []
    }
  );
}

export async function getFilterOptions(filters: DashboardFilters): Promise<ApiResponse<FilterOptionsData>> {
  return baseResponse(
    filters,
    {
      regions: [],
      statuses: [],
      channels: [],
      products: [],
      teams: []
    }
  );
}

export async function getSemantixOverview(filters: DashboardFilters): Promise<ApiResponse<SemantixOverviewData>> {
  return baseResponse(filters, buildSemantixOverview(dashboardRecords, filters));
}

export async function getAttributionView(filters: DashboardFilters): Promise<ApiResponse<AttributionDashboardData>> {
  return baseResponse(filters, buildAttribution(dashboardRecords, filters));
}

export async function getSemantixInsightsView(
  filters: DashboardFilters
): Promise<ApiResponse<InsightsDashboardData>> {
  return baseResponse(filters, buildInsightsDashboard(dashboardRecords, filters));
}

export async function getCustomersView(
  filters: DashboardFilters
): Promise<ApiResponse<CustomersDashboardData>> {
  return baseResponse(filters, buildCustomersDashboard(dashboardRecords, filters));
}

export async function getCustomerProfileView(
  filters: DashboardFilters,
  profileId: string
): Promise<ApiResponse<CustomerProfilePageData> | null> {
  const detail = buildCustomerProfile(dashboardRecords, filters, profileId);
  if (!detail) {
    return null;
  }

  return baseResponse(filters, detail);
}

export async function getProductsView(
  filters: DashboardFilters
): Promise<ApiResponse<ProductsDashboardData>> {
  return baseResponse(filters, buildProductsDashboard(dashboardRecords, filters));
}

export async function getQueriesView(
  filters: DashboardFilters
): Promise<ApiResponse<QueriesDashboardData>> {
  return baseResponse(filters, buildQueriesDashboard(dashboardRecords, filters));
}
