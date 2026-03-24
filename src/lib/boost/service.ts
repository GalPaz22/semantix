import type { BoostApiResponse, BoostFilters, BoostLevel, BoostProductRow } from "@/lib/dashboard/types";

const PAGE_SIZE = 50;

const FALLBACK_PRODUCTS: BoostProductRow[] = [
  {
    id: "demo-1",
    name: "Classic Hoodie",
    category: "Apparel",
    softCategories: ["hoodies", "streetwear"],
    type: "Simple",
    status: "Active",
    price: 79,
    imageUrl: undefined,
    currentBoost: 2,
    clicks: 34,
    carts: 6
  },
  {
    id: "demo-2",
    name: "City Sneaker",
    category: "Footwear",
    softCategories: ["sneakers", "running"],
    type: "Simple",
    status: "Active",
    price: 129,
    imageUrl: undefined,
    currentBoost: 1,
    clicks: 27,
    carts: 4
  },
  {
    id: "demo-3",
    name: "Canvas Tote",
    category: "Accessories",
    softCategories: ["bags"],
    type: "Simple",
    status: "Active",
    price: 39,
    imageUrl: undefined,
    currentBoost: 0,
    clicks: 11,
    carts: 2
  }
];

function asBoostLevel(value: string | undefined): BoostLevel {
  const numeric = Number(value);
  return numeric === 1 || numeric === 2 || numeric === 3 ? numeric : 0;
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

  const pageCandidate = Number(getValue("page"));
  const page = Number.isFinite(pageCandidate) && pageCandidate > 0 ? Math.floor(pageCandidate) : 1;

  return {
    query: getValue("query"),
    category: getValue("category"),
    boostState: getValue("boostState") as BoostFilters["boostState"],
    sort: getValue("sort") as BoostFilters["sort"],
    page
  };
}

export async function listBoostProducts(filters: BoostFilters): Promise<BoostApiResponse> {
  let products = [...FALLBACK_PRODUCTS];

  if (filters.query) {
    const query = filters.query.toLowerCase();
    products = products.filter((product) => product.name.toLowerCase().includes(query));
  }

  if (filters.category) {
    products = products.filter((product) => product.category === filters.category);
  }

  if (filters.boostState === "boosted") {
    products = products.filter((product) => product.currentBoost > 0);
  } else if (filters.boostState === "not-boosted") {
    products = products.filter((product) => product.currentBoost === 0);
  }

  products.sort((a, b) => {
    switch (filters.sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "clicks":
        return b.clicks - a.clicks;
      case "carts":
        return b.carts - a.carts;
      case "price-high":
        return (b.price ?? 0) - (a.price ?? 0);
      case "price-low":
        return (a.price ?? 0) - (b.price ?? 0);
      case "boost-high":
      default:
        return b.currentBoost - a.currentBoost || b.clicks - a.clicks;
    }
  });

  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const paged = products.slice(start, start + PAGE_SIZE);

  const boosted = products.filter((product) => product.currentBoost > 0);
  const boostedClicks = boosted.reduce((sum, product) => sum + product.clicks, 0);
  const boostedCarts = boosted.reduce((sum, product) => sum + product.carts, 0);

  return {
    generatedAt: new Date().toISOString(),
    warnings: ["Using demo boost products in this deployment."],
    errors: [],
    data: {
      products: paged,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        totalItems,
        totalPages
      },
      categories: Array.from(new Set(FALLBACK_PRODUCTS.map((product) => product.category).filter(Boolean))).map(
        (value) => ({ label: value as string, value: value as string })
      ),
      filtersApplied: {
        ...filters,
        page
      },
      summary: {
        totalProducts: products.length,
        boostedProducts: boosted.length,
        boostedClicks,
        boostedCarts,
        avgClicksPerBoostedProduct: boosted.length ? boostedClicks / boosted.length : 0,
        boostCoverage: products.length ? boosted.length / products.length : 0,
        boostLevelCounts: {
          1: boosted.filter((product) => product.currentBoost === asBoostLevel("1")).length,
          2: boosted.filter((product) => product.currentBoost === asBoostLevel("2")).length,
          3: boosted.filter((product) => product.currentBoost === asBoostLevel("3")).length
        },
        topBoostedProducts: boosted
          .slice()
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5)
          .map((product) => ({
            id: product.id,
            name: product.name,
            clicks: product.clicks,
            carts: product.carts,
            boost: product.currentBoost,
            price: product.price
          })),
        topBoostedProduct: boosted
          .slice()
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 1)
          .map((product) => ({
            id: product.id,
            name: product.name,
            clicks: product.clicks,
            carts: product.carts,
            boost: product.currentBoost,
            price: product.price
          }))[0]
      }
    }
  };
}
