import type { NormalizedRecord } from "@/lib/dashboard/types";

const baseDate = new Date("2025-03-01T09:00:00.000Z");

function isoOffset(days: number, hours: number) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hours, 0, 0, 0);
  return date;
}

function createSession(
  id: string,
  query: string,
  product: string,
  revenue: number,
  dayOffset: number,
  options: {
    customer: string;
    region: string;
    channel: string;
    userId: string;
    ipAddress: string;
    resultsCount: number;
    addToCart?: boolean;
    purchase?: boolean;
  }
) {
  const events: NormalizedRecord[] = [];
  const searchTime = isoOffset(dayOffset, 9);
  events.push({
    id: `${id}-search`,
    collection: "semantix.searchEvents",
    timestamp: searchTime,
    customer: options.customer,
    region: options.region,
    channel: options.channel,
    summary: `Search for ${query}`,
    query,
    sessionId: id,
    userId: options.userId,
    ipAddress: options.ipAddress,
    resultsCount: options.resultsCount,
    matchedProducts: options.resultsCount,
    isException: options.resultsCount === 0,
    isClosed: false,
    eventType: "query"
  });

  if (options.resultsCount > 0) {
    events.push({
      id: `${id}-click`,
      collection: "semantix.searchEvents",
      timestamp: isoOffset(dayOffset, 10),
      revenue: options.purchase ? revenue : undefined,
      customer: options.customer,
      product,
      region: options.region,
      channel: options.channel,
      summary: `Click on ${product}`,
      query,
      sessionId: id,
      userId: options.userId,
      ipAddress: options.ipAddress,
      resultsCount: options.resultsCount,
      matchedProducts: options.resultsCount,
      status: "clicked",
      isException: false,
      isClosed: false,
      eventType: "click"
    });
  }

  if (options.addToCart) {
    events.push({
      id: `${id}-cart`,
      collection: "semantix.searchEvents",
      timestamp: isoOffset(dayOffset, 11),
      customer: options.customer,
      product,
      region: options.region,
      channel: options.channel,
      summary: `Add ${product} to cart`,
      query,
      sessionId: id,
      userId: options.userId,
      ipAddress: options.ipAddress,
      resultsCount: options.resultsCount,
      matchedProducts: options.resultsCount,
      status: "cart",
      isException: false,
      isClosed: false,
      eventType: "add_to_cart"
    });
  }

  if (options.purchase) {
    events.push({
      id: `${id}-purchase`,
      collection: "semantix.orders",
      timestamp: isoOffset(dayOffset, 12),
      revenue,
      customer: options.customer,
      product,
      region: options.region,
      channel: options.channel,
      summary: `Purchase of ${product}`,
      query,
      sessionId: id,
      userId: options.userId,
      ipAddress: options.ipAddress,
      resultsCount: options.resultsCount,
      matchedProducts: options.resultsCount,
      status: "paid",
      isException: false,
      isClosed: true,
      eventType: "purchase"
    });
  }

  return events;
}

export const demoSemantixRecords: NormalizedRecord[] = [
  ...createSession("sess-001", "organic red wine", "Organic Reserve Red", 186, 0, {
    customer: "Napa & Co",
    region: "US",
    channel: "Search",
    userId: "user-001",
    ipAddress: "172.16.10.14",
    resultsCount: 2,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-002", "cheap champagne", "Sparkling Brut Discovery", 0, 1, {
    customer: "Napa & Co",
    region: "US",
    channel: "Search",
    userId: "user-002",
    ipAddress: "172.16.10.22",
    resultsCount: 0,
    addToCart: false,
    purchase: false
  }),
  ...createSession("sess-003", "vegan wine", "Vegan Syrah Collection", 224, 2, {
    customer: "Cellar Theory",
    region: "UK",
    channel: "AI Search",
    userId: "user-003",
    ipAddress: "172.16.10.30",
    resultsCount: 6,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-004", "sweet red wine", "Velvet Sweet Blend", 94, 3, {
    customer: "Cellar Theory",
    region: "UK",
    channel: "Search",
    userId: "user-004",
    ipAddress: "172.16.10.44",
    resultsCount: 8,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-005", "natural wine", "Natural Orange Pack", 132, 4, {
    customer: "Grape Circle",
    region: "US",
    channel: "AI Search",
    userId: "user-005",
    ipAddress: "172.16.10.54",
    resultsCount: 1,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-006", "orange wine", "Skin Contact Orange", 0, 5, {
    customer: "Grape Circle",
    region: "US",
    channel: "Search",
    userId: "user-006",
    ipAddress: "172.16.10.60",
    resultsCount: 3,
    addToCart: false,
    purchase: false
  }),
  ...createSession("sess-007", "cheap red wine", "House Red Case", 72, 6, {
    customer: "Wine Atlas",
    region: "DE",
    channel: "Search",
    userId: "user-007",
    ipAddress: "172.16.10.70",
    resultsCount: 5,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-008", "rose wine gift", "Rose Discovery Box", 120, 7, {
    customer: "Wine Atlas",
    region: "DE",
    channel: "AI Search",
    userId: "user-008",
    ipAddress: "172.16.10.82",
    resultsCount: 4,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-009", "vegan sparkling wine", "Vegan Sparkling Cuvee", 143, 8, {
    customer: "Merchant Demo",
    region: "US",
    channel: "AI Search",
    userId: "user-009",
    ipAddress: "172.16.10.96",
    resultsCount: 2,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-010", "organic red wine", "Organic Reserve Red", 186, 9, {
    customer: "Merchant Demo",
    region: "US",
    channel: "Search",
    userId: "user-010",
    ipAddress: "172.16.10.104",
    resultsCount: 2,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-011", "sweet red wine", "Velvet Sweet Blend", 0, 10, {
    customer: "Merchant Demo",
    region: "CA",
    channel: "Search",
    userId: "user-011",
    ipAddress: "172.16.10.111",
    resultsCount: 7,
    addToCart: true,
    purchase: false
  }),
  ...createSession("sess-012", "low alcohol wine", "Low ABV White", 118, 11, {
    customer: "Merchant Demo",
    region: "CA",
    channel: "AI Search",
    userId: "user-012",
    ipAddress: "172.16.10.120",
    resultsCount: 4,
    addToCart: true,
    purchase: true
  }),
  ...createSession("sess-013", "cheap champagne", "Sparkling Brut Discovery", 0, 12, {
    customer: "Merchant Demo",
    region: "US",
    channel: "Search",
    userId: "user-013",
    ipAddress: "172.16.10.131",
    resultsCount: 1,
    addToCart: false,
    purchase: false
  }),
  ...createSession("sess-014", "natural wine", "Natural Orange Pack", 132, 13, {
    customer: "Merchant Demo",
    region: "US",
    channel: "AI Search",
    userId: "user-014",
    ipAddress: "172.16.10.143",
    resultsCount: 1,
    addToCart: true,
    purchase: true
  })
];
