export type TimeRange = {
  from: string;
  to: string;
};

export type DashboardFilters = TimeRange & {
  region?: string;
  status?: string;
  channel?: string;
  product?: string;
  team?: string;
};

export type MetricValue = {
  value: number;
  previousValue?: number;
  delta?: number;
  deltaLabel?: string;
  format: "currency" | "number" | "percent" | "duration";
};

export type TrendPoint = {
  label: string;
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  exceptions: number;
};

export type KpiCard = {
  id: string;
  label: string;
  description: string;
  metric: MetricValue;
  tone?: "default" | "success" | "warning" | "danger";
};

export type Insight = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  explanation: string;
  impactedMetric: string;
  comparisonWindow: string;
  recommendation: string;
  supportingValues: Record<string, string | number>;
  actionLabel?: string;
};

export type CollectionHealth = {
  collection: string;
  estimatedCount: number;
  timestampField?: string;
  statusField?: string;
  dimensionFields: string[];
  sampleFields: string[];
  nullRate: number;
  latestTimestamp?: string;
  freshnessHours?: number;
  warning?: string;
};

export type OperationalRecord = {
  id: string;
  collection: string;
  timestamp?: string;
  customer?: string;
  product?: string;
  region?: string;
  channel?: string;
  team?: string;
  status?: string;
  revenue?: number;
  isException: boolean;
  isClosed: boolean;
  summary: string;
};

export type DimensionOption = {
  label: string;
  value: string;
};

export type OverviewData = {
  headline: string;
  kpis: KpiCard[];
  trends: TrendPoint[];
  insights: Insight[];
  topCustomers: Array<{ label: string; value: number }>;
  topProducts: Array<{ label: string; value: number }>;
};

export type OperationsData = {
  backlogCount: number;
  exceptionRate: number;
  statusBreakdown: Array<{ label: string; value: number }>;
  records: OperationalRecord[];
};

export type InsightsData = {
  insights: Insight[];
};

export type DataHealthData = {
  collections: CollectionHealth[];
};

export type FilterOptionsData = {
  regions: DimensionOption[];
  statuses: DimensionOption[];
  channels: DimensionOption[];
  products: DimensionOption[];
  teams: DimensionOption[];
};

export type DataFreshness = {
  status: "fresh" | "aging" | "stale" | "unknown";
  asOf?: string;
  maxFreshnessHours?: number;
};

export type ApiResponse<T> = {
  filtersApplied: DashboardFilters;
  generatedAt: string;
  dataFreshness: DataFreshness;
  data: T;
  warnings: string[];
  errors: string[];
};

export type AttributionSource =
  | "native"
  | "zero-results"
  | "inject"
  | "rerank"
  | "ai"
  | "unknown";

export type NormalizedRecord = {
  id: string;
  collection: string;
  timestamp?: Date;
  revenue?: number;
  customer?: string;
  product?: string;
  region?: string;
  channel?: string;
  team?: string;
  status?: string;
  isException: boolean;
  isClosed: boolean;
  summary: string;
  query?: string;
  sessionId?: string;
  userId?: string;
  ipAddress?: string;
  resultsCount?: number;
  matchedProducts?: number;
  eventType?: "query" | "click" | "add_to_cart" | "purchase" | "profile";
  profileClicks?: number;
  profileTopQuery?: string;
  profilePreferenceTopics?: string[];
  source?: AttributionSource;
  productId?: string;
  quantity?: number;
  deliveredProductIds?: string[];
  deliveredProductNames?: string[];
};

export type SearchRevenuePoint = {
  date: string;
  revenue: number;
  queries: number;
  clicks: number;
  addToCart: number;
  purchases: number;
};

export type SearchFunnelStage = {
  label: string;
  value: number;
};

export type SearchCoreMetric = {
  label: string;
  value: number;
  format: "number" | "percent";
  description: string;
};

export type OverviewSearchCore = {
  totalQueries: number;
  totalProductClicks: number;
  totalAddToCarts: number;
  totalSearchValue: number;
  attributedAddToCarts: number;
  cartMatchRate: number;
};

export type SourceBreakdownRow = {
  source: AttributionSource;
  clicks: number;
  clickShare: number;
  attributedCarts: number;
  cartConversionFromClicks: number;
  attributedValue: number;
};

export type SearchActivityPoint = {
  date: string;
  queries: number;
  clicks: number;
  attributedCarts: number;
};

export type SourceTrendPoint = {
  date: string;
  native: number;
  zeroResults: number;
  inject: number;
  rerank: number;
  ai: number;
  unknown: number;
};

export type OverviewQueryRow = {
  id: string;
  query: string;
  timestamp?: string;
  source: AttributionSource;
  sources?: AttributionSource[];
  clickItems?: Array<{ product?: string; price?: number }>;
  addToCartItems?: Array<{ product?: string; price?: number }>;
  clickProduct?: string;
  clickPrice?: number;
  addToCartProduct?: string;
  addToCartPrice?: number;
  hasClick: boolean;
  hasAddToCart: boolean;
};

export type QueryPerformanceRow = {
  query: string;
  clicks: number;
  addToCart: number;
  revenueGenerated: number;
  resultsCount: number;
  purchases: number;
};

export type QueryAttributionRow = {
  query: string;
  clicks: number;
  attributedAddToCarts: number;
  topSource: AttributionSource;
  cartMatchRate: number;
  attributedValue: number;
  topSourceShare: number;
};

export type SearchInsightCard = {
  id: string;
  severity: "info" | "warning" | "critical";
  group: "revenue-opportunities" | "search-gaps" | "high-intent-wins" | "low-conversion-queries";
  title: string;
  text: string;
  explanation: string;
  impactMetric: string;
  actionLabel: string;
  contextLabel?: string;
  priorityScore?: number;
};

export type InsightsSummary = {
  total: number;
  critical: number;
  warning: number;
  info: number;
  strongestWin?: string;
  biggestGap?: string;
};

export type InsightGroup = {
  id: SearchInsightCard["group"];
  title: string;
  cards: SearchInsightCard[];
};

export type CustomerJourneyStep = {
  id: string;
  type: "search" | "click" | "cart" | "purchase";
  label: string;
  timestamp?: string;
  product?: string;
  value?: number;
};

export type CustomerSearchProfile = {
  id: string;
  label: string;
  identifier: string;
  identifierType: "user" | "session" | "ip";
  sessionId: string;
  ipAddress: string;
  userId?: string;
  totalSessionValue: number;
  totalAddToCarts: number;
  averageCartValue: number;
  totalClicks: number;
  totalSearches: number;
  topQuery?: string;
  preferredTopics: string[];
  lastSeen?: string;
  activeNow: boolean;
  sizeScore: number;
  rank: number;
  clusterGroup?: "high-value" | "active" | "engaged";
  positionSeed: number;
  journey: CustomerJourneyStep[];
};

export type CustomersSummary = {
  totalProfiles: number;
  activeNow: number;
  profilesWithCarts: number;
  attributedValue: number;
};

export type CustomerFeaturedLists = {
  topActiveNow: CustomerSearchProfile[];
  topValue: CustomerSearchProfile[];
  needsAttention: CustomerSearchProfile[];
};

export type ProductSearchPerformance = {
  product: string;
  clicks: number;
  addToCart: number;
  revenue: number;
  conversionRate: number;
};

export type AttributedValueEventRow = {
  product: string;
  query?: string;
  source: AttributionSource;
  price: number;
  timestamp?: string;
};

export type QueryTrend = {
  query: string;
  searches: number;
  resultsCount: number;
  revenue: number;
  clicks: number;
  trendScore?: number;
};

export type QueryTermStat = {
  term: string;
  value: number;
};

export type AttributionDashboardData = {
  searchCore: OverviewSearchCore;
  overviewQueryList: OverviewQueryRow[];
  clickSourceBreakdown: SourceBreakdownRow[];
  attributedValueEvents: AttributedValueEventRow[];
  unattributedCartCount: number;
  sourceLabels: Record<AttributionSource, string>;
  overviewTrend: SearchActivityPoint[];
  sourceTrend: SourceTrendPoint[];
  queryAttribution: QueryAttributionRow[];
};

export type InsightsDashboardData = {
  summary: InsightsSummary;
  groupedInsightCards: InsightGroup[];
};

export type CustomersDashboardData = {
  totalProfiles: number;
  profiles: CustomerSearchProfile[];
  summary: CustomersSummary;
  constellationProfiles: CustomerSearchProfile[];
  featuredLists: CustomerFeaturedLists;
};

export type CustomerProfilePageData = {
  profile: CustomerSearchProfile;
};

export type ProductsDashboardData = {
  topProducts: ProductSearchPerformance[];
  mostClickedProducts: ProductSearchPerformance[];
  highValueProducts: ProductSearchPerformance[];
  topCartProducts: ProductSearchPerformance[];
  optimizationOpportunities: ProductSearchPerformance[];
};

export type QueriesDashboardData = {
  topQueries: QueryTrend[];
  zeroResultQueries: QueryTrend[];
  emergingQueries: QueryTrend[];
  popularTerms: QueryTermStat[];
  opportunities: SearchInsightCard[];
};

export type BoostLevel = 0 | 1 | 2 | 3;

export type BoostFilters = {
  query?: string;
  category?: string;
  boostState?: "all" | "boosted" | "not-boosted";
  sort?: "name" | "clicks" | "carts" | "boost-high" | "price-high" | "price-low";
  page: number;
};

export type BoostProductRow = {
  id: string;
  name: string;
  category?: string;
  softCategories: string[];
  type?: string;
  status?: string;
  price?: number;
  imageUrl?: string;
  currentBoost: BoostLevel;
  clicks: number;
  carts: number;
};

export type BoostPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type BoostSummary = {
  totalProducts: number;
  boostedProducts: number;
  boostedClicks: number;
  boostedCarts: number;
  avgClicksPerBoostedProduct: number;
  boostCoverage: number;
  boostLevelCounts: Record<Exclude<BoostLevel, 0>, number>;
  topBoostedProduct?: {
    id: string;
    name: string;
    clicks: number;
    carts: number;
    boost: BoostLevel;
    price?: number;
  };
  topBoostedProducts: Array<{
    id: string;
    name: string;
    clicks: number;
    carts: number;
    boost: BoostLevel;
    price?: number;
  }>;
};

export type BoostDashboardData = {
  products: BoostProductRow[];
  pagination: BoostPagination;
  categories: DimensionOption[];
  filtersApplied: BoostFilters;
  summary: BoostSummary;
};

export type BoostApiResponse = {
  generatedAt: string;
  data: BoostDashboardData;
  warnings: string[];
  errors: string[];
};

export type SemantixOverviewData = {
  attribution: AttributionDashboardData;
  insights: SearchInsightCard[];
  profiles: CustomerSearchProfile[];
  products: ProductSearchPerformance[];
  queries: QueryTrend[];
};
