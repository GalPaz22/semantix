'use client'
import React, { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MenuConnector from '../components/MenuConnector';
import ProductsPanel from '../components/ProductsPanel';
import CategoryBoostsPanel from '../components/CategoryBoostsPanel';
import AdminPanel from '../components/AdminPanel';
import DemoPanel from '../components/DemoPanel';
// Import the subscription-related components at the top
import { useUserDetails } from '../hooks/useUserDetails';
import { SUBSCRIPTION_TIERS } from '/lib/paddle-config';
import CancellationModal from '../components/CancellationModal';
import AnalyticsPanel from '../components/AnalyticsPanel';

// Charts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

// Lucide icons
import {
  LayoutDashboard,
  ListTodo,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Download,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Calendar,
  Filter,
  LogOut,
  Copy,
  Shield,
  RefreshCw,
  CreditCard, // Add this icon
  Crown,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  Monitor,
  MousePointer2,
  Zap,
  Star,
  Activity
} from "lucide-react";


// Re‑usable fullscreen message with improved styling
const FullScreenMsg = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
    <div className="text-xl text-gray-700 font-medium shadow-lg bg-white p-8 rounded-xl">
      {children}
    </div>
  </div>
);

// ===== Semantix Complex Query Classification =====
const simpleCategoryWords = ["יין", "וויסקי", "וודקה", "ג'ין", "גין", "רום", "בירה", "ברנדי", "קוניאק", "ליקר", "יין אדום", "יין לבן", "יין רוזה", "רוזה", "אדום", "לבן"];
const varietalWords = ["שרדונה", "מרלו", "קברנה", "קברנה סוביניון", "סוביניון בלאן", "ריזלינג", "גרנאש", "פינו נואר", "פינו נויר", "שיראז", "סירה", "מאלבק", "טמפרניו", "רוסאן", "ויונייה", "גמאי"];
const contextDescriptors = ["שמתאים", "לחתונה", "למסיבה", "לאירוע", "לארוחה", "עם", "ליד", "טוב עם", "מתאים עם", "יבש", "חצי יבש", "קליל", "מרענן", "חגיגי", "מינרלי"];
const attributeDescriptors = ["כשר", "טבעוני", "אורגני", "יין טבעי", "ללא אלכוהול", "נטול אלכוהול", "0%"];
const tasteDescriptors = ["אדל פלאוור", "אבטיח", "פסיפלורה", "ליצ׳י", "דובדבן", "פירותי", "תפוח", "אגס", "שזיף", "ענבים", "לימון", "תות", "אשכולית", "אננס", "מנגו", "קוקוס", "בננה", "קפה", "קקאו", "דבש", "וניל", "שוקולד"];
const spiritStyleDescriptors = ["לבן", "כהה", "בהיר", "שחור", "spiced", "מיושן", "gold", "silver", "בלנד", "סינגל מאלט"];
const spiritCategories = ["וויסקי", "ויסקי", "רום", "וודקה", "ג'ין", "גין", "ליקר", "טקילה", "ברנדי", "קוניאק"];
const geoCountries = ["ישראל", "צרפת", "איטליה", "ספרד", "פורטוגל", "גרמניה", "גרמני", "ארגנטינה", "צ׳ילה", "צילה", "אוסטרליה", "דרום אפריקה", "ארה״ב", "ארהב", "קליפורניה", "מרוקו", "יוון", "גאורגיה", "אוסטריה", "הונגריה", "יפן", "japan", "שבלי", "בורגון", "טוסקנה"];
const geoAdjectives = ["יפני", "איטלקי", "צרפתי", "ספרדי", "ישראלי", "פורטוגלי", "גרמני", "ארגנטינאי", "מרוקאי", "יווני", "גאורגי", "אוסטרלי", "הונגרי", "אוסטרי", "אמריקאי", "קליפורני", "צ׳יליאני", "ציליאני"];
const specialEditionPhrases = ["ספיישל", "אדישן", "מהדורה", "סדרה", "חדש", "חדשים", "מבצע"];
const brandPhrases = ["יין רמונים", "יין קטן"];
const dealRegex = /\d+\s?ב[-\s]?\s?\d+/;
const currencyRegex = /\d+\s?(?:שח|₪)/i;
const rangeRegex = /(?:עד|מעל|מתחת|פחות|יותר|בין|ב-|מ-)\s*(?:מ|ל)?[-\s]?\s*\d+/i;
const skuPattern = /\d+\s*(?:קברנה|שרדונה|מרלו|סוביניון|מדבר|רום|וויסקי|ויסקי)/;
const glenCanonical = "גלן פידיך";

// Common brand names with their frequent typos - typos indicate complex semantic search needed
const knownBrandsWithTypos = [
  // Whisky brands
  { correct: "מקאלן", typos: ["מק קלאן", "מקלאן", "מקאללן", "מאקלן", "macllan", "maclan", "מקלן", "מק קלן"] },
  { correct: "גלנפידיך", typos: ["גלן פיביך", "גלןפדיך", "גלן פידח", "גלנפידיך", "גלאן פידיך", "גלן פידיק", "גלן פידיץ"] },
  { correct: "ג'וני ווקר", typos: ["ג'וני וו קר", "ג'וני וואקר", "ג'וני וו אקר", "ג'אני ווקר", "ג'וני ווקר", "ג'וני וו קר"] },
  { correct: "לפרויג", typos: ["לה פרויג", "לפרואיג", "לאפרויג", "laphraoig", "laphroaig", "לפרויג", "לפרו איג"] },
  { correct: "טליסקר", typos: ["טאליסקר", "טליסקאר", "taliskar", "taliker", "טליסקאר", "טליסקא ר"] },
  { correct: "ארדבג", typos: ["ארד בג", "ארדביג", "ארדבאג", "ardbeg", "ardbg", "ארד בג", "ארדב ג"] },
  { correct: "היילנד פארק", typos: ["היי לנד פארק", "הייל נד", "highland park", "hyland", "היי לנד", "היי לנד פארק"] },
  { correct: "באלוויני", typos: ["באלביני", "בלוויני", "balvenie", "balvanie", "באלו ויני", "בלו ויני"] },
  { correct: "בלנטיינס", typos: ["בלנטיינס", "בלנטייס", "בלנט ינס", "ballantines", "בלנט ינס"] },
  { correct: "צ'יווס רגל", typos: ["צ'יווס רגל", "צ'יווס רג ל", "chivas regal", "צ'יווס רגל", "צ'יווס רג ל"] },

  // Wine brands
  { correct: "יקב רמת הגולן", typos: ["רמת גולן", "רמת ה גולן", "ramot hagolan", "רמת גולן", "רמת ה גולן"] },
  { correct: "קסטל", typos: ["קאסטל", "קס טל", "castel", "kastl", "קס טל", "קאס טל"] },
  { correct: "ברקן", typos: ["ברק ן", "בר קן", "barkan", "brakan", "ברק ן", "בר קן"] },
  { correct: "רקנאטי", typos: ["רקנטי", "רק נאטי", "rek אנאטי", "recanati", "רק נאטי", "רקנ אטי"] },
  { correct: "ירדן", typos: ["ירדאן", "יר דן", "yarden", "jardn", "יר דן", "ירד אן"] },
  { correct: "גולן", typos: ["גול ן", "גו לן", "golan", "גול ן", "גו לן"] },
  { correct: "גמא", typos: ["גמ א", "ג מא", "gama", "גמ א", "ג מא"] },

  // Common typos
  { correct: "שאטו", typos: ["שטו", "שאטאו", "שאטיו", "chateau", "chato", "שטו", "שאט או"] },
  { correct: "בלאן", typos: ["בלן", "בלאנק", "blanc", "blan", "בלן", "בלאנ ק"] },
  { correct: "רוזה", typos: ["רוז ה", "רוז א", "rose", "רוז ה", "רוז א"] },
];

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
  const categories = ["יין", "וויסקי", "ויסקי", "וודקה", "בירה", "ברנדי", "קוניאק", "ליקר", "ג'ין", "גין", "טקילה", "רום"];
  return categories.some((category) =>
    geoAdjectives.some((adj) => query.includes(`${category} ${adj}`))
  );
}

function isPureEnglish(query) {
  return /^[a-z0-9\s'\"-]+$/i.test(query);
}

// Pre-build a Set of all typos for O(1) lookup instead of O(n*m) nested loops
const allTyposSet = new Set();
knownBrandsWithTypos.forEach(brand => {
  brand.typos.forEach(typo => {
    allTyposSet.add(typo.toLowerCase());
  });
});

// Check if query contains a significant typo of a known brand
// Typos indicate the user needs semantic search to find what they're looking for
function hasSignificantTypo(query) {
  const lower = query.toLowerCase().trim();

  // Fast lookup using Set - O(1) instead of nested loops
  for (const typo of allTyposSet) {
    if (lower.includes(typo)) {
      return true;
    }
  }

  return false;
}

function normalizePrice(price) {
  if (price == null) return 0;
  const value = typeof price === "number" ? price : parseFloat(price.toString().replace(/[^0-9.,]/g, "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

// Common transliterations from English to Hebrew (wine varietals, brands, etc.)
const commonTransliterations = [
  { en: "shiraz", he: ["שירז", "שיראז", "שיראס"] },
  { en: "cabernet", he: ["קברנה", "קברנט", "קברנה סוביניון", "קברנה סוביניון"] },
  { en: "sauvignon", he: ["סוביניון", "סוביניון בלאן", "סוביניון בלנק"] },
  { en: "merlot", he: ["מרלו", "מרלוט"] },
  { en: "chardonnay", he: ["שרדונה", "שרדונהי"] },
  { en: "riesling", he: ["ריזלינג", "ריזלינג"] },
  { en: "pinot", he: ["פינו", "פינוט"] },
  { en: "sangiovese", he: ["סנג'ובזה", "סנג'ובזה"] },
  { en: "tempranillo", he: ["טמפרנילו", "טמפרנילו"] },
  { en: "malbec", he: ["מלבק", "מלבק"] },
  { en: "syrah", he: ["סירה", "סיראח"] },
  { en: "zinfandel", he: ["זינפנדל", "זינפנדל"] },
  { en: "grenache", he: ["גרנאש", "גרנאצ'ה"] },
  { en: "moscato", he: ["מוסקטו", "מוסקטו"] },
  { en: "prosecco", he: ["פרוסקו", "פרוסקו"] },
  { en: "champagne", he: ["שמפניה", "שמפאניה"] },
  { en: "port", he: ["פורט", "פורטו"] },
  { en: "sherry", he: ["שרי", "שרי"] },
  { en: "talisker", he: ["טליסקר", "טליסקר"] },
  { en: "macallan", he: ["מקאלן", "מקאלן", "מק קלאן"] },
  { en: "glenfiddich", he: ["גלנפידיך", "גלנפידיץ'"] },
  { en: "glenlivet", he: ["גלנליבט", "גלנליבט"] },
  { en: "jameson", he: ["ג'יימסון", "ג'יימסון"] },
  { en: "jack daniels", he: ["ג'ק דניאלס", "ג'ק דניאלס"] },
  { en: "johnnie walker", he: ["ג'וני ווקר", "ג'וני ווקר"] },
  { en: "hennessy", he: ["הניסי", "הניסי"] },
  { en: "remy martin", he: ["רמי מרטן", "רמי מרטין"] },
  { en: "cognac", he: ["קוניאק", "קוניאק"] },
  { en: "vodka", he: ["וודקה", "וודקה"] },
  { en: "gin", he: ["ג'ין", "גין"] },
  { en: "rum", he: ["רום", "רום"] },
  { en: "tequila", he: ["טקילה", "טקילה"] },
  { en: "whiskey", he: ["וויסקי", "ויסקי"] },
  { en: "whisky", he: ["וויסקי", "ויסקי"] },
  { en: "brandy", he: ["ברנדי", "ברנדי"] },
  { en: "liqueur", he: ["ליקר", "ליקר"] },
  { en: "rose", he: ["רוזה", "רוז"] },
  { en: "blanc", he: ["בלאן", "בלן"] },
  { en: "noir", he: ["נואר", "נואר"] },
  { en: "rouge", he: ["רוז'", "רוז"] },
  { en: "brut", he: ["ברוט", "ברוט"] },
  { en: "sec", he: ["סק", "סק"] },
  { en: "demi", he: ["דמי", "דמי"] },
  { en: "chateau", he: ["שאטו", "שאטו"] },
  { en: "domaine", he: ["דומן", "דומן"] },
  { en: "estate", he: ["אסטייט", "אסטייט"] },
  { en: "reserve", he: ["רזרב", "רזרב"] },
  { en: "grand", he: ["גרנד", "גרנד"] },
  { en: "premier", he: ["פרמייר", "פרמייר"] },
  { en: "cru", he: ["קרו", "קרו"] },
  { en: "vintage", he: ["וינטג'", "וינטג"] },
  { en: "cuvée", he: ["קובי", "קובי"] },
  { en: "barrel", he: ["ברל", "ברל"] },
  { en: "oak", he: ["אוק", "אוק"] },
  { en: "bordeaux", he: ["בורדו", "בורדו"] },
  { en: "burgundy", he: ["בורגונדי", "בורגונדי"] },
  { en: "champagne", he: ["שמפניה", "שמפאניה"] },
  { en: "tuscany", he: ["טוסקנה", "טוסקנה"] },
  { en: "piedmont", he: ["פיימונטה", "פיימונטה"] },
  { en: "rioja", he: ["ריווחה", "ריווחה"] },
  { en: "napa", he: ["נאפה", "נאפה"] },
  { en: "sonoma", he: ["סונומה", "סונומה"] },
  { en: "mendoza", he: ["מנדוזה", "מנדוזה"] },
  { en: "barossa", he: ["ברוסה", "ברוסה"] },
  { en: "marlborough", he: ["מרלבורו", "מרלבורו"] },
  { en: "castel", he: ["קסטל", "קסטל לה וי"] },
  // Note: "mud house" and "new zealand" are handled as complex queries, not transliterations
];

// Check if two words/texts are transliterations of each other (English <-> Hebrew)
function isTransliteration(text1, text2) {
  const t1 = text1.toLowerCase().trim();
  const t2 = text2.toLowerCase().trim();

  if (!t1 || !t2) return false;

  // Check if one contains English and the other contains Hebrew
  const t1HasEnglish = /[a-z]/.test(t1);
  const t2HasHebrew = /[\u0590-\u05FF]/.test(t2);
  const t2HasEnglish = /[a-z]/.test(t2);
  const t1HasHebrew = /[\u0590-\u05FF]/.test(t1);

  // Need one to have English and the other to have Hebrew
  if (!((t1HasEnglish && t2HasHebrew) || (t2HasEnglish && t1HasHebrew))) {
    return false;
  }

  // Check against known transliterations
  for (const trans of commonTransliterations) {
    const enLower = trans.en.toLowerCase();

    // Check if English word appears in text1 and Hebrew appears in text2
    if (t1HasEnglish && t2HasHebrew) {
      // Check if English word is in text1 (as whole word or substring)
      // First try exact match, then substring, then word boundary
      const enInT1 = t1 === enLower ||
        t1.includes(enLower) ||
        new RegExp(`\\b${enLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t1);

      if (enInT1) {
        // Check if any Hebrew variant appears in text2
        if (trans.he.some(he => {
          const heLower = he.toLowerCase();
          // Check exact match first, then substring
          return t2 === heLower || t2.includes(heLower);
        })) {
          return true;
        }
      }
    }

    // Check if English word appears in text2 and Hebrew appears in text1
    if (t2HasEnglish && t1HasHebrew) {
      const enInT2 = t2 === enLower ||
        t2.includes(enLower) ||
        new RegExp(`\\b${enLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t2);

      if (enInT2) {
        if (trans.he.some(he => {
          const heLower = he.toLowerCase();
          return t1 === heLower || t1.includes(heLower);
        })) {
          return true;
        }
      }
    }
  }

  return false;
}

// Helper to parse event timestamps (handles both ms and seconds)
function parseEventTime(timestamp) {
  if (!timestamp) return 0;
  // If it's a number, check if it's in seconds (typical Unix timestamp ~1.7 billion)
  // 10000000000 is year 2286 in seconds, so anything below is definitely seconds
  if (typeof timestamp === 'number') {
    return timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  }
  // If it's a string, try parsing it
  const parsed = new Date(timestamp).getTime();
  if (!isNaN(parsed)) {
    // Some strings might be stringified numbers of seconds
    if (!isNaN(Number(timestamp)) && Number(timestamp) < 10000000000) {
      return Number(timestamp) * 1000;
    }
    return parsed;
  }
  return 0;
}

function isComplex(query) {
  const normalized = trimAndNormalize(query);
  if (!normalized) return false;
  const lower = normalized.toLowerCase();

  // Simple overrides
  if (simpleCategoryWords.includes(lower)) return false;
  if (varietalWords.includes(lower)) return false;
  if (skuPattern.test(lower)) return false;
  if (isPureEnglish(lower) && !lower.includes(" ")) return false;

  // 🎯 Priority 1: Check for typos - if someone typo'd a brand name, they NEED semantic search!
  // This is a strong indicator of complex query because regular search won't find it
  if (hasSignificantTypo(lower)) return true;

  // Complex indicators
  if (containsAny(lower, contextDescriptors)) return true;
  if (currencyRegex.test(lower)) return true;
  if (rangeRegex.test(lower)) return true;
  if (dealRegex.test(lower)) return true;

  // Check for price-related words with numbers (e.g., "בפחות מ 50", "במחיר של 100")
  if (/(?:מחיר|במחיר|עולה|עד|מעל|מתחת|פחות|יותר|בתקציב|תקציב|ב-|זול|יקר)\s*(?:של|מ)?[-\s]?\s*\d+/i.test(lower)) return true;
  if (containsAny(lower, attributeDescriptors)) return true;
  if (containsAny(lower, geoCountries)) return true;

  // Special location/brand searches that should be treated as complex queries
  // These are location-based or brand-based searches that require semantic understanding
  const mudHouseVariants = ["mud house", "mudhouse", "mud-house"];
  const newZealandVariants = ["new zealand", "newzealand", "new-zealand", "ניו זילנד", "ניוזילנד", "ניו-זילנד"];
  if (mudHouseVariants.some(variant => lower.includes(variant))) return true;
  if (newZealandVariants.some(variant => lower.includes(variant))) return true;
  if (hasCategoryGeoPhrase(lower)) return true;
  if (containsAny(lower, tasteDescriptors)) return true;
  if (containsAny(lower, brandPhrases.map((phrase) => phrase.toLowerCase()))) return true;

  const glenVariants = ["גלן פיביך", "גלןפדיך", "גלן פידח", "גלנפידיך", "גלאן פידיך", "גלן פידיק", "גלן פידיץ", "glenfiddich"];
  if (containsAny(lower, ["גלן", "glen"])) {
    if (containsAny(lower, glenVariants)) return true;
    if (levenshtein(lower.replace(/\s+/g, ""), glenCanonical.replace(/\s+/g, "").toLowerCase()) <= 2) return true;
  }

  if (containsAny(lower, specialEditionPhrases.map((p) => p.toLowerCase()))) return true;

  const hasSpiritStyle = spiritStyleDescriptors.some((descriptor) => lower.includes(descriptor.toLowerCase()));
  const hasSpiritCategory = spiritCategories.some((category) => lower.includes(category.toLowerCase()));
  if (hasSpiritStyle && hasSpiritCategory) return true;

  if (/[a-z]/i.test(lower)) return true;

  return false;
}

// Check if a purchase is an upsell - product was shown in results but not directly searched for
function isUpsell(query, productName, deliveredProducts) {
  if (!query || !productName || !deliveredProducts || deliveredProducts.length === 0) {
    return false;
  }

  const normalizedQuery = trimAndNormalize(query).toLowerCase();
  const normalizedProduct = trimAndNormalize(productName).toLowerCase();

  // Check if product was in delivered results
  const productInResults = deliveredProducts.some(p =>
    trimAndNormalize(p).toLowerCase() === normalizedProduct
  );

  if (!productInResults) {
    return false; // Product wasn't even shown, so not an upsell
  }

  // FIRST: Check for transliteration/translation match (e.g., "talisker" vs "טליסקר", "shiraz" vs "שירז")
  // This must be checked BEFORE direct match to catch English->Hebrew translations
  if (isTransliteration(normalizedQuery, normalizedProduct)) {
    // Special case: "mud house" and "new zealand" should be treated as complex queries, not upsells
    // These are location-based searches that should go to complex queries
    const mudHouseVariants = ["mud house", "mudhouse", "mud-house"];
    const newZealandVariants = ["new zealand", "newzealand", "new-zealand", "ניו זילנד", "ניוזילנד", "ניו-זילנד"];
    const queryLower = normalizedQuery.toLowerCase();
    const productLower = normalizedProduct.toLowerCase();

    // Check if query contains mud house or new zealand variants
    const hasMudHouse = mudHouseVariants.some(variant => queryLower.includes(variant));
    const hasNewZealand = newZealandVariants.some(variant => queryLower.includes(variant));

    // If query has these terms, it's a complex query, not an upsell
    if (hasMudHouse || hasNewZealand) {
      return false; // It's a complex query (location-based), not an upsell
    }

    return false; // It's a transliteration, not an upsell
  }

  // Extract meaningful words from query (ignore common words)
  const queryWords = normalizedQuery.split(/\s+/).filter(word =>
    word.length > 2 && !['עם', 'של', 'עד', 'מעל', 'מתחת', 'עבור', 'ליום', 'with', 'for', 'and', 'the'].includes(word)
  );

  // Extract meaningful words from product
  const productWords = normalizedProduct.split(/\s+/).filter(word => word.length > 2);

  // Check word-by-word for transliterations
  for (const qWord of queryWords) {
    for (const pWord of productWords) {
      // Check if individual words are transliterations
      if (isTransliteration(qWord, pWord)) {
        return false; // It's a transliteration, not an upsell
      }
    }
  }

  // Check for direct match (all query words in product)
  const directMatch = queryWords.length > 0 && queryWords.every(word =>
    normalizedProduct.includes(word)
  );

  if (directMatch) {
    return false; // Direct match - not an upsell
  }

  // Compare using Levenshtein distance for similar-sounding words (same script)
  for (const qWord of queryWords) {
    for (const pWord of productWords) {
      // Only use Levenshtein if both words are in the same script
      const qIsEnglish = /^[a-z0-9\s'\"-]+$/i.test(qWord);
      const pIsEnglish = /^[a-z0-9\s'\"-]+$/i.test(pWord);
      const qIsHebrew = /[\u0590-\u05FF]/.test(qWord);
      const pIsHebrew = /[\u0590-\u05FF]/.test(pWord);

      // If both are same script, use Levenshtein
      if ((qIsEnglish && pIsEnglish) || (qIsHebrew && pIsHebrew)) {
        const maxDistance = qWord.length <= 5 ? 2 : 3;
        if (levenshtein(qWord, pWord) <= maxDistance) {
          return false; // It's a translation/transliteration, not an upsell
        }

        // Check if one contains the other (handles partial transliterations)
        if (qWord.length >= 4 && pWord.length >= 4) {
          if (qWord.includes(pWord) || pWord.includes(qWord)) {
            return false; // Likely same product, different language
          }
        }
      }
    }
  }

  // It's an upsell if: product was shown but doesn't match the query (not even transliteration)
  return true;
}

// Determine the indicator type for a query/purchase
function getIndicatorType(query, productName, deliveredProducts, hasPurchaseOrCart) {
  // Only check for special indicators if there was actually a purchase or cart addition
  if (!hasPurchaseOrCart) {
    return { type: 'regular', isSpecial: false };
  }

  // Priority 1: Check if it's a complex query (based on the query itself, not the product)
  if (isComplex(query)) {
    return { type: 'complex', isSpecial: true };
  }

  // Priority 2: Check if it's a transliteration/translation (English <-> Hebrew)
  // Transliterations should be marked as complex queries, not upsells
  if (productName && isTransliteration(query, productName)) {
    return { type: 'complex', isSpecial: true };
  }

  // Priority 3: Check if it's an upsell (needs product name, and it's NOT a transliteration)
  if (productName && isUpsell(query, productName, deliveredProducts)) {
    return { type: 'upsell', isSpecial: true };
  }

  // Regular purchase
  return { type: 'regular', isSpecial: false };
}

function formatCurrency(value) {
  return `₪${(value || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}


function SubscriptionPanel({ session, onboarding }) {
  const {
    userDetails,
    tier: currentTier,
    subscriptionStatus,
    paddleSubscriptionId,
    nextBillDate,
    loading: userLoading,
    refreshUserDetails
  } = useUserDetails();
  const router = useRouter(); // useRouter is already imported at the top of the file

  const [loading, setLoading] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  // Effect to refresh user details on successful new subscription
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new_subscription') === 'true' || params.get('success') === 'true') { // Check for both possible params
      console.log('[SubscriptionPanel] Detected successful subscription/update, refreshing user details.');
      refreshUserDetails();
      // Clean the URL to remove the query parameters, preventing re-trigger on refresh
      const currentPath = window.location.pathname;
      router.replace(currentPath, undefined, { shallow: true });
      // Display a success message if not already handled by Paddle checkout page message prop
      if (!message) { // Avoid overwriting other messages
        setMessage('המנוי עודכן בהצלחה!');
      }
    }
  }, [refreshUserDetails, router, message]); // Add message to dependency array to avoid stale closure issue if setMessage is called inside

  const isActiveSubscription = currentTier !== 'free' &&
    ['active', 'trialing'].includes(subscriptionStatus);
  const isPendingCancellation = subscriptionStatus === 'canceled';
  const currentTierConfig = SUBSCRIPTION_TIERS[currentTier];

  // Handle subscription upgrade/change
  const handleUpgrade = async (tier) => {
    if (!session) {
      setMessage('אנא התחבר כדי להירשם');
      return;
    }

    setUpgradeLoading(tier);
    setMessage('');

    try {
      // 1. Load Paddle.js if needed
      if (!window.Paddle) {
        const script = document.createElement('script');
        script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
        script.async = true;
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      // 2. Tell Paddle we're in sandbox mode (only if using test_ token)
      window.Paddle.Environment.set('sandbox');

      // 3. Initialize with your client-side token only
      window.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_PUBLIC_KEY  // e.g. 'test_…'
      });

      // 4. Open overlay—use the correct `items` + `subscription_plan`
      window.Paddle.Checkout.open({
        items: [{
          price_id: SUBSCRIPTION_TIERS[tier].priceId, // Use the price ID from your config
          quantity: 1
        }],
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/cancele`,
        customer: {
          email: session.user.email
        },
        custom_data: {
          userEmail: session.user.email,
          userId: session.user.id,
          userName: session.user.name
        },
        business: {
          name: session.user.name || undefined
        }
      });

    } catch (err) {
      console.error('Subscription error:', err);
      setMessage(`נכשל להתחיל תהליך התשלום: ${err.message}`);
    } finally {
      setUpgradeLoading(null);
    }
  };

  // Handle subscription cancellation
  const handleCancelConfirm = async (immediate, feedback) => {
    setLoading('cancel');
    setCancelError(null);

    try {
      const response = await fetch('/api/cancel-paddle-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: paddleSubscriptionId,
          immediate: immediate,
          feedback: feedback
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'נכשל לבטל את המנוי');
      }

      setCancelModalOpen(false);
      setMessage(immediate
        ? 'המנוי בוטל מיידית'
        : 'המנוי יבוטל בסוף תקופת החיוב'
      );

      // Refresh user details to get updated status
      setTimeout(refreshUserDetails, 1000);

    } catch (error) {
      console.error('Cancellation error:', error);
      setCancelError(error.message);
    } finally {
      setLoading(null);
    }
  };

  // Handle subscription reactivation
  const handleReactivate = async () => {
    setLoading('reactivate');
    try {
      const response = await fetch('/api/reactivate-paddle-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: paddleSubscriptionId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'נכשל להפעיל מחדש את המנוי');
      }

      setMessage('המנוי הופעל מחדש בהצלחה');
      setTimeout(refreshUserDetails, 1000);

    } catch (error) {
      console.error('Reactivation error:', error);
      setMessage('נכשל להפעיל מחדש את המנוי. אנא נסה שוב.');
    } finally {
      setLoading(null);
    }
  };

  // Format date helper
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSubscriptionStatusBadge = () => {
    let badgeText = '';
    let badgeClass = '';

    switch (subscriptionStatus) {
      case 'active':
      case 'trialing':
        badgeText = 'פעיל';
        badgeClass = 'bg-green-100 text-green-800';
        break;
      case 'paused':
        badgeText = 'מושהה';
        badgeClass = 'bg-yellow-100 text-yellow-800';
        break;
      case 'canceled':
        badgeText = 'בוטל';
        badgeClass = 'bg-red-100 text-red-800';
        break;
      case 'past_due':
        badgeText = 'פג תוקף';
        badgeClass = 'bg-orange-100 text-orange-800';
        break;
      default:
        badgeText = 'חינמי';
        badgeClass = 'bg-gray-100 text-gray-600';
        break;
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
        {badgeText}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8" dir="rtl">
      {/* Page Header */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl">
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
              <h1 className="text-3xl font-bold text-white mb-1">ניהול מנוי</h1>
              <p className="text-indigo-100">
                נהל את המנוי והעדפות החיוב שלך
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white/80 text-sm">תוכנית נוכחית</p>
                <p className="text-2xl font-bold text-white capitalize">{currentTier}</p>
              </div>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                {currentTier === 'free' ? (
                  <Shield className="w-8 h-8 text-white" />
                ) : (
                  <Crown className="w-8 h-8 text-yellow-300" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-xl ${message.includes('נכשל') || message.includes('error')
          ? 'bg-red-50 text-red-800 border border-red-200'
          : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
          <div className="flex items-center justify-between">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="text-sm underline opacity-75 hover:opacity-100"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Current Subscription Status */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">מנוי נוכחי</h2>
              <p className="text-gray-600 mt-1">התוכנית הפעילה שלך ומידע החיוב</p>
            </div>
            {getSubscriptionStatusBadge()}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan Details */}
            <div>
              {currentTierConfig && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      {currentTier === 'free' ? (
                        <Shield className="w-8 h-8 text-white" />
                      ) : (
                        <Crown className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{currentTierConfig.name}</h3>
                      <p className="text-lg text-gray-600">
                        {currentTierConfig.price > 0 ? `₪${currentTierConfig.price}/חודש` : 'חינמי לתמיד'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">תכונות התוכנית</h4>
                    <div className="space-y-2">
                      {currentTierConfig.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Billing Information */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">מידע חיוב</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">סטטוס</span>
                    {getSubscriptionStatusBadge()}
                  </div>

                  {nextBillDate && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">חיוב הבא</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(nextBillDate)}
                      </span>
                    </div>
                  )}

                  {paddleSubscriptionId && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">מזהה מנוי</span>
                      <span className="font-mono text-sm text-gray-500">
                        {paddleSubscriptionId.slice(-8)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isPendingCancellation ? (
                  <button
                    onClick={handleReactivate}
                    disabled={loading === 'reactivate'}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading === 'reactivate' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        מעבד...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        הפעל מחדש מנוי
                      </>
                    )}
                  </button>
                ) : isActiveSubscription ? (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    בטל מנוי
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800">תוכניות זמינות</h2>
          <p className="text-gray-600 mt-1">בחר את התוכנית שמתאימה לצרכים שלך</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(SUBSCRIPTION_TIERS).map(([key, plan]) => (
              <div
                key={key}
                className={`relative rounded-xl border-2 p-6 transition-all ${plan.tier === currentTier
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-indigo-300 bg-white'
                  }`}
              >
                {plan.tier === currentTier && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    תוכנית נוכחית
                  </div>
                )}

                {plan.tier === 'pro' && plan.tier !== currentTier && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                    הפופולרי ביותר
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">₪{plan.price}</span>
                    <span className="text-gray-500">/חודש</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-center">
                  {plan.tier === currentTier && !isPendingCancellation ? (
                    <div className="bg-green-100 text-green-700 py-2 px-4 rounded-lg font-medium text-sm">
                      התוכנית הנוכחית שלך
                    </div>
                  ) : plan.tier === 'free' ? (
                    <div className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium text-sm">
                      חינמי לתמיד
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.tier)}
                      disabled={upgradeLoading === plan.tier}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ${plan.tier === 'pro'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        } ${upgradeLoading === plan.tier ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                      {upgradeLoading === plan.tier ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          מעבד...
                        </span>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 mr-2 inline" />
                          {currentTier === 'free' ? 'התחל עכשיו' : 'שדרג'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800">היסטוריית חיוב</h2>
          <p className="text-gray-600 mt-1">עסקאות המנוי האחרונות שלך</p>
        </div>

        <div className="p-6">
          {isActiveSubscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">תוכנית {currentTierConfig?.name}</p>
                  <p className="text-sm text-gray-500">
                    {nextBillDate && `חיוב הבא: ${formatDate(nextBillDate)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">₪{currentTierConfig?.price}</p>
                  <p className="text-sm text-green-600">פעיל</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>היסטוריית חיוב מלאה תהיה זמינה בקרוב</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>אין היסטוריית חיוב זמינה</p>
              <p className="text-sm mt-1">שדרג לתוכנית בתשלום כדי לראות היסטוריית חיוב</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
        currentTier={currentTier}
        loading={loading === 'cancel'}
        error={cancelError}
      />
    </div>
  );
}



// Panel components now receive both session and onboarding
function SettingsPanel({ session, onboarding, handleDownload: externalDownload }) {

  // Debug what we receive in props
  console.log("🔍 SETTINGS PANEL PROPS:");
  console.log("onboarding:", onboarding);
  console.log("onboarding?.credentials:", onboarding?.credentials);

  // Use the onboarding payload to populate initial state.
  const [dbName, setDbName] = useState(onboarding?.credentials?.dbName || "");
  const [categories, setCategories] = useState(
    onboarding?.credentials?.categories
      ? Array.isArray(onboarding.credentials.categories)
        ? onboarding.credentials.categories.join(", ")
        : onboarding.credentials.categories
      : ""
  );
  const [productTypes, setProductTypes] = useState(
    onboarding?.credentials?.type
      ? Array.isArray(onboarding.credentials.type)
        ? onboarding.credentials.type.join(", ")
        : onboarding.credentials.type
      : ""
  );
  const [aiExplanationMode, setAiExplanationMode] = useState(
    onboarding?.explain ?? false
  );
  const [context, setContext] = useState(onboarding?.context || "");
  const [platform] = useState(onboarding?.platform || "shopify");
  const [softCategories, setSoftCategories] = useState(
    onboarding?.credentials?.softCategories
      ? Array.isArray(onboarding.credentials.softCategories)
        ? onboarding.credentials.softCategories.join(", ")
        : onboarding.credentials.softCategories
      : ""
  );
  const [productColors, setProductColors] = useState(
    onboarding?.credentials?.colors
      ? Array.isArray(onboarding.credentials.colors)
        ? onboarding.credentials.colors.join(", ")
        : onboarding.credentials.colors
      : ""
  );
  const [cred, setCred] = useState(
    platform === "shopify"
      ? {
        shopifyDomain: onboarding?.credentials?.shopifyDomain || "",
        shopifyToken: onboarding?.credentials?.shopifyToken || "",
        wooUrl: "",
        wooKey: "",
        wooSecret: ""
      }
      : {
        shopifyDomain: "",
        shopifyToken: "",
        wooUrl: onboarding?.credentials?.wooUrl || "",
        wooKey: onboarding?.credentials?.wooKey || "",
        wooSecret: onboarding?.credentials?.wooSecret || ""
      }
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [targetCategory, setTargetCategory] = useState(""); // For category-specific reprocessing
  const [missingSoftCategoryOnly, setMissingSoftCategoryOnly] = useState(false); // For products missing softCategory field

  // Advanced reprocessing options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [reprocessHardCategories, setReprocessHardCategories] = useState(true);
  const [reprocessSoftCategories, setReprocessSoftCategories] = useState(true);
  const [reprocessTypes, setReprocessTypes] = useState(true);
  const [reprocessVariants, setReprocessVariants] = useState(true);
  const [reprocessEmbeddings, setReprocessEmbeddings] = useState(false);
  const [reprocessDescriptions, setReprocessDescriptions] = useState(false);
  const [reprocessAll, setReprocessAll] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const canDownload = true;

  const syncState = useSyncStatus(dbName, resyncing || reprocessing);

  // new analyzer state for CSS selector analysis
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const [selectorResult, setSelectorResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");



  // Resync handler – triggers full sync via external API (fetches all products from store and processes from scratch)
  async function handleResync() {
    setResyncing(true);
    setMsg("");

    try {
      // Get API key from onboarding credentials
      const apiKey = onboarding?.apiKey;

      if (!apiKey) {
        throw new Error("API key not found. Please regenerate your API key in the API Key panel.");
      }

      // Fetch latest user credentials from database using session
      const onboardingRes = await fetch("/api/get-onboarding");
      if (!onboardingRes.ok) {
        throw new Error("Failed to fetch user credentials");
      }
      const { onboarding: userData } = await onboardingRes.json();

      if (!userData) {
        throw new Error("User not found. Please complete onboarding first.");
      }

      // Get credentials from database
      const userCredentials = userData.credentials || {};
      const userPlatform = userData.platform || platform;
      const userDbName = userData.dbName || dbName;

      if (!userDbName) {
        throw new Error("Store name is required. Please save your settings first.");
      }

      // Prepare the data arrays from database (or fallback to state if not in DB)
      const categoriesArray = Array.isArray(userCredentials.categories)
        ? userCredentials.categories
        : (userCredentials.categories ? [userCredentials.categories] : categories.split(",").map(s => s.trim()).filter(Boolean));
      const typesArray = Array.isArray(userCredentials.type)
        ? userCredentials.type
        : (userCredentials.type ? [userCredentials.type] : productTypes.split(",").map(s => s.trim()).filter(Boolean));
      const softCategoriesArray = Array.isArray(userCredentials.softCategories)
        ? userCredentials.softCategories
        : (userCredentials.softCategories ? [userCredentials.softCategories] : softCategories.split(",").map(s => s.trim()).filter(Boolean));
      const colorsArray = Array.isArray(userCredentials.colors)
        ? userCredentials.colors
        : (userCredentials.colors ? [userCredentials.colors] : productColors.split(",").map(s => s.trim()).filter(Boolean));

      // Format Shopify domain if platform is shopify
      let shopifyDomain = userCredentials.shopifyDomain || cred.shopifyDomain;
      if (userPlatform === "shopify" && shopifyDomain) {
        shopifyDomain = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!shopifyDomain.includes('.myshopify.com')) {
          shopifyDomain = `${shopifyDomain}.myshopify.com`;
        }
      }

      // Prepare platform-specific credentials from database
      const platformCredentials = userPlatform === "shopify"
        ? {
          shopifyDomain: shopifyDomain || userCredentials.shopifyDomain,
          shopifyToken: userCredentials.shopifyToken || cred.shopifyToken,
        }
        : {
          wooUrl: userCredentials.wooUrl || cred.wooUrl,
          wooKey: userCredentials.wooKey || cred.wooKey,
          wooSecret: userCredentials.wooSecret || cred.wooSecret,
        };

      // Validate credentials are present
      if (userPlatform === "shopify" && (!platformCredentials.shopifyDomain || !platformCredentials.shopifyToken)) {
        throw new Error("Shopify credentials are missing. Please update your settings.");
      }
      if (userPlatform === "woocommerce" && (!platformCredentials.wooUrl || !platformCredentials.wooKey || !platformCredentials.wooSecret)) {
        throw new Error("WooCommerce credentials are missing. Please update your settings.");
      }

      // Build payload for external API - full sync (onboarding)
      // The external API will use these credentials to fetch all products from store
      const payload = {
        platform: userPlatform,
        dbName: userDbName,
        categories: categoriesArray,
        type: typesArray,
        softCategories: softCategoriesArray,
        colors: colorsArray,
        syncMode: userData.syncMode || onboarding?.syncMode || "text",
        explain: userData.explain ?? aiExplanationMode,
        context: userData.context || context || "",
        ...platformCredentials
      };

      console.log('🔄 ⚡ RESYNC BUTTON: Sending to EXTERNAL endpoint https://onboarding-lh63.onrender.com/api/onboarding');
      console.log('📦 Sync payload:', { ...payload, shopifyToken: payload.shopifyToken ? '***' : undefined, wooSecret: payload.wooSecret ? '***' : undefined });

      const res = await fetch("https://onboarding-lh63.onrender.com/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to start resync");
      }

      setMsg("🔄 Resync started successfully! This will fetch and process all products from scratch. " + (data.message || ""));
      console.log('✅ Resync response:', data);
    } catch (err) {
      console.error("Resync error:", err);
      setMsg(`❌ ${err.message || "Error starting resync"}`);
    } finally {
      setResyncing(false);
      setTimeout(() => setMsg(""), 5000);
    }
  }

  useEffect(() => {
    if (syncState === 'running') {
      setMsg("🔄 Sync in progress...");
    } else if (syncState === 'done') {
      setMsg("✅ Sync complete!");
    } else if (syncState === 'error') {
      setMsg("❌ Sync failed.");
    }
  }, [syncState]);

  // Save handler – update settings using the data from state.
  async function handleSave(e) {
    e.preventDefault();

    // Validate dbName before proceeding
    if (!dbName) {
      setMsg("❌ Store name is required");
      setTimeout(() => setMsg(""), 2000);
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      // Prepare the categories array
      const categoriesArray = categories.split(",").map(s => s.trim()).filter(Boolean);
      const typesArray = productTypes.split(",").map(s => s.trim()).filter(Boolean);
      const softCategoriesArray = softCategories.split(",").map(s => s.trim()).filter(Boolean);
      const colorsArray = productColors.split(",").map(s => s.trim()).filter(Boolean);

      // Format Shopify domain if platform is shopify
      let formattedCred = { ...cred };
      if (platform === "shopify" && formattedCred.shopifyDomain) {
        let domain = formattedCred.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/₪/, '');
        if (!domain.includes('.myshopify.com')) {
          domain = `${domain}.myshopify.com`;
        }
        formattedCred.shopifyDomain = domain;
      }

      // Prepare platform-specific credentials
      const platformCredentials = platform === "shopify"
        ? {
          shopifyDomain: formattedCred.shopifyDomain,
          shopifyToken: formattedCred.shopifyToken,
        }
        : {
          wooUrl: formattedCred.wooUrl,
          wooKey: formattedCred.wooKey,
          wooSecret: formattedCred.wooSecret,
        };

      const payload = {
        platform,
        dbName,
        categories: categoriesArray,
        type: typesArray,
        softCategories: softCategoriesArray,
        colors: colorsArray,
        syncMode: onboarding?.syncMode || "text",
        explain: aiExplanationMode,
        context: context,
        ...platformCredentials
      };

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to save settings");
      }

      setMsg("✅ Saved!");
      setEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      setMsg(`❌ ${err.message || "Error saving"}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2000);
    }
  }

  const handleReprocess = async () => {
    if (!dbName) {
      setMsg("❌ Store name is required to reprocess products.");
      return;
    }
    setReprocessing(true);
    setMsg("");
    try {
      // Debug the raw state values
      console.log("🔍 RAW STATE VALUES:");
      console.log("dbName:", dbName);
      console.log("categories:", categories);
      console.log("productTypes:", productTypes);
      console.log("softCategories:", softCategories);

      // Prepare the data arrays like in handleSave
      const categoriesArray = categories.split(",").map(s => s.trim()).filter(Boolean);
      const typesArray = productTypes.split(",").map(s => s.trim()).filter(Boolean);
      const softCategoriesArray = softCategories.split(",").map(s => s.trim()).filter(Boolean);
      const colorsArray = productColors.split(",").map(s => s.trim()).filter(Boolean);

      console.log("🔍 PREPARED ARRAYS:");
      console.log("categoriesArray:", categoriesArray);
      console.log("typesArray:", typesArray);
      console.log("softCategoriesArray:", softCategoriesArray);
      console.log("colorsArray:", colorsArray);

      const payload = {
        dbName,
        categories: categoriesArray,
        type: typesArray,
        softCategories: softCategoriesArray,
        colors: colorsArray,
        targetCategory: targetCategory.trim() || null,
        missingSoftCategoryOnly: missingSoftCategoryOnly,

        // Advanced reprocessing options
        reprocessHardCategories,
        reprocessSoftCategories,
        reprocessTypes,
        reprocessVariants,
        reprocessEmbeddings,
        reprocessDescriptions,
        reprocessAll
      };

      console.log("🔍 PAYLOAD TO SEND:", payload);

      const res = await fetch('/api/reprocess-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start reprocessing.");
      setMsg("✅ Began reprocessing all products.");
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setReprocessing(false);
    }
  };

  const handleStopReprocess = async () => {
    if (!dbName) {
      setMsg("❌ Store name is required to stop reprocessing.");
      return;
    }
    setStopping(true);
    setMsg("");
    try {
      const res = await fetch('/api/reprocess-products/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop reprocessing.");
      setMsg("🛑 Stopped reprocessing.");
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setStopping(false);
    }
  };

  // function to run analysis
  const runSelectorAnalysis = async () => {
    if (!analyzeUrl) return;
    setAnalyzeError("");
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/analyze-search-bar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyzeUrl, includeSnapshot: true })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSelectorResult(json.analysis);
    } catch (err) {
      console.error(err);
      setAnalyzeError(err.message || "Failed to analyze selector");
    } finally {
      setAnalyzing(false);
    }
  };

  // New Download Plugin function added to the component:
  async function handleDownload() {
    if (!canDownload) return;
    try {
      if (platform === "shopify") {
        // For Shopify, use the direct installation URL
        const SHOPIFY_INSTALL_URL = "";
        window.location.href = SHOPIFY_INSTALL_URL;
        return;
      }

      // For WooCommerce, download the plugin as before
      const res = await fetch("/api/download-plugin", { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "semantix-plugin.zip";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      setBanner("❌ Couldn't generate the plugin or install the app.");
    }
  }



  const addSoftCategory = () => {
    if (newSoftCategory.trim() && !softCategories.split(",").map(s => s.trim()).includes(newSoftCategory.trim())) {
      const currentSoftCategories = softCategories.split(",").map(s => s.trim()).filter(Boolean);
      setSoftCategories([...currentSoftCategories, newSoftCategory.trim()].join(", "));
      setNewSoftCategory('');
    }
  };

  const removeSoftCategory = (categoryToRemove) => {
    const currentSoftCategories = softCategories.split(",").map(s => s.trim()).filter(Boolean);
    const updatedSoftCategories = currentSoftCategories.filter(cat => cat !== categoryToRemove);
    setSoftCategories(updatedSoftCategories.join(", "));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl">
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
          <div className="relative p-8">
            <h1 className="text-3xl font-bold text-white mb-1">הגדרות התוסף</h1>
            <p className="text-indigo-100">
              הגדר את הקישור והעדפות שלך למערכת
            </p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            הגדרות קישור למערכת
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            הערה: לא מומלץ לשנות הגדרות אלה אלא אם כן זה הכרחי לחלוטין.
          </p>
        </div>

        {syncState === 'running' && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Processing Logs</h3>
            <div className="h-64 bg-gray-900 text-white font-mono text-sm p-4 rounded-lg overflow-y-auto">
              <p>Logs will appear here...</p>
            </div>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="ml-3 text-gray-600">טוען הגדרות נוכחיות…</p>
            </div>
          ) : editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם בסיס הנתונים
                  </label>
                  <input
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={dbName}
                    onChange={e => setDbName(e.target.value)}
                    placeholder="myStoreDB"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    קטגוריות (מופרדות בפסיקים)
                  </label>
                  <input
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={categories}
                    onChange={e => setCategories(e.target.value)}
                    placeholder="יין אדום, יין לבן"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סוגי מוצרים (מופרדים בפסיקים)
                </label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={productTypes}
                  onChange={e => setProductTypes(e.target.value)}
                  placeholder="כשר, במבצע, חדש, אורגני"
                />
                <p className="mt-1 text-sm text-gray-500">
                  סוגי המוצרים יעזרו לקטלג ולסנן מוצרים בחיפוש
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קטגוריות רכות (מופרדות בפסיקים)
                </label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={softCategories}
                  onChange={e => setSoftCategories(e.target.value)}
                  placeholder="מתנות, אירועים מיוחדים, קיץ, חורף"
                />
                <p className="mt-1 text-sm text-gray-500">
                  קטגוריות רכות מספקות שכבת סיווג נוספת גמישה למוצרים
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  צבעים (מופרדים בפסיקים)
                </label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={productColors}
                  onChange={e => setProductColors(e.target.value)}
                  placeholder="אדום, כחול, שחור, לבן, ירוק"
                />
                <p className="mt-1 text-sm text-gray-500">
                  רשימת צבעים לסיווג מוצרים - המערכת תסווג כל מוצר לפי הצבעים המתאימים מרשימה זו
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מצב הסבר AI
                    </label>
                    <p className="text-sm text-gray-500">
                      כאשר מופעל, המערכת תספק הסברים מפורטים על תוצאות החיפוש
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiExplanationMode(!aiExplanationMode)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${aiExplanationMode ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={` relative right-4 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${aiExplanationMode ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  הקשר (מידע על החנות)
                </label>
                <textarea
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="לדוגמה: חנות יין המתמחה ביינות מאיטליה."
                  rows="3"
                ></textarea>
                <p className="mt-1 text-sm text-gray-500">
                  ספק מידע נוסף על החנות שלך כדי לשפר את תוצאות החיפוש.
                </p>
              </div>

              {platform === "shopify" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      דומיין Shopify
                    </label>
                    <input
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.shopifyDomain}
                      onChange={e => setCred({ ...cred, shopifyDomain: e.target.value })}
                      placeholder="yourshop.myshopify.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      מפתח API של אדמין
                    </label>
                    <input
                      type="password"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.shopifyToken}
                      onChange={e => setCred({ ...cred, shopifyToken: e.target.value })}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      כתובת אתר WooCommerce
                    </label>
                    <input
                      type="url"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.wooUrl}
                      onChange={e => setCred({ ...cred, wooUrl: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      מפתח צרכן
                    </label>
                    <input
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.wooKey}
                      onChange={e => setCred({ ...cred, wooKey: e.target.value })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      סוד צרכן
                    </label>
                    <input
                      type="password"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.wooSecret}
                      onChange={e => setCred({ ...cred, wooSecret: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200 flex items-center flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      שומר...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      שמור הגדרות
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  ביטול
                </button>
                {msg && (
                  <span className={`py-2 px-4 rounded-lg text-sm font-medium border ${msg.startsWith("✅") ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
                    {msg}
                  </span>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">שם בסיס הנתונים</span>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    {dbName || "לא הוגדר"}
                  </div>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">קטגוריות</span>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    {categories ? categories.split(', ').map((cat, index) => (
                      <span key={index} className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full mr-1 mb-1">
                        {cat}
                      </span>
                    )) : "לא הוגדר"}
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">סוגי מוצרים</span>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  {productTypes ? productTypes.split(', ').map((type, index) => (
                    <span key={index} className="inline-block px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full mr-1 mb-1">
                      {type}
                    </span>
                  )) : "לא הוגדר"}
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">מצב הסבר AI</span>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${aiExplanationMode ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {aiExplanationMode ? '✓ מופעל' : '✗ כבוי'}
                    </span>
                    <span className="mr-2 text-sm text-gray-600">
                      {aiExplanationMode ? 'המערכת תספק הסברים מפורטים' : 'המערכת תפעל במצב רגיל'}
                    </span>
                  </div>
                </div>
              </div>

              {platform === "shopify" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">דומיין Shopify</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.shopifyDomain || "לא הוגדר"}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">מפתח API של אדמין</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.shopifyToken ? "••••••••••••••••" : "לא הוגדר"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">כתובת אתר WooCommerce</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooUrl || "לא הוגדר"}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">מפתח צרכן</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooKey || "לא הוגדר"}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-sm font-medium text-gray-700 mb-2">סוד צרכן</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooSecret ? "••••••••••••••••" : "לא הוגדר"}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200">
                {/* Primary Actions */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button
                    onClick={() => setEditing(true)}
                    className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    ערוך הגדרות
                  </button>
                  <button
                    onClick={handleResync}
                    disabled={resyncing}
                    className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resyncing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        מסנכרן...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        סנכרן נתונים
                      </>
                    )}
                  </button>
                  {dbName && (
                    <>
                      {/* Category Selection for Reprocessing */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          עיבוד מחדש לפי קטגוריה ספציפית (אופציונלי)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={targetCategory}
                            onChange={(e) => setTargetCategory(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={reprocessing || stopping}
                          >
                            <option value="">כל הקטגוריות (עיבוד מחדש רגיל)</option>
                            {categories.split(',').map(cat => cat.trim()).filter(Boolean).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <div className="text-xs text-gray-500 sm:self-end sm:pb-2">
                            {targetCategory ? `יעבד רק מוצרים מקטגוריה: ${targetCategory}` : 'יעבד את כל המוצרים'}
                          </div>
                        </div>
                      </div>

                      {/* Missing Soft Category Option */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <label className="flex items-center space-x-3 rtl:space-x-reverse">
                          <input
                            type="checkbox"
                            checked={missingSoftCategoryOnly}
                            onChange={(e) => setMissingSoftCategoryOnly(e.target.checked)}
                            disabled={reprocessing || stopping}
                            className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">
                              עיבד רק מוצרים עם קטגוריות קשות אבל ללא שדה צבעי-רכות
                            </span>
                            <span className="text-xs text-gray-500">
                              יתמקד במוצרים שיש להם קטגוריות אבל חסר להם לגמרי שדה צבעי-רכות (לא מערך ריק)
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Advanced Reprocessing Options Toggle */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <button
                          type="button"
                          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                          className="flex items-center justify-between w-full text-right"
                        >
                          <span className="text-sm font-medium text-blue-800">
                            אפשרויות מתקדמות לעיבוד מחדש
                          </span>
                          <svg
                            className={`w-5 h-5 transition-transform ${showAdvancedOptions ? 'transform rotate-180' : ''}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                          </svg>
                        </button>

                        {showAdvancedOptions && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                <input
                                  type="checkbox"
                                  checked={reprocessAll}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setReprocessAll(checked);
                                    if (checked) {
                                      // Select all options when "All" is checked
                                      setReprocessHardCategories(true);
                                      setReprocessSoftCategories(true);
                                      setReprocessTypes(true);
                                      setReprocessVariants(true);
                                      setReprocessEmbeddings(true);
                                      setReprocessDescriptions(true);
                                    }
                                  }}
                                  disabled={reprocessing || stopping}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm font-bold text-blue-900">עיבוד מחדש של הכל (כולל מידע)</span>
                              </label>

                              <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                <input
                                  type="checkbox"
                                  checked={reprocessHardCategories}
                                  onChange={(e) => setReprocessHardCategories(e.target.checked)}
                                  disabled={reprocessing || stopping || reprocessAll}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">קטגוריות קשות</span>
                              </label>

                              <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                <input
                                  type="checkbox"
                                  checked={reprocessSoftCategories}
                                  onChange={(e) => setReprocessSoftCategories(e.target.checked)}
                                  disabled={reprocessing || stopping || reprocessAll}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">קטגוריות רכות/צבעים</span>
                              </label>

                              <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                <input
                                  type="checkbox"
                                  checked={reprocessTypes}
                                  onChange={(e) => setReprocessTypes(e.target.checked)}
                                  disabled={reprocessing || stopping || reprocessAll}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">סוגי מוצרים</span>
                              </label>
                            </div>

                            <div className="space-y-3">
                              <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                <input
                                  type="checkbox"
                                  checked={reprocessVariants}
                                  onChange={(e) => setReprocessVariants(e.target.checked)}
                                  disabled={reprocessing || stopping || reprocessAll}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">וריאציות מוצרים</span>
                              </label>

                              <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                <input
                                  type="checkbox"
                                  checked={reprocessEmbeddings}
                                  onChange={(e) => setReprocessEmbeddings(e.target.checked)}
                                  disabled={reprocessing || stopping || reprocessAll}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">אמבדינג/וקטורים</span>
                              </label>

                              <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                <input
                                  type="checkbox"
                                  checked={reprocessDescriptions}
                                  onChange={(e) => setReprocessDescriptions(e.target.checked)}
                                  disabled={reprocessing || stopping || reprocessAll}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">תיאור/תרגום</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleReprocess}
                        disabled={reprocessing || stopping}
                        className="px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {reprocessing ? 'מעבד מחדש...' : (
                          // Button text reflects what's being reprocessed
                          reprocessAll ? 'עיבוד מחדש מלא של כל המידע' :
                            missingSoftCategoryOnly ? 'עבד מחדש מוצרים ללא צבעי-רכות' :
                              targetCategory ? `עבד מחדש קטגוריה: ${targetCategory}` :
                                (!reprocessHardCategories && !reprocessSoftCategories && !reprocessTypes) ?
                                  (reprocessEmbeddings ? 'עדכן וקטורים בלבד' :
                                    reprocessDescriptions ? 'עדכן תיאורים בלבד' :
                                      reprocessVariants ? 'עדכן וריאציות בלבד' : 'עבד מחדש את כל המוצרים') :
                                  'עבד מחדש קטגוריות וסוגים'
                        )}
                      </button>
                      <button
                        onClick={handleStopReprocess}
                        disabled={stopping || reprocessing}
                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        {stopping ? 'עוצר...' : 'הפסק עיבוד מחדש'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleDownload}
                    className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {platform === "shopify" ? "התקן אפליקציית Shopify" : "הורד תוסף"}
                  </button>

                  {platform === "shopify" && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/download-theme-extension", { method: "GET" });
                          if (!res.ok) throw new Error(`HTTP ${res.status}`);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "semantix-theme-extension.zip";
                          a.click();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error("Download theme extension failed", err);
                          setMsg("❌ Couldn't download the theme extension.");
                        }
                      }}
                      className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      הורד הרחבת ערכת נושא
                    </button>
                  )}
                </div>
                {msg && (
                  <div className={`mt-4 py-3 px-4 rounded-lg text-sm font-medium border ${msg.startsWith("✅") || msg.startsWith("🔄") ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
                    {msg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Selector Analysis Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            ניתוח בוחרי CSS
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            נתח בוחרי חיפוש באתר לאופטימיזציה של הקישור
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={analyzeUrl}
                onChange={(e) => setAnalyzeUrl(e.target.value)}
                placeholder="הזן כתובת לניתוח (לדוגמה, https://example.com)"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <button
              onClick={runSelectorAnalysis}
              disabled={analyzing || !analyzeUrl}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {analyzing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מנתח...
                </span>
              ) : "נתח"}
            </button>
          </div>

          {analyzeError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {analyzeError}
              </p>
            </div>
          )}

          {selectorResult && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">תוצאות הניתוח</h3>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {JSON.stringify(selectorResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

function ApiKeyPanel({ session, onboarding }) {
  // Try to get the API key from onboarding credentials first.
  const initialKey = onboarding?.credentials?.apiKey || "";
  const [apiKey, setApiKey] = useState(initialKey);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (apiKey) return;
    // Fallback: fetch from get-onboarding if not already in state.
    (async () => {
      try {
        const res = await fetch("/api/get-onboarding");
        const json = await res.json();
        setApiKey(json.apiKey || "");
      } catch (err) {
        console.warn("Couldn't fetch apiKey:", err);
      }
    })();
  }, [apiKey]);

  const regenerate = async () => {
    setWorking(true);
    setCopied(false);
    try {
      const res = await fetch("/api/api-key", { method: "POST" });
      const { key } = await res.json();
      setApiKey(key);
    } finally {
      setWorking(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl">
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
          <div className="relative p-8">
            <h1 className="text-3xl font-bold text-white mb-1">ניהול מפתח API</h1>
            <p className="text-indigo-100">
              גישה מאובטחת לשירותי API של Semantix
            </p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            מפתח ה-API שלך
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            השתמש במפתח זה כדי לאמת את הבקשות שלך ל-API של Semantix
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 blur-md rounded-xl transform -translate-y-1 translate-x-1 group-hover:translate-y-0.5 group-hover:translate-x-0.5 transition-all"></div>
              <div className="relative bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-sm break-all shadow-sm">
                {apiKey || "•••••••••••••••••••••••••••••••"}
              </div>
            </div>
            <button
              onClick={copyKey}
              disabled={!apiKey}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {copied ? (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  הועתק!
                </span>
              ) : (
                <span className="flex items-center">
                  <Copy className="h-4 w-4 mr-2" />
                  העתק מפתח
                </span>
              )}
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={regenerate}
              disabled={working}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {working ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מעבד...
                </span>
              ) : (
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  צור מפתח API חדש
                </span>
              )}
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0V7a1 1 0 112 0v6zm-1-9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">מידע חשוב</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    שלח ערך זה בכותרת <code className="px-1 py-0.5 bg-yellow-100 rounded font-mono text-xs">X‑API‑Key</code> מתוסף WooCommerce שלך כאשר אתה קורא ל-API של Semantix.
                  </p>
                  <p className="mt-2">
                    יצירת מפתח חדש תבטל מיידית את המפתח הקודם ועלולה להפריע לחיבורים פעילים.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mt-8">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            שיטות עבודה מומלצות לאבטחה
          </h2>
        </div>

        <div className="p-6">
          <ul className="space-y-4">
            <li className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  <span className="font-medium">אחסן בצורה מאובטחת</span> - לעולם אל תחשוף את מפתח ה-API שלך בקוד צד-לקוח או במאגרים ציבוריים.
                </p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  <span className="font-medium">החלף באופן קבוע</span> - הנוהג המומלץ הוא ליצור מפתח API חדש כל 90 יום.
                </p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  <span className="font-medium">השתמש ב-HTTPS</span> - תמיד העבר מפתחות API דרך חיבורים מאובטחים ומוצפנים.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* -------- tiny helper so sidebar labels & panels stay together ---- */
const PANELS = [
  { id: "analytics", label: "אנליטיקות", component: AnalyticsPanel, icon: BarChart3 },
  { id: "products", label: "מוצרים", component: ProductsPanel, icon: Package },
  { id: "boosts", label: "ניהול בוסטים", component: CategoryBoostsPanel, icon: TrendingUp },
  { id: "settings", label: "הגדרות התוסף", component: SettingsPanel, icon: Settings },
  { id: "apikey", label: "מפתח API", component: ApiKeyPanel, icon: ListTodo },
  { id: "subscription", label: "מנוי", component: SubscriptionPanel, icon: CreditCard },
  { id: "demo", label: "דמו חיפוש", component: DemoPanel, icon: Monitor },
  { id: "admin", label: "פאנל ניהול", component: AdminPanel, icon: Shield }
];

/* =================================================================== */
/*  MAIN PAGE – handles auth & panel switching                         */
/* =================================================================== */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [active, setActive] = useState("analytics");
  const [onboarding, setOnboarding] = useState(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "אינטגרציה חדשה זמינה",
      description: "אינטגרציית Shopify עודכנה עם תכונות חדשות.",
      time: "לפני שעתיים",
      unread: true
    },
    {
      id: 2,
      title: "תחזוקת מערכת",
      description: "תחזוקה מתוכננת ב-25 במאי 2025 בשעה 2:00 לפנות בוקר UTC.",
      time: "אתמול",
      unread: false
    }
  ]);


  // Add global functions for mobile menu
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openMobileMenu = () => setMobileMenuOpen(true);
      window.closeMobileMenu = () => setMobileMenuOpen(false);
      window.toggleMobileMenu = () => setMobileMenuOpen(prev => !prev);

      // Add event listener to the document for a custom event
      document.addEventListener('toggleMobileMenu', () => {
        window.toggleMobileMenu();
      });

      document.addEventListener('openMobileMenu', () => {
        window.openMobileMenu();
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete window.toggleMobileMenu;
        delete window.openMobileMenu;
        delete window.closeMobileMenu;
        document.removeEventListener('toggleMobileMenu', window.toggleMobileMenu);
        document.removeEventListener('openMobileMenu', window.openMobileMenu);
      }
    };
  }, []);

  // Check URL parameters for panel selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const panelParam = params.get('panel');
    const tabParam = params.get('tab');

    // Handle both 'panel' and 'tab' parameters
    if (panelParam && PANELS.some(p => p.id === panelParam)) {
      setActive(panelParam);
    } else if (tabParam && PANELS.some(p => p.id === tabParam)) {
      setActive(tabParam);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session?.user?.onboardingComplete === false) {
      router.push("/onboarding");
      return;
    }
  }, [status, session, router]);

  // Fetch onboarding data
  useEffect(() => {
    let mounted = true;

    const fetchOnboarding = async () => {
      try {
        const res = await fetch("/api/get-onboarding");
        const json = await res.json();

        if (!mounted) return;

        if (json?.onboarding) {
          setOnboarding(json.onboarding);
        }
      } catch (err) {
        console.error("Error fetching onboarding:", err);
      } finally {
        if (mounted) {
          setLoadingOnboarding(false);
        }
      }
    };

    if (session?.user) {
      fetchOnboarding();
    } else {
      setLoadingOnboarding(false);
    }

    return () => {
      mounted = false;
    };
  }, [session]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
      if (window.innerWidth >= 640) {
        setMobileDropdownOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(note => ({ ...note, unread: false })));
  };

  const unreadCount = notifications.filter(note => note.unread).length;

  // Show loading state only if session is loading or onboarding is loading and session exists
  if (status === "loading" || (loadingOnboarding && session)) {
    console.log('Showing loading state');
    return <FullScreenMsg>טוען את הפעלת המשתמש...</FullScreenMsg>;
  }

  // Return null if no session
  if (!session) {
    console.log('No session, returning null');
    return null;
  }

  const Panel = PANELS.find(p => p.id === active)?.component ?? (() => null);
  const ActiveIcon = PANELS.find(p => p.id === active)?.icon || LayoutDashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating Menu Button - Alternative access to full sidebar */}
      <button
        onClick={() => {
          console.log('Mobile menu button clicked');
          setMobileMenuOpen(true);
        }}
        className="fixed bottom-6 right-6 z-[70] bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl p-3 rounded-full transition-all duration-200 hover:scale-105 lg:hidden"
        aria-label="פתח תפריט ניווט מלא"
      >
        <Menu className="h-6 w-6 text-white" />
      </button>

      {/* The MenuConnector is no longer needed as the button is self-contained */}
      {/* <MenuConnector /> */}

      {/* Global styling */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root {
          --semantix-primary-50: #f5f3ff;
          --semantix-primary-100: #ede9fe;
          --semantix-primary-200: #ddd6fe;
          --semantix-primary-300: #c4b5fd;
          --semantix-primary-400: #a78bfa;
          --semantix-primary-500: #8b5cf6;
          --semantix-primary-600: #7c3aed;
          --semantix-primary-700: #6d28d9;
          --semantix-primary-800: #5b21b6;
          --semantix-primary-900: #4c1d95;
          
          --semantix-secondary-50: #eef2ff;
          --semantix-secondary-100: #e0e7ff;
          --semantix-secondary-200: #c7d2fe;
          --semantix-secondary-300: #a5b4fc;
          --semantix-secondary-400: #818cf8;
          --semantix-secondary-500: #6366f1;
          --semantix-secondary-600: #4f46e5;
          --semantix-secondary-700: #4338ca;
          --semantix-secondary-800: #3730a3;
          --semantix-secondary-900: #312e81;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f9fafb;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c7d2fe;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a5b4fc;
        }
      `}</style>

      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-800/50 backdrop-blur-sm z-[99] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div
        className={`fixed inset-y-0 right-0 z-[100] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        style={{ direction: 'rtl' }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <img src="/main-logo.svg" alt="Semantix Logo" className="h-8 w-auto" />
          <button
            type="button"
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="סגור תפריט צד"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <nav className="space-y-1">
            {PANELS.map((item) =>
              item.external ? (
                <Link
                  key={item.id}
                  href={item.link}
                  className="flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium transition-all text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 ml-4 text-gray-400" />
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => {
                    setActive(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${active === item.id
                    ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <item.icon
                    className={`h-5 w-5 ml-4 ${active === item.id ? "text-indigo-600" : "text-gray-400"
                      }`}
                  />
                  {item.label}
                </button>
              )
            )}
          </nav>
        </div>

        {/* User profile in mobile menu */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img
                src={session.user.image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(session.user.name)}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{session.user.name}</p>
              <p className="text-xs text-gray-500">{session.user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pr-72">
        {/* Top navbar */}
        <header
          className="fixed top-0 right-0 left-0 lg:left-72 z-[50] bg-white/80 backdrop-blur-md border-b border-gray-200"
        >
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <div className="flex items-center">
              {/* Mobile navigation dropdown */}
              <div className="relative sm:hidden">
                <button
                  onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-gray-700 mr-3"
                  aria-label="בחר עמוד"
                >
                  <ActiveIcon className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-medium max-w-[120px] truncate">
                    {PANELS.find(p => p.id === active)?.label || "לוח בקרה"}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {mobileDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-[60]"
                      onClick={() => setMobileDropdownOpen(false)}
                    />

                    {/* Dropdown content */}
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-[70]" style={{ direction: 'rtl' }}>
                      <div className="py-2">
                        {PANELS.map((item) =>
                          item.external ? (
                            <Link
                              key={item.id}
                              href={item.link}
                              className="flex items-center w-full px-4 py-3 text-right hover:bg-purple-50 transition-colors text-gray-700"
                              onClick={() => setMobileDropdownOpen(false)}
                            >
                              <item.icon className="h-5 w-5 ml-3 text-gray-400" />
                              <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                          ) : (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActive(item.id);
                                setMobileDropdownOpen(false);
                              }}
                              className={`flex items-center w-full px-4 py-3 text-right hover:bg-gray-50 transition-colors ${active === item.id
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-gray-700"
                                }`}
                            >
                              <item.icon
                                className={`h-5 w-5 ml-3 ${active === item.id ? "text-indigo-600" : "text-gray-400"
                                  }`}
                              />
                              <span className="text-sm font-medium">{item.label}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Desktop title */}
              <div className="hidden sm:flex items-center ml-2">
                <ActiveIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-800">
                  {PANELS.find(p => p.id === active)?.label || "לוח בקרה"}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-16 p-4 md:p-8 max-w-7xl mx-auto">
          <Panel session={session} onboarding={onboarding} />
        </main>
      </div>
    </div>
  );
}

function useSyncStatus(dbName, enabled) {
  const [state, set] = useState("idle"); // idle | running | done | error
  useEffect(() => {
    if (!enabled || !dbName) return;
    let t;
    const poll = async () => {
      try {
        const r = await fetch(`/api/sync-status?dbName=${encodeURIComponent(dbName)}`);
        const j = await r.json();
        const nxt = j.state ?? "done";
        set(nxt);
        if (nxt === "running" || nxt === "reprocessing") t = setTimeout(poll, 3_000);
      } catch {
        t = setTimeout(poll, 8_000);
      }
    };
    poll();
    return () => clearTimeout(t);
  }, [dbName, enabled]);
  return state;
}

