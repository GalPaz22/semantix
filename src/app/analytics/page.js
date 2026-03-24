'use client'
import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  BarChart3,
  Search,
  Package,
  ArrowRight,
  AlertCircle,
  Target,
  AlertTriangle,
  Download,
  Clock,
  Calendar,
  Zap
} from "lucide-react";

const simpleCategoryWords = [
  "יין",
  "וויסקי",
  "וודקה",
  "ג'ין",
  "גין",
  "רום",
  "בירה",
  "ברנדי",
  "קוניאק",
  "ליקר"
];

const varietalWords = [
  "שרדונה",
  "מרלו",
  "קברנה",
  "קברנה סוביניון",
  "סוביניון בלאן",
  "ריזלינג",
  "גרנאש",
  "פינו נואר",
  "פינו נויר",
  "שיראז",
  "סירה",
  "מאלבק",
  "טמפרניו",
  "רוסאן",
  "ויונייה",
  "גמאי"
];

const contextDescriptors = [
  "שמתאים",
  "לחתונה",
  "למסיבה",
  "לאירוע",
  "לארוחה",
  "עם",
  "ליד",
  "טוב עם",
  "מתאים עם",
  "יין אדום",
  "יין לבן",
  "יבש",
  "חצי יבש",
  "קליל",
  "מרענן",
  "חגיגי",
  "מינרלי"
];

const attributeDescriptors = [
  "כשר",
  "טבעוני",
  "אורגני",
  "יין טבעי",
  "ללא אלכוהול",
  "נטול אלכוהול",
  "0%"
];

const tasteDescriptors = [
  "אדל פלאוור",
  "אבטיח",
  "פסיפלורה",
  "ליצ׳י",
  "דובדבן",
  "פירותי",
  "תפוח",
  "אגס",
  "שזיף",
  "ענבים",
  "לימון",
  "תות",
  "אשכולית",
  "אננס",
  "מנגו",
  "קוקוס",
  "בננה",
  "קפה",
  "קקאו",
  "דבש",
  "וניל",
  "שוקולד"
];

const spiritStyleDescriptors = [
  "לבן",
  "כהה",
  "בהיר",
  "שחור",
  "spiced",
  "מיושן",
  "gold",
  "silver",
  "בלנד",
  "סינגל מאלט"
];

const spiritCategories = [
  "וויסקי",
  "ויסקי",
  "רום",
  "וודקה",
  "ג'ין",
  "גין",
  "ליקר",
  "טקילה",
  "ברנדי",
  "קוניאק"
];

const geoCountries = [
  "ישראל",
  "צרפת",
  "איטליה",
  "ספרד",
  "פורטוגל",
  "גרמניה",
  "גרמני",
  "ארגנטינה",
  "צ׳ילה",
  "צילה",
  "אוסטרליה",
  "דרום אפריקה",
  "ארה״ב",
  "ארהב",
  "קליפורניה",
  "מרוקו",
  "יוון",
  "גאורגיה",
  "אוסטריה",
  "הונגריה",
  "יפן",
  "japan",
  "שבלי",
  "בורגון",
  "טוסקנה"
];

const geoAdjectives = [
  "יפני",
  "איטלקי",
  "צרפתי",
  "ספרדי",
  "ישראלי",
  "פורטוגלי",
  "גרמני",
  "ארגנטינאי",
  "מרוקאי",
  "יווני",
  "גאורגי",
  "אוסטרלי",
  "הונגרי",
  "אוסטרי",
  "אמריקאי",
  "קליפורני",
  "צ׳יליאני",
  "ציליאני"
];

const specialEditionPhrases = [
  "ספיישל",
  "אדישן",
  "מהדורה",
  "סדרה",
  "חדש",
  "חדשים",
  "מבצע"
];

const brandPhrases = ["יין רמונים", "יין קטן"];

const dealRegex = /\d+\s?ב[-\s]?\s?\d+/;
const currencyRegex = /\d+\s?(?:שח|₪)/i;
const rangeRegex = /עד\s*\d+/;
const skuPattern = /\d+\s*(?:קברנה|שרדונה|מרלו|סוביניון|מדבר|רום|וויסקי|ויסקי)/;

const glenCanonical = "גלן פידיך";

function trimAndNormalize(value = "") {
  return value.toString().replace(/\s+/g, " ").trim();
}

function containsAny(query, list) {
  return list.some((term) => query.includes(term.toLowerCase()));
}

function levenshtein(a, b) {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;
  const matrix = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));
  for (let i = 0; i <= lenA; i++) matrix[i][0] = i;
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;
  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[lenA][lenB];
}

function hasCategoryGeoPhrase(query) {
  const categories = [
    "יין",
    "וויסקי",
    "ויסקי",
    "וודקה",
    "בירה",
    "ברנדי",
    "קוניאק",
    "ליקר",
    "ג'ין",
    "גין",
    "טקילה",
    "רום"
  ];
  return categories.some((category) =>
    geoAdjectives.some((adj) => query.includes(`${category} ${adj}`))
  );
}

function isPureEnglish(query) {
  return /^[a-z0-9\s'\"-]+$/i.test(query);
}

function normalizePrice(price) {
  if (price == null) return 0;
  const value = typeof price === "number" ? price : parseFloat(price.toString().replace(/[^0-9.,]/g, "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function isComplex(query) {
  const normalized = trimAndNormalize(query);
  if (!normalized) return false;
  const lower = normalized.toLowerCase();

  // Simple overrides
  if (simpleCategoryWords.includes(lower)) {
    return false;
  }

  if (varietalWords.includes(lower)) {
    return false;
  }

  if (skuPattern.test(lower)) {
    return false;
  }

  if (isPureEnglish(lower) && !lower.includes(" ")) {
    return false;
  }

  // Complex indicators
  if (containsAny(lower, contextDescriptors)) return true;
  if (currencyRegex.test(lower)) return true;
  if (rangeRegex.test(lower)) return true;
  if (dealRegex.test(lower)) return true;
  if (containsAny(lower, attributeDescriptors)) return true;
  if (containsAny(lower, geoCountries)) return true;
  if (hasCategoryGeoPhrase(lower)) return true;
  if (containsAny(lower, tasteDescriptors)) return true;

  if (containsAny(lower, brandPhrases.map((phrase) => phrase.toLowerCase()))) return true;

  const glenVariants = [
    "גלן פיביך",
    "גלןפדיך",
    "גלן פידח",
    "גלנפידיך",
    "גלאן פידיך",
    "גלן פידיק",
    "גלן פידיץ",
    "glenfiddich"
  ];

  if (containsAny(lower, ["גלן", "glen"])) {
    if (containsAny(lower, glenVariants)) {
      return true;
    }
    if (levenshtein(lower.replace(/\s+/g, ""), glenCanonical.replace(/\s+/g, "").toLowerCase()) <= 2) {
      return true;
    }
  }

  if (containsAny(lower, specialEditionPhrases.map((p) => p.toLowerCase()))) return true;

  const hasSpiritStyle = spiritStyleDescriptors.some((descriptor) => lower.includes(descriptor.toLowerCase()));
  const hasSpiritCategory = spiritCategories.some((category) => lower.includes(category.toLowerCase()));
  if (hasSpiritStyle && hasSpiritCategory) return true;

  if (/[a-z]/i.test(lower)) {
    return true;
  }

  return false;
}

function formatCurrency(value) {
  return `₪${(value || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [queries, setQueries] = useState([]);
  const [filteredQueries, setFilteredQueries] = useState([]);
  const [cartAnalytics, setCartAnalytics] = useState([]);
  const [clickToCart, setClickToCart] = useState({ count: 0, sessions: 0 });
  const [zeroResultsCart, setZeroResultsCart] = useState({ count: 0, sessions: 0 });
  const [checkoutAnalytics, setCheckoutAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onboardDB, setOnboardDB] = useState("");
  const [dataLoaded, setDataLoaded] = useState({ onboarding: false, queries: false, cart: false, checkout: false });
  const [dateRange, setDateRange] = useState("last7days");

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "last7days":
        start.setDate(end.getDate() - 7);
        break;
      case "last30days":
        start.setDate(end.getDate() - 30);
        break;
      case "thisMonth":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default: // "all"
        return { startDate: null, endDate: null };
    }
    return { startDate: start, endDate: end };
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch user onboarding data
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.email) {
      setDataLoaded(prev => ({ ...prev, onboarding: true, queries: true, cart: true, checkout: true }));
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/get-onboarding");
        const data = await res.json();

        // Check for dbName in multiple possible locations
        const dbName = data.onboarding?.credentials?.dbName
          || data.credentials?.dbName
          || data.onboarding?.dbName
          || data.dbName
          || "";

        if (dbName) {
          setOnboardDB(dbName);
          setDataLoaded(prev => ({ ...prev, onboarding: true }));
        } else {
          setDataLoaded(prev => ({ ...prev, onboarding: true, queries: true, cart: true, checkout: true }));
        }
      } catch (err) {
        console.error("[Analytics] Error fetching onboarding:", err);
        setError("Failed to fetch onboarding data");
        setDataLoaded(prev => ({ ...prev, onboarding: true, queries: true, cart: true, checkout: true }));
      }
    })();
  }, [session, status]);

  // Filter queries when dateRange or raw queries change
  useEffect(() => {
    const { startDate, endDate } = getDateRange();
    if (!startDate || !endDate) {
      setFilteredQueries(queries);
      return;
    }

    const filtered = queries.filter(q => {
      if (!q.timestamp) return false;
      const qDate = new Date(q.timestamp);
      return qDate >= startDate && qDate <= endDate;
    });
    setFilteredQueries(filtered);
  }, [queries, dateRange]);

  // Fetch queries data
  useEffect(() => {
    if (!onboardDB) {
      return;
    }
    (async () => {
      setError("");
      // We fetch ALL queries first, then filter client-side because the external API might not support filtering
      try {
        const res = await fetch("https://dashboard-server-ae00.onrender.com/queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbName: onboardDB })
        });

        // Handle 204 No Content
        if (res.status === 204) {
          setQueries([]);
          setDataLoaded(prev => ({ ...prev, queries: true }));
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error fetching queries");
        setQueries(data.queries || []);
        setDataLoaded(prev => ({ ...prev, queries: true }));
      } catch (err) {
        console.error("[Analytics] Error fetching queries:", err);
        setError(err.message);
        setDataLoaded(prev => ({ ...prev, queries: true }));
      }
    })();
  }, [onboardDB]);

  const semantixFunnel = useMemo(() => {
    const assumptions = [
      "אירועי רכישה מזוהים מתוך אוסף checkout_events (אירועי השלמת רכישה).",
      "הכנסות חושבו על בסיס שדה cart_total - סכום הרכישה המלא.",
      "הסיווג 'שאילתה מורכבת' מבוסס על כללי המדיניות שסופקו."
    ];

    if (!checkoutAnalytics || checkoutAnalytics.length === 0) {
      return {
        assumptions,
        totals: { revenue: 0, orders: 0, items: 0 },
        weekly: [],
        daily: [],
        byQueryProduct: [],
        hasData: false
      };
    }

    const purchases = checkoutAnalytics
      .map((event, index) => {
        const searchQueryRaw = event.search_query || event.query || "";
        const searchQuery = trimAndNormalize(searchQueryRaw);

        // Extract product name - handle both direct fields and products array
        let productNameRaw = "";
        if (event.product_name) {
          productNameRaw = event.product_name;
        } else if (event.product) {
          productNameRaw = event.product;
        } else if (event.name) {
          productNameRaw = event.name;
        } else if (Array.isArray(event.products) && event.products.length > 0) {
          // If products is an array, get names from all products
          const productNames = event.products
            .map(p => p.product_name || p.name || "")
            .filter(name => name)
            .join(", ");
          productNameRaw = productNames;
        }
        const productName = trimAndNormalize(productNameRaw) || "ללא שם מוצר";

        const orderId = trimAndNormalize(
          event.order_id || event.orderId || event.checkout_id || `purchase-${index}`
        );
        const quantity = Number(event.quantity ?? event.qty ?? 1) || 1;

        // For checkout events, use cart_total as the revenue (it's already the total amount)
        const cartTotal = normalizePrice(event.cart_total ?? 0);
        const revenue = cartTotal > 0 ? cartTotal : normalizePrice(event.product_price ?? event.price ?? event.unit_price ?? 0) * quantity;
        const eventType = (event.event_type || event.type || "").toLowerCase();
        const isPurchaseEvent =
          !eventType ||
          eventType.includes("purchase") ||
          eventType.includes("checkout") ||
          eventType.includes("complete");
        const timestamp =
          event.event_time ||
          event.timestamp ||
          event.created_at ||
          event.createdAt ||
          event.time ||
          null;
        const eventDate = timestamp ? new Date(timestamp) : null;

        return {
          searchQuery,
          productName,
          orderId,
          quantity,
          revenue,
          isComplex: isComplex(searchQuery),
          isPurchaseEvent,
          eventDate
        };
      })
      .filter((event) => event.isPurchaseEvent && Number.isFinite(event.revenue));

    const complexPurchases = purchases.filter((event) => event.isComplex);

    if (complexPurchases.length === 0) {
      return {
        assumptions,
        totals: { revenue: 0, orders: 0, items: 0 },
        weekly: [],
        daily: [],
        byQueryProduct: [],
        hasData: false
      };
    }

    const orderSet = new Set();
    let totalRevenue = 0;
    let totalItems = 0;

    complexPurchases.forEach((event) => {
      if (event.orderId) {
        orderSet.add(event.orderId);
      }
      totalRevenue += event.revenue;
      totalItems += event.quantity;
    });

    const weeklyMap = new Map();
    const dailyMap = new Map();
    const detailMap = new Map();

    complexPurchases.forEach((event) => {
      if (event.eventDate instanceof Date && !Number.isNaN(event.eventDate.getTime())) {
        const dayDate = new Date(event.eventDate);
        dayDate.setHours(0, 0, 0, 0);
        const dayKey = dayDate.toISOString();
        const dayLabel = event.eventDate.toLocaleDateString("he-IL", {
          weekday: "long",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        });

        const dayEntry =
          dailyMap.get(dayKey) ||
          {
            period: dayLabel,
            revenue: 0,
            items: 0,
            orders: new Set()
          };
        dayEntry.revenue += event.revenue;
        dayEntry.items += event.quantity;
        if (event.orderId) {
          dayEntry.orders.add(event.orderId);
        }
        dailyMap.set(dayKey, dayEntry);

        const weekStart = new Date(dayDate);
        const dayOfWeek = weekStart.getDay(); // Sunday = 0
        weekStart.setDate(weekStart.getDate() - dayOfWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const weekKey = weekStart.toISOString();
        const weekLabel = `${weekStart.toLocaleDateString("he-IL")} - ${weekEnd.toLocaleDateString("he-IL")}`;

        const weekEntry =
          weeklyMap.get(weekKey) ||
          {
            period: weekLabel,
            revenue: 0,
            items: 0,
            orders: new Set()
          };
        weekEntry.revenue += event.revenue;
        weekEntry.items += event.quantity;
        if (event.orderId) {
          weekEntry.orders.add(event.orderId);
        }
        weeklyMap.set(weekKey, weekEntry);
      }

      const detailKey = `${event.searchQuery || "ללא שאילתה"}__${event.productName}`;
      const detailEntry =
        detailMap.get(detailKey) ||
        {
          search_query: event.searchQuery || "ללא שאילתה",
          product_name: event.productName,
          orders: new Set(),
          items: 0,
          revenue: 0
        };
      if (event.orderId) {
        detailEntry.orders.add(event.orderId);
      }
      detailEntry.items += event.quantity;
      detailEntry.revenue += event.revenue;
      detailMap.set(detailKey, detailEntry);
    });

    const weekly = Array.from(weeklyMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([, entry]) => ({
        period: entry.period,
        semantix_revenue: entry.revenue,
        semantix_orders: entry.orders.size,
        semantix_items: entry.items
      }));

    const daily = Array.from(dailyMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([, entry]) => ({
        period: entry.period,
        semantix_revenue: entry.revenue,
        semantix_orders: entry.orders.size,
        semantix_items: entry.items
      }));

    const byQueryProduct = Array.from(detailMap.values())
      .map((entry) => ({
        search_query: entry.search_query,
        product_name: entry.product_name,
        orders: entry.orders.size,
        items: entry.items,
        revenue: entry.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      assumptions,
      totals: {
        revenue: totalRevenue,
        orders: orderSet.size,
        items: totalItems
      },
      weekly,
      daily,
      byQueryProduct,
      hasData: true
    };
  }, [checkoutAnalytics]);

  // Fetch cart analytics data
  useEffect(() => {
    if (!onboardDB) {
      return;
    }
    const { startDate, endDate } = getDateRange();

    (async () => {
      try {
        const res = await fetch("/api/cart-analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbName: onboardDB,
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error fetching cart analytics");
        setCartAnalytics(data.cartItems || []);
        setClickToCart({
          count: data.analytics?.clickToCartCount || 0,
          sessions: data.analytics?.clickToCartSessions || 0
        });
        setZeroResultsCart({
          count: data.analytics?.zeroResultsCartCount || 0,
          sessions: data.analytics?.zeroResultsCartSessions || 0
        });
        setDataLoaded(prev => ({ ...prev, cart: true }));
      } catch (err) {
        console.error("[Analytics] Cart analytics error:", err);
        setDataLoaded(prev => ({ ...prev, cart: true }));
      }
    })();
  }, [onboardDB, dateRange]);

  // Fetch checkout (purchase) analytics data
  useEffect(() => {
    if (!onboardDB) {
      return;
    }
    const { startDate, endDate } = getDateRange();

    (async () => {
      try {
        const res = await fetch("/api/cart-analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbName: onboardDB,
            type: "checkout",
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error fetching checkout analytics");
        setCheckoutAnalytics(data.checkoutEvents || []);
        setDataLoaded(prev => ({ ...prev, checkout: true }));
      } catch (err) {
        console.error("[Analytics] Checkout analytics error:", err);
        setDataLoaded(prev => ({ ...prev, checkout: true }));
      }
    })();
  }, [onboardDB, dateRange]);

  // Update loading state when all data is loaded
  useEffect(() => {
    if (dataLoaded.onboarding && dataLoaded.queries && dataLoaded.cart && dataLoaded.checkout) {
      setLoading(false);
    }
  }, [dataLoaded, queries, cartAnalytics, checkoutAnalytics]);

  // Export queries to CSV
  const downloadCSV = () => {
    if (!queries.length) {
      alert('אין נתונים לייצוא');
      return;
    }

    // Create CSV content with proper headers order
    // Column order: 1. תאריך ושעה, 2. שאילתת חיפוש, 3. קטגוריה, 4. מחיר מינימלי, 5. מחיר מקסימלי, 6. כמות תוצאות
    const headers = ['תאריך ושעה', 'שאילתת חיפוש', 'קטגוריה', 'מחיר מינימלי', 'מחיר מקסימלי', 'כמות תוצאות'];
    const csvRows = [headers.join(',')];

    queries.forEach(query => {
      // Format timestamp properly
      const timestamp = query.timestamp
        ? new Date(query.timestamp).toLocaleString('he-IL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
        : 'N/A';

      // Ensure search query is properly formatted
      const searchQuery = query.query && typeof query.query === 'string'
        ? `"${query.query.replace(/"/g, '""')}"`
        : 'N/A';

      // Handle category properly - check if it's actually a category or something else
      let category = 'N/A';
      if (query.category) {
        if (Array.isArray(query.category)) {
          const categoryStr = query.category.join(', ');
          category = categoryStr && categoryStr !== 'unknown' ? `"${categoryStr.replace(/"/g, '""')}"` : 'N/A';
        } else if (typeof query.category === 'string' && query.category !== 'unknown') {
          category = `"${query.category.replace(/"/g, '""')}"`;
        }
      }

      // Ensure price values are actually numeric and formatted correctly
      const minPrice = (query.minPrice && typeof query.minPrice === 'number') ? `₪${query.minPrice}` : 'N/A';
      const maxPrice = (query.maxPrice && typeof query.maxPrice === 'number') ? `₪${query.maxPrice}` : 'N/A';

      // Ensure results count is numeric
      const resultsCount = (typeof query.resultsCount === 'number' && query.resultsCount >= 0) ? query.resultsCount.toString() : 'N/A';

      // Create the row with proper ordering - ensure exact match with headers
      const row = [
        `"${timestamp}"`,        // תאריך ושעה (עמודה 1)
        searchQuery,             // שאילתת חיפוש (עמודה 2) - כבר עם מרכאות
        category,                // קטגוריה (עמודה 3) - כבר עם מרכאות או N/A
        `"${minPrice}"`,         // מחיר מינימלי (עמודה 4)
        `"${maxPrice}"`,         // מחיר מקסימלי (עמודה 5)
        `"${resultsCount}"`      // כמות תוצאות (עמודה 6)
      ];

      csvRows.push(row.join(','));
    });

    // Add UTF-8 BOM for proper Hebrew encoding in Excel
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `semantix-queries-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate advanced business insights - Professional Data Analysis
  const businessInsights = useMemo(() => {
    // Use filteredQueries for analysis
    const activeQueries = filteredQueries;

    // Calculate basic metrics
    const totalSearches = activeQueries.length;
    const timestamps = activeQueries.map(q => new Date(q.timestamp).getTime()).filter(t => !isNaN(t));

    // Use reduce instead of spread operator to avoid stack overflow with large arrays
    let daySpan = 1;
    if (timestamps.length > 0) {
      const maxTimestamp = timestamps.reduce((a, b) => Math.max(a, b), -Infinity);
      const minTimestamp = timestamps.reduce((a, b) => Math.min(a, b), Infinity);
      daySpan = Math.max(1, Math.ceil((maxTimestamp - minTimestamp) / (1000 * 60 * 60 * 24)));
    }
    const averageDaily = (totalSearches / daySpan).toFixed(1);

    // Analyze search keywords with conversion data
    const queryAnalysis = {};
    activeQueries.forEach(q => {
      const query = (q.query || "").toLowerCase().trim();
      if (query) {
        if (!queryAnalysis[query]) {
          queryAnalysis[query] = {
            keyword: query,
            searches: 0,
            conversions: 0,
            revenue: 0,
            avgPrice: 0,
            categories: new Set(),
            priceFilters: 0
          };
        }
        queryAnalysis[query].searches += 1;
        if (q.category) queryAnalysis[query].categories.add(Array.isArray(q.category) ? q.category[0] : q.category);
        if (q.minPrice || q.maxPrice) queryAnalysis[query].priceFilters += 1;
      }
    });

    // Add conversion and revenue data
    cartAnalytics.forEach(item => {
      const query = (item.search_query || "").toLowerCase().trim();
      if (query && queryAnalysis[query]) {
        queryAnalysis[query].conversions += 1;
        const price = parseFloat((item.product_price || item.price || "0").toString().replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          queryAnalysis[query].revenue += price * (item.quantity || 1);
        }
      }
    });

    // Calculate conversion rates and average prices
    Object.values(queryAnalysis).forEach(item => {
      item.conversionRate = item.searches > 0 ? (item.conversions / item.searches) * 100 : 0;
      item.avgPrice = item.conversions > 0 ? item.revenue / item.conversions : 0;
      item.categories = Array.from(item.categories);
    });

    // Sort by different criteria
    const topKeywords = Object.values(queryAnalysis)
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 10);

    const topConverting = Object.values(queryAnalysis)
      .filter(q => q.conversions > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);

    const topRevenue = Object.values(queryAnalysis)
      .filter(q => q.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Find missed opportunities (high search, low conversion)
    const missedOpportunities = Object.values(queryAnalysis)
      .filter(q => q.searches >= 5 && q.conversionRate < 10)
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 5)
      .map(q => ({
        keyword: q.keyword,
        searches: q.searches,
        conversions: q.conversions,
        potentialRevenue: q.searches * 50 // Estimated average order value
      }));

    // Calculate overall conversion rate and revenue
    const totalConversions = cartAnalytics.length;
    const conversionRate = totalSearches > 0 ? (totalConversions / totalSearches) * 100 : 0;
    const totalRevenue = Object.values(queryAnalysis).reduce((sum, q) => sum + q.revenue, 0);

    // Calculate total revenue from all cart items (both checkout and add to cart)
    const totalRevenueFromCart = cartAnalytics.reduce((sum, item) => {
      const price = parseFloat((item.product_price || item.price || "0").toString().replace(/[^0-9.]/g, ''));
      if (!isNaN(price)) {
        return sum + (price * (item.quantity || 1));
      }
      return sum;
    }, 0);

    // Advanced Time-Based Analysis
    const timeAnalysis = {
      hourly: {},
      daily: {},
      hourlyByCategory: {},
      peakHours: [],
      lowHours: []
    };

    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    activeQueries.forEach(q => {
      if (!q.timestamp) return;

      const date = new Date(q.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const dayName = dayNames[dayOfWeek];
      const category = Array.isArray(q.category) ? q.category[0] : q.category;

      // Hourly analysis
      if (!timeAnalysis.hourly[hour]) {
        timeAnalysis.hourly[hour] = { searches: 0, conversions: 0, revenue: 0, keywords: new Set() };
      }
      timeAnalysis.hourly[hour].searches += 1;
      if (q.query) timeAnalysis.hourly[hour].keywords.add(q.query);

      // Daily analysis
      if (!timeAnalysis.daily[dayName]) {
        timeAnalysis.daily[dayName] = { searches: 0, conversions: 0, revenue: 0, keywords: new Set() };
      }
      timeAnalysis.daily[dayName].searches += 1;
      if (q.query) timeAnalysis.daily[dayName].keywords.add(q.query);

      // Hourly by category analysis - exclude unknown categories
      if (category && category !== 'unknown') {
        const key = `${hour}-${category}`;
        if (!timeAnalysis.hourlyByCategory[key]) {
          timeAnalysis.hourlyByCategory[key] = { hour, category, searches: 0, conversions: 0 };
        }
        timeAnalysis.hourlyByCategory[key].searches += 1;
      }
    });

    // Add conversion data to time analysis
    cartAnalytics.forEach(item => {
      if (!item.created_at) return;
      const date = new Date(item.created_at);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const dayName = dayNames[dayOfWeek];
      const price = parseFloat((item.product_price || item.price || "0").toString().replace(/[^0-9.]/g, ''));

      // Initialize if doesn't exist
      if (!timeAnalysis.hourly[hour]) {
        timeAnalysis.hourly[hour] = { searches: 0, conversions: 0, revenue: 0, keywords: new Set() };
      }
      if (!timeAnalysis.daily[dayName]) {
        timeAnalysis.daily[dayName] = { searches: 0, conversions: 0, revenue: 0, keywords: new Set() };
      }

      timeAnalysis.hourly[hour].conversions += 1;
      timeAnalysis.daily[dayName].conversions += 1;

      if (!isNaN(price)) {
        const totalPrice = price * (item.quantity || 1);
        timeAnalysis.hourly[hour].revenue += totalPrice;
        timeAnalysis.daily[dayName].revenue += totalPrice;
      }
    });

    // Calculate peak and low hours
    const hourlyData = Object.entries(timeAnalysis.hourly)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        searches: data.searches,
        conversions: data.conversions,
        conversionRate: data.searches > 0 ? (data.conversions / data.searches) * 100 : 0,
        revenue: data.revenue
      }))
      .sort((a, b) => b.searches - a.searches);

    timeAnalysis.peakHours = hourlyData.slice(0, 3);
    timeAnalysis.lowHours = hourlyData.slice(-3).reverse();

    // Generate actionable insights
    const actionableInsights = [];

    // Only show insights with sufficient data and meaningful thresholds
    const MIN_SEARCHES_FOR_INSIGHTS = 10;
    const MIN_CONVERSION_RATE_FOR_SUCCESS = 5; // 5% or higher
    const MIN_REVENUE_FOR_SHOWCASE = 100; // 100₪ or higher

    // 1. Peak Hours Analysis
    if (timeAnalysis.peakHours.length > 0 && timeAnalysis.peakHours[0].searches >= 10) {
      const peakHour = timeAnalysis.peakHours[0];
      actionableInsights.push({
        icon: '🕐',
        type: 'info',
        title: 'שעות שיא בחיפוש',
        description: `בין ${peakHour.hour}:00-${peakHour.hour + 1}:00 מתבצעים ${peakHour.searches} חיפושים (${((peakHour.searches / totalSearches) * 100).toFixed(1)}% מכלל החיפושים)`,
        action: `תזמן פרסום קמפיינים ופוסטים ברשתות החברתיות לשעות ${peakHour.hour}:00-${peakHour.hour + 1}:00`
      });
    }

    // 2. Category-based Time Analysis - exclude unknown categories
    const categoryTimeInsights = Object.values(timeAnalysis.hourlyByCategory)
      .filter(item => item.searches >= 8 && item.category !== 'unknown')
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 3);

    categoryTimeInsights.forEach(item => {
      if (item.searches >= 8) {
        actionableInsights.push({
          icon: '📊',
          type: 'success',
          title: `פעילות גבוהה לשעת הקטגוריה: ${item.category}`,
          description: `${item.searches} חיפושים ב-${item.category} בין השעות ${item.hour}:00-${item.hour + 1}:00`,
          action: `הכן מבצע מיוחד על ${item.category} לשעות ${item.hour}:00-${item.hour + 1}:00 וכוון קמפיין ממוקד`
        });
      }
    });

    // 3. Best performing queries with time context
    if (topConverting.length > 0 && topConverting[0].conversionRate >= MIN_CONVERSION_RATE_FOR_SUCCESS) {
      actionableInsights.push({
        icon: '🎯',
        type: 'success',
        title: 'שאילתות עם המרה גבוהה',
        description: `"${topConverting[0].keyword}" מניב ${topConverting[0].conversionRate.toFixed(1)}% המרה מ-${topConverting[0].searches} חיפושים`,
        action: `הגדל את הנראות של מוצרים אלו בדף הבית ובפיד המוצרים המומלצים`
      });
    }

    // 4. Revenue opportunities with timing
    if (topRevenue.length > 0 && topRevenue[0].revenue >= MIN_REVENUE_FOR_SHOWCASE) {
      actionableInsights.push({
        icon: '💰',
        type: 'revenue',
        title: 'מילת מפתח מובילה בהכנסות',
        description: `"${topRevenue[0].keyword}" הניב ₪${topRevenue[0].revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        action: 'השקע בקמפיין PPC ממומן וקידום אורגני עבור מילת מפתח זו במיוחד בשעות השיא'
      });
    }

    // 5. High conversion hours
    const highConversionHours = hourlyData.filter(h => h.conversionRate >= 10 && h.searches >= 5);
    if (highConversionHours.length > 0) {
      const bestHour = highConversionHours[0];
      actionableInsights.push({
        icon: '⚡',
        type: 'success',
        title: 'שעות עם המרה גבוהה',
        description: `בשעות ${bestHour.hour}:00-${bestHour.hour + 1}:00 שיעור המרה של ${bestHour.conversionRate.toFixed(1)}% מ-${bestHour.searches} חיפושים`,
        action: `השקע יותר משאבי שיווק לשעות ${bestHour.hour}:00-${bestHour.hour + 1}:00 - הקהל הפעיל בשעות אלו נוטה לקנות`
      });
    }

    // 6. Day-specific category insights - exclude unknown categories
    const dailyCategoryInsights = {};
    queries.forEach(q => {
      if (!q.timestamp || !q.category) return;
      const date = new Date(q.timestamp);
      const dayOfWeek = date.getDay();
      const dayName = dayNames[dayOfWeek];
      const category = Array.isArray(q.category) ? q.category[0] : q.category;

      // Skip unknown categories
      if (category === 'unknown') return;

      const key = `${dayName}-${category}`;
      if (!dailyCategoryInsights[key]) {
        dailyCategoryInsights[key] = { day: dayName, category, searches: 0 };
      }
      dailyCategoryInsights[key].searches += 1;
    });

    const topDayCategory = Object.values(dailyCategoryInsights)
      .filter(item => item.searches >= 8 && item.category !== 'unknown')
      .sort((a, b) => b.searches - a.searches)[0];

    if (topDayCategory) {
      actionableInsights.push({
        icon: '📅',
        type: 'info',
        title: `פעילות קטגורית מיוחדת ביום ${topDayCategory.day}`,
        description: `${topDayCategory.searches} חיפושים ב-${topDayCategory.category} ביום ${topDayCategory.day}`,
        action: `הכן תוכן ומבצעים מיוחדים עבור ${topDayCategory.category} ביום ${topDayCategory.day} כדי לנצל את ההזדמנות`
      });
    }

    // 7. Low performing hours opportunity
    if (timeAnalysis.lowHours.length > 0 && timeAnalysis.lowHours[0].searches < 5 && totalSearches >= 50) {
      const lowHour = timeAnalysis.lowHours[0];
      actionableInsights.push({
        icon: '⬆️',
        type: 'warning',
        title: 'שעות עם פוטנציאל שאינו מנוצל',
        description: `רק ${lowHour.searches} חיפושים בשעות ${lowHour.hour}:00-${lowHour.hour + 1}:00`,
        action: `תזמן תוכן מעורר וקמפיינים מתוחכמים לשעות ${lowHour.hour}:00-${lowHour.hour + 1}:00 כדי להגדיל את הנפח`
      });
    }

    // Generate SEO recommendations - only with sufficient data
    const seoRecommendations = [];

    // Only show SEO recommendations if we have meaningful data
    const MIN_SEARCHES_FOR_SEO = 5;

    // Long-tail keywords with meaningful volume
    const longTailKeywords = Object.values(queryAnalysis)
      .filter(q => q.keyword.split(' ').length >= 3 && q.searches >= MIN_SEARCHES_FOR_SEO)
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 2); // Limit to top 2 only

    if (longTailKeywords.length >= 2) {
      seoRecommendations.push({
        priority: 'medium',
        title: 'מילות מפתח ארוכות עם נפח חיפוש',
        keywords: longTailKeywords.map(k => k.keyword),
        action: 'שקול יצירת תוכן ייעודי עבור ביטויים אלו'
      });
    }

    // Category-based SEO - only if we have clear category patterns, exclude unknown
    const categoryFreq = {};
    activeQueries.forEach(q => {
      const cats = Array.isArray(q.category) ? q.category : [q.category];
      cats.forEach(cat => {
        if (cat && cat !== 'unknown') categoryFreq[cat] = (categoryFreq[cat] || 0) + 1;
      });
    });

    const topCategories = Object.entries(categoryFreq)
      .filter(([, count]) => count >= MIN_SEARCHES_FOR_SEO)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat]) => cat);

    if (topCategories.length >= 2) {
      seoRecommendations.push({
        priority: 'medium',
        title: 'קטגוריות עם נפח חיפוש גבוה',
        keywords: topCategories,
        action: 'וודא שדפי הקטגוריות ממוטבים ואיכותיים'
      });
    }

    return {
      topKeywords,
      actionableInsights,
      missedOpportunities,
      seoRecommendations,
      topConverting,
      topRevenue,
      totalSearches,
      averageDaily,
      conversionRate,
      totalRevenue,
      totalRevenueFromCart,
      timeAnalysis
    };
  }, [filteredQueries, cartAnalytics]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="text-center bg-white p-8 rounded-xl shadow-md max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">שגיאה</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-medium">
            חזרה ללוח הבקרה →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button and Export */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה ללוח הבקרה
          </Link>

          {queries.length > 0 && (
            <button
              onClick={downloadCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">ייצא נתונים</span>
            </button>
          )}
        </div>

        {/* Business Insights Section - Minimalist Design */}
        {businessInsights.topKeywords.length > 0 ? (
          <div className="space-y-8">
            {/* Page Header */}
            <header className="mb-8">
              <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 rounded-2xl shadow-xl">
                <div className="absolute inset-0 opacity-10">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                <div className="relative p-8 flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">תובנות עסקיות</h1>
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <p className="text-purple-100 ml-4">ניתוח נתוני החיפוש והביצועים</p>
                      {/* Date Filter */}
                      <div className="bg-white/10 backdrop-blur-md rounded-lg flex items-center p-1 border border-white/20">
                        <button
                          onClick={() => setDateRange('last7days')}
                          className={`px-3 py-1 text-sm rounded-md transition-all ${dateRange === 'last7days' ? 'bg-white text-indigo-700 font-medium shadow-sm' : 'text-white hover:bg-white/10'}`}
                        >
                          7 ימים אחרונים
                        </button>
                        <button
                          onClick={() => setDateRange('last30days')}
                          className={`px-3 py-1 text-sm rounded-md transition-all ${dateRange === 'last30days' ? 'bg-white text-indigo-700 font-medium shadow-sm' : 'text-white hover:bg-white/10'}`}
                        >
                          30 ימים אחרונים
                        </button>
                        <button
                          onClick={() => setDateRange('all')}
                          className={`px-3 py-1 text-sm rounded-md transition-all ${dateRange === 'all' ? 'bg-white text-indigo-700 font-medium shadow-sm' : 'text-white hover:bg-white/10'}`}
                        >
                          הכל
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 space-x-reverse flex-wrap gap-4">
                    <div className="text-center bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm shadow-lg border border-white/10">
                      <p className="text-white/80 text-sm">סה"כ חיפושים</p>
                      <p className="text-xl font-bold text-white">{(businessInsights.totalSearches || 0).toLocaleString('en-US')}</p>
                    </div>
                    {/* Removed Average Daily */}
                    <div className="text-center bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm shadow-lg border border-white/10">
                      <p className="text-white/80 text-sm">הכנסות כוללות</p>
                      <p className="text-xl font-bold text-white">₪{(businessInsights.totalRevenueFromCart || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {clickToCart.count > 0 && (
                      <div className="text-center bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm shadow-lg border border-white/10">
                        <p className="text-white/80 text-sm">קליקים שהובילו לסל</p>
                        <p className="text-xl font-bold text-white">{clickToCart.count.toLocaleString('en-US')}</p>
                        <p className="text-white/60 text-xs">{clickToCart.sessions} סשנים</p>
                      </div>
                    )}
                    {zeroResultsCart.count > 0 && (
                      <div className="text-center bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm shadow-lg border border-white/10">
                        <p className="text-white/80 text-sm">תוצאות אפס שהובילו לסל</p>
                        <p className="text-xl font-bold text-white">{zeroResultsCart.count.toLocaleString('en-US')}</p>
                        <p className="text-white/60 text-xs">{zeroResultsCart.sessions} סשנים</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>
            {/* Time-Based Analytics */}
            {businessInsights.timeAnalysis && (businessInsights.timeAnalysis.peakHours.length > 0 || Object.keys(businessInsights.timeAnalysis.daily).length > 0) && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-md overflow-hidden border border-purple-100 mb-8">
                <div className="px-6 py-4 border-b border-purple-200 bg-gradient-to-r from-purple-100 to-indigo-100">
                  <h3 className="text-lg font-semibold text-purple-800 flex items-center">
                    <Clock className="h-5 w-5 text-purple-600 ml-2" />
                    ניתוח זמנים ופעילות
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Peak Hours */}
                    {businessInsights.timeAnalysis.peakHours.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                          <Zap className="h-4 w-4 text-purple-600 ml-2" />
                          שעות שיא
                        </h4>
                        <div className="space-y-2">
                          {businessInsights.timeAnalysis.peakHours.slice(0, 3).map((hour, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                              <span className="text-sm font-medium text-purple-700">
                                {hour.hour}:00-{hour.hour + 1}:00
                              </span>
                              <span className="text-sm text-purple-600">
                                {hour.searches} חיפושים
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Daily Activity */}
                    {Object.keys(businessInsights.timeAnalysis.daily).length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-indigo-200">
                        <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
                          <Calendar className="h-4 w-4 text-indigo-600 ml-2" />
                          פעילות יומית
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(businessInsights.timeAnalysis.daily)
                            .sort((a, b) => b[1].searches - a[1].searches)
                            .slice(0, 4)
                            .map(([day, data], index) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-indigo-50 rounded">
                                <span className="text-sm font-medium text-indigo-700">{day}</span>
                                <span className="text-sm text-indigo-600">{data.searches} חיפושים</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Conversion Performance by Hour */}
                  {businessInsights.timeAnalysis.peakHours.length > 0 && (
                    <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <TrendingUp className="h-4 w-4 text-green-600 ml-2" />
                        ביצועי המרה לפי שעות
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(businessInsights.timeAnalysis.hourly)
                          .map(([hour, data]) => ({
                            hour: parseInt(hour),
                            searches: data.searches,
                            conversions: data.conversions,
                            conversionRate: data.searches > 0 ? (data.conversions / data.searches) * 100 : 0,
                            revenue: data.revenue
                          }))
                          .filter(item => item.searches >= 5)
                          .sort((a, b) => b.conversionRate - a.conversionRate)
                          .slice(0, 6)
                          .map((item, index) => (
                            <div key={index} className={`rounded-lg p-3 border ${item.conversionRate >= 10 ? 'bg-green-50 border-green-200' :
                              item.conversionRate >= 5 ? 'bg-yellow-50 border-yellow-200' :
                                'bg-red-50 border-red-200'
                              }`}>
                              <div className="text-sm font-medium text-gray-800">
                                {item.hour}:00-{item.hour + 1}:00
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {item.searches} חיפושים • {item.conversions} המרות
                              </div>
                              <div className={`text-xs font-semibold ${item.conversionRate >= 10 ? 'text-green-700' :
                                item.conversionRate >= 5 ? 'text-yellow-700' :
                                  'text-red-700'
                                }`}>
                                {item.conversionRate.toFixed(1)}% המרה
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Analytics Table */}
            {businessInsights.topKeywords.length > 0 && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <h3 className="text-lg font-semibold text-purple-800 flex items-center">
                    <BarChart3 className="h-5 w-5 text-purple-600 ml-2" />
                    ביצועי מילות מפתח
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          מילת חיפוש
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          חיפושים
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          המרות
                        </th>
                        {/* Removed Conversion Rate Header */}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {businessInsights.topKeywords.slice(0, 10).map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {item.keyword}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.searches.toLocaleString('en-US')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.conversions.toLocaleString('en-US')}
                          </td>
                          {/* Removed Conversion Rate Column */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actionable Business Insights */}
            {businessInsights.actionableInsights.length > 0 && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Target className="h-5 w-5 text-purple-600 ml-2" />
                    תובנות עסקיות לפעולה
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {businessInsights.actionableInsights.map((insight, index) => (
                      <div key={index} className={`rounded-lg p-4 border transition-all hover:shadow-md ${insight.type === 'success' ? 'bg-green-50 border-green-200 hover:border-green-300' :
                        insight.type === 'revenue' ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' :
                          insight.type === 'warning' ? 'bg-orange-50 border-orange-200 hover:border-orange-300' :
                            'bg-blue-50 border-blue-200 hover:border-blue-300'
                        }`}>
                        <div className="flex items-start">
                          <span className="text-lg ml-3">{insight.icon}</span>
                          <div className="flex-1">
                            <h4 className={`font-semibold mb-1 ${insight.type === 'success' ? 'text-green-800' :
                              insight.type === 'revenue' ? 'text-yellow-800' :
                                insight.type === 'warning' ? 'text-orange-800' :
                                  'text-blue-800'
                              }`}>{insight.title}</h4>
                            <p className="text-gray-700 mb-2 text-sm">{insight.description}</p>
                            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
                              <p className={`text-xs font-medium ${insight.type === 'success' ? 'text-green-700' :
                                insight.type === 'revenue' ? 'text-yellow-700' :
                                  insight.type === 'warning' ? 'text-orange-700' :
                                    'text-blue-700'
                                }`}>
                                <span className="font-bold">💡 פעולה מומלצת:</span> {insight.action}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Missed Opportunities */}
            {businessInsights.missedOpportunities.length > 0 && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600 ml-2" />
                    הזדמנויות לשיפור
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {businessInsights.missedOpportunities.map((opportunity, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-2">{opportunity.keyword}</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">חיפושים: {opportunity.searches}</p>
                          <p className="text-gray-600">המרות: {opportunity.conversions}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-sm text-gray-700">
                      בדוק מדוע חיפושים אלו לא מובילים להמרות - אולי חסר מלאי או המחירים גבוהים מדי
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SEO Recommendations */}
            {businessInsights.seoRecommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Search className="h-5 w-5 text-indigo-600 ml-2" />
                    המלצות SEO
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {businessInsights.seoRecommendations.map((rec, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                            {rec.priority === 'high' ? 'גבוהה' :
                              rec.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {rec.keywords.slice(0, 3).map((keyword, kIndex) => (
                            <span
                              key={kIndex}
                              className="inline-flex items-center px-3 py-1 text-sm bg-white text-gray-700 rounded border border-gray-200"
                            >
                              {keyword}
                            </span>
                          ))}
                          {rec.keywords.length > 3 && (
                            <span className="text-sm text-gray-500">+{rec.keywords.length - 3} נוספות</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{rec.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">אין נתונים זמינים</h2>
            <p className="text-gray-600 mb-6">
              לא נמצאו נתונים עדיין. התחל לאסוף נתונים על ידי חיפושים באתר שלך.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              חזרה ללוח הבקרה
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

