import type {
  AttributionDashboardData,
  AttributedValueEventRow,
  AttributionSource,
  CustomerJourneyStep,
  CustomerFeaturedLists,
  CustomerProfilePageData,
  CustomerSearchProfile,
  CustomersSummary,
  CustomersDashboardData,
  DashboardFilters,
  InsightsDashboardData,
  InsightsSummary,
  InsightGroup,
  NormalizedRecord,
  OverviewQueryRow,
  OverviewSearchCore,
  ProductSearchPerformance,
  ProductsDashboardData,
  QueriesDashboardData,
  QueryAttributionRow,
  QueryTermStat,
  QueryTrend,
  SearchActivityPoint,
  SearchInsightCard,
  SemantixOverviewData,
  SourceBreakdownRow,
  SourceTrendPoint
} from "@/lib/dashboard/types";

const SOURCE_ORDER: AttributionSource[] = ["native", "zero-results", "inject", "rerank", "ai", "unknown"];

const SOURCE_LABELS: Record<AttributionSource, string> = {
  native: "Native",
  "zero-results": "Zero Results",
  inject: "Inject",
  rerank: "ReRank",
  ai: "AI",
  unknown: "Unknown"
};

type QueryAggregate = {
  query: string;
  searches: number;
  clicks: number;
  addToCart: number;
  purchases: number;
  revenueGenerated: number;
  totalResults: number;
  recentSearches: number;
};

type ClassifiedRecord = {
  query: string;
  searches: number;
  clicks: number;
  addToCart: number;
  purchases: number;
  revenue: number;
  resultsCount: number;
};

type AttributionMatch = {
  cart: NormalizedRecord;
  click: NormalizedRecord;
  source: AttributionSource;
};

type SourceTrendMetricKey = "native" | "zeroResults" | "inject" | "rerank" | "ai" | "unknown";

const PROFILE_NAME_PREFIXES = [
  "Atlas",
  "Nova",
  "Lumen",
  "Milo",
  "Orion",
  "Sage",
  "Ember",
  "Cedar"
] as const;

const PROFILE_NAME_SUFFIXES = [
  "Shopper",
  "Buyer",
  "Explorer",
  "Collector",
  "Seeker",
  "Curator",
  "Visitor",
  "Scout"
] as const;

function deriveQuery(record: NormalizedRecord) {
  if (record.query) {
    return record.query;
  }

  if (record.product) {
    return record.product.toLowerCase();
  }

  return record.summary
    .split(/\s+/)
    .slice(0, 3)
    .join(" ")
    .toLowerCase();
}

function applyFilters(
  records: NormalizedRecord[],
  filters: DashboardFilters,
  options?: {
    ignoreChannel?: boolean;
  }
) {
  const from = new Date(filters.from);
  const to = new Date(filters.to);
  to.setHours(23, 59, 59, 999);

  return records.filter((record) => {
    if (record.timestamp && (record.timestamp < from || record.timestamp > to)) {
      return false;
    }
    if (filters.region && record.region !== filters.region) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (!options?.ignoreChannel && filters.channel && record.channel !== filters.channel) return false;
    if (filters.product && record.product !== filters.product) return false;
    if (filters.team && record.team !== filters.team) return false;
    return true;
  });
}

function classify(record: NormalizedRecord): ClassifiedRecord {
  const eventType = record.eventType ?? "query";
  if (eventType === "profile") {
    return {
      query: record.profileTopQuery ?? deriveQuery(record),
      searches: 0,
      clicks: 0,
      addToCart: 0,
      purchases: 0,
      revenue: 0,
      resultsCount: 0
    };
  }

  const query = deriveQuery(record);
  return {
    query,
    searches: eventType === "query" ? 1 : 0,
    clicks: eventType === "click" ? 1 : 0,
    addToCart: eventType === "add_to_cart" ? 1 : 0,
    purchases: eventType === "purchase" ? 1 : 0,
    revenue: eventType === "purchase" ? record.revenue ?? 0 : 0,
    resultsCount: record.resultsCount ?? record.matchedProducts ?? 0
  };
}

function isSourceVisible(source: AttributionSource, row: SourceBreakdownRow) {
  if (source !== "unknown") {
    return true;
  }

  return row.clicks > 0 || row.attributedCarts > 0;
}

function createEmptySourceTrendPoint(date: string): SourceTrendPoint {
  return {
    date,
    native: 0,
    zeroResults: 0,
    inject: 0,
    rerank: 0,
    ai: 0,
    unknown: 0
  };
}

function hashString(value: string) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function recencyMinutes(timestamp?: string) {
  if (!timestamp) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(timestamp);
  const elapsed = Date.now() - date.getTime();
  return elapsed >= 0 ? elapsed / (1000 * 60) : Number.POSITIVE_INFINITY;
}

function buildProfileLabel(key: string) {
  const hash = hashString(key);
  const prefix = PROFILE_NAME_PREFIXES[hash % PROFILE_NAME_PREFIXES.length];
  const suffix = PROFILE_NAME_SUFFIXES[Math.floor(hash / PROFILE_NAME_PREFIXES.length) % PROFILE_NAME_SUFFIXES.length];

  return `${prefix} ${suffix}`;
}

function toTrendKey(source: AttributionSource): SourceTrendMetricKey {
  if (source === "zero-results") {
    return "zeroResults";
  }

  return source;
}

function getFilteredQueryRecords(records: NormalizedRecord[], filters: DashboardFilters) {
  return applyFilters(records, filters).filter((record) => record.eventType === "query");
}

function getFilteredClickRecords(records: NormalizedRecord[], filters: DashboardFilters) {
  return applyFilters(records, filters).filter(
    (record) => record.eventType === "click" && record.timestamp && record.sessionId
  );
}

function getFilteredCartRecords(records: NormalizedRecord[], filters: DashboardFilters) {
  return applyFilters(records, filters, { ignoreChannel: true }).filter(
    (record) => record.eventType === "add_to_cart" && record.timestamp && record.sessionId
  );
}

function buildAttributionMatches(records: NormalizedRecord[], filters: DashboardFilters) {
  const clicks = getFilteredClickRecords(records, filters);
  const carts = getFilteredCartRecords(records, filters);

  const exactIndex = new Map<string, NormalizedRecord[]>();
  const sessionProductIndex = new Map<string, NormalizedRecord[]>();
  const sessionQueryIndex = new Map<string, NormalizedRecord[]>();

  const pushIndexed = (index: Map<string, NormalizedRecord[]>, key: string, record: NormalizedRecord) => {
    const current = index.get(key) ?? [];
    current.push(record);
    index.set(key, current);
  };

  for (const click of clicks) {
    const exactKey = `${click.sessionId}__${click.productId ?? ""}__${click.query ?? ""}`;
    const sessionProductKey = `${click.sessionId}__${click.productId ?? ""}`;
    const sessionQueryKey = `${click.sessionId}__${click.query ?? ""}`;
    pushIndexed(exactIndex, exactKey, click);
    pushIndexed(sessionProductIndex, sessionProductKey, click);
    pushIndexed(sessionQueryIndex, sessionQueryKey, click);
  }

  for (const index of [exactIndex, sessionProductIndex, sessionQueryIndex]) {
    for (const rows of index.values()) {
      rows.sort((a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0));
    }
  }

  const findLatestPriorClick = (rows: NormalizedRecord[] | undefined, cartTimestamp: number) => {
    if (!rows?.length) {
      return undefined;
    }

    let candidate: NormalizedRecord | undefined;
    for (const row of rows) {
      const clickTimestamp = row.timestamp?.getTime();
      if (clickTimestamp == null) {
        continue;
      }
      if (clickTimestamp <= cartTimestamp && cartTimestamp - clickTimestamp <= 24 * 60 * 60 * 1000) {
        candidate = row;
      }
    }

    return candidate;
  };

  const matches: AttributionMatch[] = [];
  let unattributedCartCount = 0;

  for (const cart of carts) {
    const cartTimestamp = cart.timestamp?.getTime();
    if (cartTimestamp == null) {
      unattributedCartCount += 1;
      continue;
    }

    const exactMatch = findLatestPriorClick(
      exactIndex.get(`${cart.sessionId}__${cart.productId ?? ""}__${cart.query ?? ""}`),
      cartTimestamp
    );
    const sessionProductMatch = findLatestPriorClick(
      sessionProductIndex.get(`${cart.sessionId}__${cart.productId ?? ""}`),
      cartTimestamp
    );
    const sessionQueryMatch = findLatestPriorClick(
      sessionQueryIndex.get(`${cart.sessionId}__${cart.query ?? ""}`),
      cartTimestamp
    );

    const click = exactMatch ?? sessionProductMatch ?? sessionQueryMatch;
    if (!click) {
      unattributedCartCount += 1;
      continue;
    }

    matches.push({
      cart,
      click,
      source: click.source ?? "unknown"
    });
  }

  return {
    clicks,
    carts,
    matches,
    unattributedCartCount
  };
}

function buildSearchCore(records: NormalizedRecord[], filters: DashboardFilters): OverviewSearchCore {
  const queries = getFilteredQueryRecords(records, filters);
  const clicks = getFilteredClickRecords(records, filters);
  const { carts, matches } = buildAttributionMatches(records, filters);

  return {
    totalQueries: queries.length,
    totalProductClicks: clicks.length,
    totalAddToCarts: carts.length,
    totalSearchValue: carts.reduce((sum, cart) => sum + (cart.revenue ?? 0), 0),
    attributedAddToCarts: matches.length,
    cartMatchRate: carts.length ? matches.length / carts.length : 0
  };
}

function buildSourceBreakdown(records: NormalizedRecord[], filters: DashboardFilters): SourceBreakdownRow[] {
  const { clicks, matches } = buildAttributionMatches(records, filters);
  const totalClicks = clicks.length;

  return SOURCE_ORDER.map((source) => {
    const clicksForSource = clicks.filter((record) => (record.source ?? "unknown") === source).length;
    const sourceMatches = matches.filter((entry) => entry.source === source);
    const attributedCarts = sourceMatches.length;

    return {
      source,
      clicks: clicksForSource,
      clickShare: totalClicks ? clicksForSource / totalClicks : 0,
      attributedCarts,
      cartConversionFromClicks: clicksForSource ? attributedCarts / clicksForSource : 0,
      attributedValue: sourceMatches.reduce((sum, entry) => sum + (entry.cart.revenue ?? 0), 0)
    };
  }).filter((row) => isSourceVisible(row.source, row));
}

function buildAttributedValueEvents(records: NormalizedRecord[], filters: DashboardFilters): AttributedValueEventRow[] {
  const { matches } = buildAttributionMatches(records, filters);
  return matches
    .filter((match) => ["zero-results", "inject", "rerank"].includes(match.source))
    .map((match) => ({
      product: match.cart.product ?? match.click.product ?? "Unknown product",
      query: match.cart.query ?? match.click.query,
      source: match.source,
      price: match.cart.revenue ?? 0,
      timestamp: match.cart.timestamp?.toISOString()
    }))
    .sort(
      (a, b) =>
        b.price - a.price ||
        new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime() ||
        a.product.localeCompare(b.product)
    )
    .slice(0, 8);
}

function buildOverviewTrend(records: NormalizedRecord[], filters: DashboardFilters): SearchActivityPoint[] {
  const filtered = applyFilters(records, filters);
  const byDay = new Map<string, SearchActivityPoint>();
  const matches = buildAttributionMatches(records, filters).matches;

  for (const record of filtered) {
    const date = (record.timestamp ?? new Date(filters.to)).toISOString().slice(0, 10);
    const current = byDay.get(date) ?? {
      date,
      queries: 0,
      clicks: 0,
      attributedCarts: 0
    };
    const classified = classify(record);
    current.queries += classified.searches;
    current.clicks += classified.clicks;
    byDay.set(date, current);
  }

  for (const match of matches) {
    const date = (match.cart.timestamp ?? new Date(filters.to)).toISOString().slice(0, 10);
    const current = byDay.get(date) ?? {
      date,
      queries: 0,
      clicks: 0,
      attributedCarts: 0
    };
    current.attributedCarts += 1;
    byDay.set(date, current);
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildSourceTrend(records: NormalizedRecord[], filters: DashboardFilters): SourceTrendPoint[] {
  const clicks = getFilteredClickRecords(records, filters);
  const byDay = new Map<string, SourceTrendPoint>();

  for (const click of clicks) {
    const date = (click.timestamp ?? new Date(filters.to)).toISOString().slice(0, 10);
    const current = byDay.get(date) ?? createEmptySourceTrendPoint(date);
    const source = click.source ?? "unknown";
    current[toTrendKey(source)] += 1;
    byDay.set(date, current);
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildOverviewQueryList(records: NormalizedRecord[], filters: DashboardFilters): OverviewQueryRow[] {
  const queries = applyFilters(records, filters, { ignoreChannel: true })
    .filter((record) => record.eventType === "query")
    .filter((record) => record.timestamp)
    .sort((a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0));
  const clicks = getFilteredClickRecords(records, filters).sort(
    (a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0)
  );
  const { matches } = buildAttributionMatches(records, filters);

  type OverviewRowDraft = {
    id: string;
    query: string;
    timestamp: Date;
    sessionId?: string;
    nextQueryTimestamp?: Date;
    deliveredProductIds?: string[];
    deliveredProductNames?: string[];
    source: AttributionSource;
    sources: AttributionSource[];
    clickItems: Array<{ product?: string; price?: number }>;
    addToCartItems: Array<{ product?: string; price?: number }>;
    clickProduct?: string;
    clickPrice?: number;
    addToCartProduct?: string;
    addToCartPrice?: number;
    hasClick: boolean;
    hasAddToCart: boolean;
  };

  const rows: OverviewRowDraft[] = queries.map((query) => ({
    id: query.id,
    query: query.query ?? deriveQuery(query),
    timestamp: query.timestamp ?? new Date(filters.to),
    sessionId: query.sessionId,
    nextQueryTimestamp: undefined,
    deliveredProductIds: query.deliveredProductIds,
    deliveredProductNames: query.deliveredProductNames,
    source: "unknown",
    sources: [],
    clickItems: [],
    addToCartItems: [],
    hasClick: false,
    hasAddToCart: false
  }));

  const rowsBySession = new Map<string, OverviewRowDraft[]>();
  for (const row of rows) {
    if (!row.sessionId) {
      continue;
    }
    const current = rowsBySession.get(row.sessionId) ?? [];
    current.push(row);
    rowsBySession.set(row.sessionId, current);
  }

  for (const sessionRows of rowsBySession.values()) {
    sessionRows.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    for (let index = 0; index < sessionRows.length - 1; index += 1) {
      sessionRows[index]!.nextQueryTimestamp = sessionRows[index + 1]!.timestamp;
    }
  }

  const clickToRow = new Map<string, OverviewRowDraft>();

  const normalizeText = (value?: string) =>
    value
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const isClickRelevantToQuery = (row: OverviewRowDraft, click: NormalizedRecord) => {
    if (row.deliveredProductIds?.length && click.productId) {
      if (row.deliveredProductIds.includes(click.productId)) {
        return true;
      }
    }

    if (row.deliveredProductNames?.length && click.product) {
      const productName = normalizeText(click.product);
      return Boolean(productName && row.deliveredProductNames.includes(productName));
    }

    if (row.deliveredProductIds?.length && click.productId && !row.deliveredProductNames?.length) {
      return false;
    }

    return true;
  };

  const findQueryRowForClick = (click: NormalizedRecord) => {
    const clickTimestamp = click.timestamp?.getTime();
    if (clickTimestamp == null) {
      return undefined;
    }

    return [...rows]
      .filter((row) => {
        if (row.query !== (click.query ?? deriveQuery(click))) {
          return false;
        }

        if (row.sessionId && click.sessionId && row.sessionId !== click.sessionId) {
          return false;
        }

        const rowTimestamp = row.timestamp.getTime();
        const hasDeliveredProducts = Boolean(
          row.deliveredProductIds?.length || row.deliveredProductNames?.length
        );
        const hasSessionContext = Boolean(row.sessionId && click.sessionId);
        const timeWindowMs = hasDeliveredProducts
          ? hasSessionContext
            ? 30 * 60 * 1000
            : 2 * 60 * 60 * 1000
          : 3 * 60 * 1000;

        return (
          rowTimestamp <= clickTimestamp &&
          clickTimestamp - rowTimestamp <= timeWindowMs &&
          (!row.nextQueryTimestamp || clickTimestamp < row.nextQueryTimestamp.getTime()) &&
          isClickRelevantToQuery(row, click)
        );
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  };

  for (const click of clicks) {
    const targetRow = findQueryRowForClick(click);

    if (targetRow) {
      const clickSource = click.source ?? "unknown";
      targetRow.source = targetRow.source === "unknown" ? clickSource : targetRow.source;
      if (!targetRow.sources.includes(clickSource)) {
        targetRow.sources.push(clickSource);
      }
      targetRow.clickItems.push({
        product: click.product,
        price: click.revenue
      });
      targetRow.clickProduct = click.product;
      targetRow.clickPrice = click.revenue;
      targetRow.hasClick = true;
      clickToRow.set(click.id, targetRow);
    }
  }

  for (const match of matches) {
    const row = clickToRow.get(match.click.id);
    if (!row || row.hasAddToCart) {
      continue;
    }

    row.addToCartItems.push({
      product: match.cart.product,
      price: match.cart.revenue
    });
    row.addToCartProduct = match.cart.product;
    row.addToCartPrice = match.cart.revenue;
    row.clickPrice = row.clickPrice ?? match.cart.revenue;
    row.hasAddToCart = true;
  }

  return rows
    .filter((row) => {
      if (!filters.channel) {
        return true;
      }

      return row.hasClick || row.hasAddToCart;
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map((row) => ({
      id: row.id,
      query: row.query,
      timestamp: row.timestamp.toISOString(),
      source: row.source,
      sources: row.sources,
      clickItems: row.clickItems,
      addToCartItems: row.addToCartItems,
      clickProduct: row.clickProduct,
      clickPrice: row.clickPrice,
      addToCartProduct: row.addToCartProduct,
      addToCartPrice: row.addToCartPrice,
      hasClick: row.hasClick,
      hasAddToCart: row.hasAddToCart
    }));
}

function buildQueryAttribution(records: NormalizedRecord[], filters: DashboardFilters): QueryAttributionRow[] {
  const clicks = getFilteredClickRecords(records, filters);
  const matches = buildAttributionMatches(records, filters).matches;
  const byQuery = new Map<
    string,
    {
      query: string;
      clicks: number;
      attributedAddToCarts: number;
      attributedValue: number;
      sources: Map<AttributionSource, number>;
    }
  >();

  for (const click of clicks) {
    const query = click.query ?? deriveQuery(click);
    const current = byQuery.get(query) ?? {
      query,
      clicks: 0,
      attributedAddToCarts: 0,
      attributedValue: 0,
      sources: new Map<AttributionSource, number>()
    };
    current.clicks += 1;
    const source = click.source ?? "unknown";
    current.sources.set(source, (current.sources.get(source) ?? 0) + 1);
    byQuery.set(query, current);
  }

  for (const match of matches) {
    const query = match.cart.query ?? match.click.query ?? deriveQuery(match.click);
    const current = byQuery.get(query) ?? {
      query,
      clicks: 0,
      attributedAddToCarts: 0,
      attributedValue: 0,
      sources: new Map<AttributionSource, number>()
    };
    current.attributedAddToCarts += 1;
    current.attributedValue += match.cart.revenue ?? 0;
    byQuery.set(query, current);
  }

  return Array.from(byQuery.values())
    .map((entry) => {
      const topSource =
        Array.from(entry.sources.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

      return {
        query: entry.query,
        clicks: entry.clicks,
        attributedAddToCarts: entry.attributedAddToCarts,
        topSource,
        cartMatchRate: entry.clicks ? entry.attributedAddToCarts / entry.clicks : 0,
        attributedValue: entry.attributedValue,
        topSourceShare: entry.clicks ? (entry.sources.get(topSource) ?? 0) / entry.clicks : 0
      };
    })
    .sort(
      (a, b) =>
        b.attributedValue - a.attributedValue ||
        b.attributedAddToCarts - a.attributedAddToCarts ||
        b.clicks - a.clicks ||
        a.query.localeCompare(b.query)
    )
    .slice(0, 12);
}

function aggregateQueries(records: NormalizedRecord[], filters: DashboardFilters): QueryAggregate[] {
  const filtered = applyFilters(records, filters);
  const recentCutoff = new Date(filters.to);
  recentCutoff.setDate(recentCutoff.getDate() - 7);
  const map = new Map<string, QueryAggregate>();

  for (const record of filtered) {
    const classified = classify(record);
    const entry = map.get(classified.query) ?? {
      query: classified.query,
      searches: 0,
      clicks: 0,
      addToCart: 0,
      purchases: 0,
      revenueGenerated: 0,
      totalResults: 0,
      recentSearches: 0
    };

    entry.searches += classified.searches;
    entry.clicks += classified.clicks;
    entry.addToCart += classified.addToCart;
    entry.purchases += classified.purchases;
    entry.revenueGenerated += classified.revenue;
    entry.totalResults += classified.resultsCount;
    if (record.timestamp && record.timestamp >= recentCutoff && classified.searches > 0) {
      entry.recentSearches += classified.searches;
    }
    map.set(classified.query, entry);
  }

  return Array.from(map.values());
}

function buildInsights(records: NormalizedRecord[], filters: DashboardFilters): SearchInsightCard[] {
  const aggregates = aggregateQueries(records, filters);
  const totalSearches = aggregates.reduce((sum, entry) => sum + entry.searches, 0);
  const totalPurchases = aggregates.reduce((sum, entry) => sum + entry.purchases, 0);
  const baselineConversion = totalSearches ? totalPurchases / totalSearches : 0;
  const cards: SearchInsightCard[] = [];

  for (const entry of aggregates) {
    const avgResults = entry.searches ? entry.totalResults / entry.searches : 0;
    const conversion = entry.searches ? entry.purchases / entry.searches : 0;

    if (entry.searches >= 3 && avgResults <= 2) {
      cards.push({
        id: `low-match-${entry.query}`,
        severity: "warning",
        group: "search-gaps",
        title: `Low match coverage for "${entry.query}"`,
        text: `Users searched for "${entry.query}" ${entry.searches} times but only ${Math.max(1, Math.round(avgResults))} products match this query.`,
        explanation: "Search demand exists, but catalog coverage or retrieval quality is too thin for this term.",
        impactMetric: `${entry.searches} searches at risk`,
        actionLabel: "Add products",
        contextLabel: entry.query,
        priorityScore: entry.searches
      });
    }

    if (entry.searches >= 2 && entry.clicks === 0) {
      cards.push({
        id: `no-click-${entry.query}`,
        severity: "critical",
        group: "low-conversion-queries",
        title: `No click-through on "${entry.query}"`,
        text: `${entry.searches} users searched for "${entry.query}" but left without clicking any result.`,
        explanation: "The query is attracting demand but the result set is not compelling enough to create product discovery.",
        impactMetric: `${entry.searches} missed discovery sessions`,
        actionLabel: "Boost products",
        contextLabel: entry.query,
        priorityScore: entry.searches * 2
      });
    }

    if (entry.searches >= 2 && conversion >= baselineConversion + 0.2) {
      cards.push({
        id: `high-conversion-${entry.query}`,
        severity: "info",
        group: "high-intent-wins",
        title: `High-intent demand around "${entry.query}"`,
        text: `Customers searching for "${entry.query}" convert ${(conversion * 100).toFixed(0)}%, well above the search average.`,
        explanation: "This query already signals strong purchase intent and can support more deliberate merchandising.",
        impactMetric: `${((conversion - baselineConversion) * 100).toFixed(0)}pt uplift`,
        actionLabel: "Create category page",
        contextLabel: entry.query,
        priorityScore: Math.round((conversion - baselineConversion) * 100)
      });
    }

    if (entry.clicks >= 2 && entry.addToCart === 0) {
      cards.push({
        id: `click-no-cart-${entry.query}`,
        severity: "warning",
        group: "revenue-opportunities",
        title: `Clicks without cart progression for "${entry.query}"`,
        text: `Searchers clicked ${entry.clicks} products for "${entry.query}" but did not move any of them into cart.`,
        explanation: "Users are finding something relevant, but the product mix or landing experience is failing to convert interest into cart intent.",
        impactMetric: `${entry.clicks} engaged clicks`,
        actionLabel: "Tune assortment",
        contextLabel: entry.query,
        priorityScore: entry.clicks
      });
    }
  }

  if (!cards.length) {
    cards.push({
      id: "baseline-tuning",
      severity: "info",
      group: "high-intent-wins",
      title: "Semantix is capturing stable demand",
      text: "Semantix is capturing stable demand. Add synonyms and merchandising rules to improve long-tail coverage.",
      explanation: "No critical gaps were detected in the current window, so the best next step is baseline tuning and coverage expansion.",
      impactMetric: "Always-on optimization",
      actionLabel: "Add synonyms",
      priorityScore: 1
    });
  }

  return cards
    .sort(
      (a, b) =>
        severityRank(b.severity) - severityRank(a.severity) ||
        (b.priorityScore ?? 0) - (a.priorityScore ?? 0) ||
        a.title.localeCompare(b.title)
    )
    .slice(0, 10);
}

function severityRank(severity: SearchInsightCard["severity"]) {
  if (severity === "critical") return 3;
  if (severity === "warning") return 2;
  return 1;
}

function buildInsightsSummary(cards: SearchInsightCard[]): InsightsSummary {
  const summary: InsightsSummary = {
    total: cards.length,
    critical: cards.filter((card) => card.severity === "critical").length,
    warning: cards.filter((card) => card.severity === "warning").length,
    info: cards.filter((card) => card.severity === "info").length,
    strongestWin: cards.find((card) => card.group === "high-intent-wins")?.title,
    biggestGap:
      cards.find((card) => card.severity === "critical")?.title ??
      cards.find((card) => card.group === "search-gaps")?.title
  };

  return summary;
}

function buildGroupedInsights(cards: SearchInsightCard[]): InsightGroup[] {
  const config: Array<{ id: InsightGroup["id"]; title: string }> = [
    { id: "revenue-opportunities", title: "Revenue Opportunities" },
    { id: "search-gaps", title: "Search Gaps" },
    { id: "high-intent-wins", title: "High-Intent Wins" },
    { id: "low-conversion-queries", title: "Low-Conversion Queries" }
  ];

  return config
    .map((group) => ({
      id: group.id,
      title: group.title,
      cards: cards.filter((card) => card.group === group.id)
    }))
    .filter((group) => group.cards.length > 0);
}

function buildProfiles(records: NormalizedRecord[], filters: DashboardFilters): CustomerSearchProfile[] {
  const filtered = applyFilters(records, filters);
  const grouped = new Map<string, NormalizedRecord[]>();

  for (const record of filtered) {
    const key = record.userId ?? record.sessionId ?? record.ipAddress ?? record.customer ?? record.id;
    const current = grouped.get(key) ?? [];
    current.push(record);
    grouped.set(key, current);
  }

  const profiles = Array.from(grouped.entries()).map(([key, events]) => {
    const sorted = [...events].sort((a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0));
    const totalSessionValue = sorted.reduce((sum, event) => sum + (event.revenue ?? 0), 0);
    const totalAddToCarts = sorted.reduce((sum, event) => sum + classify(event).addToCart, 0);
    const directClicks = sorted.reduce((sum, event) => sum + classify(event).clicks, 0);
    const profileClicks = sorted.reduce((max, event) => Math.max(max, event.profileClicks ?? 0), 0);
    const totalClicks = Math.max(directClicks, profileClicks);
    const explicitSearches = sorted.reduce((sum, event) => sum + classify(event).searches, 0);
    const impliedSearches = sorted.reduce(
      (sum, event) =>
        sum + (event.query && ["click", "add_to_cart", "purchase"].includes(event.eventType ?? "") ? 1 : 0),
      0
    );
    const totalSearches = Math.max(explicitSearches, impliedSearches);
    const identifier = sorted[0]?.userId ?? sorted[0]?.sessionId ?? sorted[0]?.ipAddress ?? key;
    const queryFrequency = new Map<string, number>();
    const profilePreferenceOrder: string[] = [];

    for (const event of sorted) {
      const query = event.query ?? event.profileTopQuery;
      if (query) {
        queryFrequency.set(query, (queryFrequency.get(query) ?? 0) + 1);
      }

      for (const topic of event.profilePreferenceTopics ?? []) {
        if (!profilePreferenceOrder.includes(topic)) {
          profilePreferenceOrder.push(topic);
        }
        queryFrequency.set(topic, (queryFrequency.get(topic) ?? 0) + 2);
      }
    }

    const rankedTopics = Array.from(queryFrequency.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([query]) => query);
    const preferredTopics = [...profilePreferenceOrder];
    for (const topic of rankedTopics) {
      if (!preferredTopics.includes(topic)) {
        preferredTopics.push(topic);
      }
    }
    const topQuery = preferredTopics[0];

    const journey: CustomerJourneyStep[] = sorted.flatMap((event) => {
      const classified = classify(event);
      const steps: CustomerJourneyStep[] = [];

      if (!classified.searches && event.query && ["click", "add_to_cart", "purchase"].includes(event.eventType ?? "")) {
        steps.push({
          id: `${event.id}-implicit-search`,
          type: "search",
          label: `Search: "${event.query}"`,
          timestamp: event.timestamp?.toISOString()
        });
      }

      if (classified.searches) {
        steps.push({
          id: `${event.id}-search`,
          type: "search",
          label: `Search: "${classified.query}"`,
          timestamp: event.timestamp?.toISOString()
        });
      }

      if (classified.clicks) {
        steps.push({
          id: `${event.id}-click`,
          type: "click",
          label: `Click: ${event.product ?? "Search result"}`,
          product: event.product,
          timestamp: event.timestamp?.toISOString()
        });
      }

      if (classified.addToCart) {
        steps.push({
          id: `${event.id}-cart`,
          type: "cart",
          label: `Add to Cart: ${event.product ?? "Product"}`,
          product: event.product,
          value: event.revenue,
          timestamp: event.timestamp?.toISOString()
        });
      }

      if (classified.purchases) {
        steps.push({
          id: `${event.id}-purchase`,
          type: "purchase",
          label: `Purchase: ${event.product ?? "Order"}`,
          product: event.product,
          value: classified.revenue,
          timestamp: event.timestamp?.toISOString()
        });
      }

      return steps;
    });

    return {
      id: key,
      label: buildProfileLabel(key),
      identifier,
      identifierType: sorted[0]?.userId ? "user" : sorted[0]?.sessionId ? "session" : "ip",
      sessionId: sorted[0]?.sessionId ?? key,
      ipAddress: sorted[0]?.ipAddress ?? "Unknown",
      userId: sorted[0]?.userId,
      totalSessionValue,
      totalAddToCarts,
      averageCartValue: totalAddToCarts ? totalSessionValue / totalAddToCarts : 0,
      totalClicks,
      totalSearches,
      topQuery,
      preferredTopics,
      lastSeen: sorted.at(-1)?.timestamp?.toISOString(),
      activeNow: false,
      sizeScore: 0,
      rank: 0,
      clusterGroup: undefined,
      positionSeed: 0,
      journey
    } satisfies CustomerSearchProfile;
  });

  const rankedProfiles = profiles
    .sort(
      (a, b) =>
        b.totalSessionValue - a.totalSessionValue ||
        b.averageCartValue - a.averageCartValue ||
        b.totalAddToCarts - a.totalAddToCarts ||
        b.totalClicks - a.totalClicks ||
        b.totalSearches - a.totalSearches ||
        new Date(b.lastSeen ?? 0).getTime() - new Date(a.lastSeen ?? 0).getTime()
    );

  const maxValue = rankedProfiles[0]?.totalSessionValue ?? 0;

  return rankedProfiles.map((profile, index) => {
    const activeNow = recencyMinutes(profile.lastSeen) <= 5;
    const sizeScore = maxValue > 0 ? Math.max(0.18, profile.totalSessionValue / maxValue) : 0.18;
    const clusterGroup = activeNow
      ? "active"
      : profile.totalSessionValue > 0
        ? "high-value"
        : "engaged";

    return {
      ...profile,
      activeNow,
      sizeScore,
      rank: index + 1,
      clusterGroup,
      positionSeed: hashString(profile.id)
    };
  });
}

function buildCustomersSummary(profiles: CustomerSearchProfile[]): CustomersSummary {
  return {
    totalProfiles: profiles.length,
    activeNow: profiles.filter((profile) => profile.activeNow).length,
    profilesWithCarts: profiles.filter((profile) => profile.totalAddToCarts > 0).length,
    attributedValue: profiles.reduce((sum, profile) => sum + profile.totalSessionValue, 0)
  };
}

function buildCustomerFeaturedLists(profiles: CustomerSearchProfile[]): CustomerFeaturedLists {
  return {
    topActiveNow: [...profiles]
      .filter((profile) => profile.activeNow)
      .sort(
        (a, b) =>
          b.totalSessionValue - a.totalSessionValue ||
          b.totalClicks - a.totalClicks ||
          b.totalSearches - a.totalSearches
      )
      .slice(0, 5),
    topValue: [...profiles].slice(0, 5),
    needsAttention: [...profiles]
      .filter((profile) => profile.totalClicks >= 2 && profile.totalAddToCarts === 0)
      .sort(
        (a, b) =>
          b.totalClicks - a.totalClicks ||
          b.totalSearches - a.totalSearches ||
          new Date(b.lastSeen ?? 0).getTime() - new Date(a.lastSeen ?? 0).getTime()
      )
      .slice(0, 5)
  };
}

function buildProducts(records: NormalizedRecord[], filters: DashboardFilters): ProductSearchPerformance[] {
  const filtered = applyFilters(records, filters);
  const map = new Map<string, ProductSearchPerformance>();

  for (const record of filtered) {
    const product = record.product;
    if (!product) {
      continue;
    }
    const classified = classify(record);
    const entry = map.get(product) ?? {
      product,
      clicks: 0,
      addToCart: 0,
      revenue: 0,
      conversionRate: 0
    };

    entry.clicks += classified.clicks;
    entry.addToCart += classified.addToCart;
    entry.revenue += record.eventType === "add_to_cart" ? record.revenue ?? 0 : classified.revenue;
    map.set(product, entry);
  }

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      conversionRate: entry.clicks ? entry.addToCart / entry.clicks : 0
    }))
    .sort((a, b) => b.addToCart - a.addToCart || b.clicks - a.clicks);
}

function buildQueryIntelligence(records: NormalizedRecord[], filters: DashboardFilters) {
  const aggregates = aggregateQueries(records, filters);
  const topQueries: QueryTrend[] = aggregates
    .sort((a, b) => b.searches - a.searches)
    .slice(0, 8)
    .map((entry) => ({
      query: entry.query,
      searches: entry.searches,
      resultsCount: entry.searches ? Math.round(entry.totalResults / entry.searches) : 0,
      revenue: entry.revenueGenerated,
      clicks: entry.clicks,
      trendScore: entry.recentSearches
    }));

  const zeroResultQueries = aggregates
    .filter((entry) => entry.searches > 0 && entry.totalResults === 0)
    .slice(0, 6)
    .map((entry) => ({
      query: entry.query,
      searches: entry.searches,
      resultsCount: 0,
      revenue: entry.revenueGenerated,
      clicks: entry.clicks
    }));

  const emergingQueries = aggregates
    .filter((entry) => entry.recentSearches > 0)
    .sort((a, b) => b.recentSearches - a.recentSearches)
    .slice(0, 6)
    .map((entry) => ({
      query: entry.query,
      searches: entry.searches,
      resultsCount: entry.searches ? Math.round(entry.totalResults / entry.searches) : 0,
      revenue: entry.revenueGenerated,
      clicks: entry.clicks,
      trendScore: entry.recentSearches
    }));

  const popularTermsMap = new Map<string, number>();
  for (const entry of aggregates) {
    for (const part of entry.query.split(/\s+/)) {
      if (part.length < 3) continue;
      popularTermsMap.set(part, (popularTermsMap.get(part) ?? 0) + entry.searches);
    }
  }

  const popularTerms: QueryTermStat[] = Array.from(popularTermsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([term, value]) => ({ term, value }));

  const opportunities = buildInsights(records, filters)
    .filter((insight) => insight.severity !== "info")
    .slice(0, 4);

  return {
    topQueries,
    zeroResultQueries,
    emergingQueries,
    popularTerms,
    opportunities
  } satisfies QueriesDashboardData;
}

export function buildSemantixOverview(records: NormalizedRecord[], filters: DashboardFilters): SemantixOverviewData {
  return {
    attribution: {
      searchCore: buildSearchCore(records, filters),
      overviewQueryList: buildOverviewQueryList(records, filters),
      clickSourceBreakdown: buildSourceBreakdown(records, filters),
      attributedValueEvents: buildAttributedValueEvents(records, filters),
      unattributedCartCount: buildAttributionMatches(records, filters).unattributedCartCount,
      sourceLabels: SOURCE_LABELS,
      overviewTrend: buildOverviewTrend(records, filters),
      sourceTrend: buildSourceTrend(records, filters),
      queryAttribution: buildQueryAttribution(records, filters)
    },
    insights: buildInsights(records, filters),
    profiles: buildProfiles(records, filters).slice(0, 4),
    products: buildProducts(records, filters).slice(0, 5),
    queries: buildQueryIntelligence(records, filters).topQueries.slice(0, 5)
  };
}

export function buildAttribution(records: NormalizedRecord[], filters: DashboardFilters): AttributionDashboardData {
  const { unattributedCartCount } = buildAttributionMatches(records, filters);

  return {
    searchCore: buildSearchCore(records, filters),
    overviewQueryList: buildOverviewQueryList(records, filters),
    clickSourceBreakdown: buildSourceBreakdown(records, filters),
    attributedValueEvents: buildAttributedValueEvents(records, filters),
    unattributedCartCount,
    sourceLabels: SOURCE_LABELS,
    overviewTrend: buildOverviewTrend(records, filters),
    sourceTrend: buildSourceTrend(records, filters),
    queryAttribution: buildQueryAttribution(records, filters)
  };
}

export function buildInsightsDashboard(records: NormalizedRecord[], filters: DashboardFilters): InsightsDashboardData {
  const cards = buildInsights(records, filters);

  return {
    summary: buildInsightsSummary(cards),
    groupedInsightCards: buildGroupedInsights(cards)
  };
}

export function buildCustomersDashboard(records: NormalizedRecord[], filters: DashboardFilters): CustomersDashboardData {
  const profiles = buildProfiles(records, filters);
  const summary = buildCustomersSummary(profiles);
  const featuredLists = buildCustomerFeaturedLists(profiles);

  return {
    totalProfiles: profiles.length,
    profiles: profiles.slice(0, 24),
    summary,
    constellationProfiles: profiles.slice(0, 120),
    featuredLists
  };
}

export function buildCustomerProfile(
  records: NormalizedRecord[],
  filters: DashboardFilters,
  profileId: string
): CustomerProfilePageData | null {
  const profile = buildProfiles(records, filters).find((entry) => entry.id === profileId);
  if (!profile) {
    return null;
  }
  return { profile };
}

export function buildProductsDashboard(records: NormalizedRecord[], filters: DashboardFilters): ProductsDashboardData {
  const products = buildProducts(records, filters);
  return {
    topProducts: products.slice(0, 10),
    mostClickedProducts: [...products]
      .sort((a, b) => b.clicks - a.clicks || b.addToCart - a.addToCart || b.revenue - a.revenue)
      .slice(0, 6),
    highValueProducts: [...products]
      .sort((a, b) => b.revenue - a.revenue || b.addToCart - a.addToCart || b.clicks - a.clicks)
      .slice(0, 6),
    topCartProducts: [...products]
      .sort((a, b) => b.addToCart - a.addToCart || b.revenue - a.revenue || b.clicks - a.clicks)
      .slice(0, 6),
    optimizationOpportunities: [...products]
      .filter((product) => product.clicks >= 1 && product.conversionRate <= 0.35)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 6)
  };
}

export function buildQueriesDashboard(records: NormalizedRecord[], filters: DashboardFilters): QueriesDashboardData {
  return buildQueryIntelligence(records, filters);
}
