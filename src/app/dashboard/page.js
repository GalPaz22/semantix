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

// ===============================
// Add this to your existing dashboard file
// ===============================

// Import the subscription-related components at the top
import { useUserDetails } from '../hooks/useUserDetails'; // Make sure this path is correct
import { SUBSCRIPTION_TIERS } from '/lib/paddle-config'; // Make sure this path is correct
import CancellationModal from '../components/CancellationModal';

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
  Star
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
function AnalyticsPanel({ session, onboarding }) {
  // Use onboarding.credentials.dbName (if available) as the database name.
  const onboardDB = onboarding?.credentials?.dbName || onboarding?.dbName || "";

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMoreQueries, setHasMoreQueries] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Add state for cart analytics
  const [cartAnalytics, setCartAnalytics] = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [cartError, setCartError] = useState("");

  // Add state for checkout events
  const [checkoutEvents, setCheckoutEvents] = useState([]);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Add state for product click events
  const [clickEvents, setClickEvents] = useState([]);
  const [loadingClicks, setLoadingClicks] = useState(false);
  const [clickError, setClickError] = useState("");

  // Add state for boosted products
  const [boostedProducts, setBoostedProducts] = useState([]);
  const [loadingBoosted, setLoadingBoosted] = useState(false);

  const [cartDetailsExpanded, setCartDetailsExpanded] = useState(false);
  const [checkoutDetailsExpanded, setCheckoutDetailsExpanded] = useState(false);
  const [clickDetailsExpanded, setClickDetailsExpanded] = useState(false);
  const [exposureDetailsExpanded, setExposureDetailsExpanded] = useState(false);

  // Semantix funnel state
  const [semantixExpanded, setSemantixExpanded] = useState(false);

  // Upsell analytics state
  const [upsellExpanded, setUpsellExpanded] = useState(false);

  // Query results dropdown state
  const [expandedQueries, setExpandedQueries] = useState({});

  const [filters, setFilters] = useState({
    category: "",
    type: "",
    minPrice: "",
    maxPrice: ""
  });
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Date filtering defaults and pagination state.
  // Initialize with Last 7 Days by default
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Time period dropdown states
  const [timePeriodOpen, setTimePeriodOpen] = useState(false);
  // Default to Last 7 Days
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("7d");

  // Time period options
  const timePeriods = [
    { value: "today", label: "היום", days: 0 },
    { value: "7d", label: "7 ימים אחרונים", days: 7 },
    { value: "30d", label: "30 ימים אחרונים", days: 30 },
    { value: "90d", label: "90 ימים אחרונים", days: 90 },
    { value: "1y", label: "שנה אחרונה", days: 365 },
    { value: "all", label: "כל הנתונים", days: null }
  ];

  // Handle time period selection
  const handleTimePeriodChange = (period) => {
    setSelectedTimePeriod(period.value);
    setTimePeriodOpen(false);

    if (period.value === "all") {
      setStartDate("");
      setEndDate("");
    } else if (period.value === "today") {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period.days !== null) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period.days);

      setStartDate(startDate.toISOString().split('T')[0]);
      setEndDate(endDate.toISOString().split('T')[0]);
    }
  };

  // Get current time period label
  const getCurrentTimePeriodLabel = () => {
    const period = timePeriods.find(p => p.value === selectedTimePeriod);
    return period ? period.label : "כל הנתונים";
  };

  // No need for initialization useEffect since dates are already set in useState

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setTimePeriodOpen(false);
      }
    };

    if (timePeriodOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [timePeriodOpen]);

  // Function to fetch queries with pagination support
  const fetchQueries = async (skip = 0, limit = 100, append = false) => {
    if (!onboardDB) return;

    try {
      const res = await fetch("https://dashboard-server-ae00.onrender.com/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbName: onboardDB,
          skip: skip,
          limit: limit
        })
      });

      // Handle 204 No Content
      if (res.status === 204) {
        if (!append) {
          setQueries([]);
          setHasMoreQueries(false);
        } else {
          setHasMoreQueries(false);
        }
        return { queries: [], hasMore: false };
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error fetching queries");

      const fetchedQueries = data.queries || [];
      const hasMore = fetchedQueries.length === limit; // If we got exactly the limit, there might be more

      if (append) {
        setQueries(prev => [...prev, ...fetchedQueries]);
      } else {
        setQueries(fetchedQueries);
      }

      setHasMoreQueries(hasMore);
      return { queries: fetchedQueries, hasMore };
    } catch (err) {
      if (!append) {
        setError(err.message);
      }
      throw err;
    }
  };

  // Load more queries
  const handleLoadMore = async () => {
    if (loadingMore || !hasMoreQueries) return;

    setLoadingMore(true);
    try {
      await fetchQueries(queries.length, 100, true);
    } catch (err) {
      console.error("Error loading more queries:", err);
      // Error is already handled in fetchQueries for initial load
    } finally {
      setLoadingMore(false);
    }
  };

  // Consolidated Data Fetching for Dashboard Analytics
  useEffect(() => {
    if (!onboardDB) return;

    const fetchAllAnalytics = async () => {
      try {
        setLoading(true);
        setLoadingCart(true);
        setLoadingCheckout(true);
        setLoadingClicks(true);
        setError("");
        setCartError("");
        setCheckoutError("");
        setClickError("");

        const payload = {
          dbName: onboardDB,
          startDate: startDate || null, // Ensure empty string becomes null if needed, though ISO string is expected
          endDate: endDate || null
        };

        // We fetch queries, performance data, and boosted products in parallel
        const [queriesRes, performanceRes, boostedRes] = await Promise.all([
          fetch("/api/analytics/queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }),
          fetch("/api/analytics/performance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }),
          fetch("/api/analytics/boosted-products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbName: onboardDB })
          })
        ]);

        const queriesData = await queriesRes.json();
        const performanceData = await performanceRes.json();
        const boostedData = await boostedRes.json();

        if (!queriesRes.ok) throw new Error(queriesData.error || "Failed to fetch queries");
        if (!performanceRes.ok) throw new Error(performanceData.error || "Failed to fetch performance data");

        // Update Queries State
        setQueries(queriesData.queries || []);
        setHasMoreQueries(false); // New API returns all matches, so no "load more" in basic sense for now

        // Update Performance State
        setCartAnalytics(performanceData.cart || []);
        setCheckoutEvents(performanceData.checkout || []);
        setBoostedProducts(boostedData.boostedProducts || []);

        // Note: The performance API currently returns cart and checkout. 
        // If clicks are needed, they should be added to that endpoint or handled here.
        // Assuming performance endpoint includes clicks if requested? 
        // Checking my previous implementation of `/api/analytics/performance`:
        // It returns { cart, checkout }. It does NOT return clicks yet.
        // I should probably add clicks to it, or keep the separate fetch for clicks if they are different.
        // The original code fetched 'clicks' via `/api/cart-analytics` with type='clicks'.
        // My new `performance` route uses `cart` and `checkout_events` collections.
        // I will stick to what the new route provides for now and maybe add clicks separately if needed, 
        // but robustly filtered. For now, let's keep robust fetching for cart/checkout/queries.

      } catch (err) {
        console.error("Dashboard Analytics Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        setLoadingCart(false);
        setLoadingCheckout(false);
        setLoadingClicks(false);
      }
    };

    fetchAllAnalytics();
  }, [onboardDB, startDate, endDate]); // Re-fetch when dates change

  // Legacy fetch functions removed in favor of `fetchAllAnalytics`




  // Fetch product click events data
  useEffect(() => {
    if (!onboardDB) return;
    (async () => {
      setLoadingClicks(true);
      setClickError("");
      try {
        const res = await fetch("/api/cart-analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbName: onboardDB, type: "clicks" })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error fetching click events");
        setClickEvents(data.clickEvents || []);
      } catch (err) {
        setClickError(err.message);
      } finally {
        setLoadingClicks(false);
      }
    })();
  }, [onboardDB]);

  // Compute category options.
  useEffect(() => {
    const allCategories = [];
    queries.forEach(q => {
      if (typeof q.category === "string" && q.category.trim()) {
        allCategories.push(q.category.trim().toLowerCase());
      } else if (Array.isArray(q.category)) {
        q.category.forEach(cat => {
          if (typeof cat === "string" && cat.trim()) {
            allCategories.push(cat.trim().toLowerCase());
          }
        });
      }
    });
    const uniqueCategories = Array.from(new Set(allCategories));
    const displayCategories = uniqueCategories.map(
      cat => cat.charAt(0).toUpperCase() + cat.slice(1)
    );
    setCategoryOptions(displayCategories);
  }, [queries]);

  const filteredQueries = queries.filter(q => {
    let match = true;
    if (filters.category) {
      const selected = filters.category.toLowerCase();
      if (typeof q.category === "string") {
        if (q.category.trim().toLowerCase() !== selected) match = false;
      } else if (Array.isArray(q.category)) {
        const hasMatch = q.category.some(cat => typeof cat === "string" && cat.trim().toLowerCase() === selected);
        if (!hasMatch) match = false;
      } else {
        match = false;
      }
    }
    if (filters.type && q.type !== filters.type) match = false;
    if (filters.minPrice && q.price < parseFloat(filters.minPrice)) match = false;
    if (filters.maxPrice && q.price > parseFloat(filters.maxPrice)) match = false;
    if (startDate || endDate) {
      const queryDate = new Date(q.timestamp);
      if (startDate) if (queryDate < new Date(startDate)) match = false;
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        if (queryDate > end) match = false;
      }
    }
    return match;
  });

  const totalLoaded = queries.length;
  const filteredCount = filteredQueries.length;
  const totalPages = Math.ceil(filteredCount / itemsPerPage);

  // Sort all filtered queries by timestamp (newest first), then paginate
  const displayedQueries = filteredQueries
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  if (totalPages > maxPageButtons) {
    if (currentPage <= 3) {
      startPage = 1;
      endPage = maxPageButtons;
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - maxPageButtons + 1;
      endPage = totalPages;
    }
  } else {
    startPage = 1;
    endPage = totalPages;
  }
  const paginationNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    paginationNumbers.push(i);
  }
  const handlePrevious = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePageClick = num => setCurrentPage(num);

  // Calculate business insights and SEO keywords - ALWAYS from last 30 days
  const businessInsights = useMemo(() => {
    if (!queries.length) return {
      topKeywords: [],
      trends: [],
      seoSuggestions: [],
      totalSearches: 0,
      averageDaily: 0
    };

    // Filter queries to last 30 days only
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30DaysQueries = queries.filter(q => {
      const queryDate = new Date(q.timestamp);
      return queryDate >= thirtyDaysAgo;
    });

    if (!last30DaysQueries.length) return {
      topKeywords: [],
      trends: [],
      seoSuggestions: [],
      totalSearches: 0,
      averageDaily: 0
    };

    // Filter cart analytics to last 30 days
    const last30DaysCart = cartAnalytics.filter(item => {
      const itemDate = new Date(parseEventTime(item.timestamp || item.created_at));
      return itemDate >= thirtyDaysAgo;
    });

    // Analyze top search keywords
    const queryFrequency = {};
    last30DaysQueries.forEach(q => {
      const query = (q.query || "").toLowerCase().trim();
      if (query) {
        queryFrequency[query] = (queryFrequency[query] || 0) + 1;
      }
    });

    const topKeywords = Object.entries(queryFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    // Calculate metrics
    const totalSearches = last30DaysQueries.length;
    const averageDaily = (totalSearches / 30).toFixed(1);

    // Analyze search trends
    const trends = [];

    if (topKeywords.length > 0) {
      const topQuery = topKeywords[0];
      const topPercentage = ((topQuery.count / totalSearches) * 100).toFixed(1);
      trends.push({
        icon: '🔥',
        text: `החיפוש הפופולרי ביותר: "${topQuery.keyword}"`,
        detail: `${topQuery.count} חיפושים (${topPercentage}% מהחיפושים)`
      });
    }

    // Analyze conversion correlation
    if (last30DaysCart.length > 0) {
      const convertingQueries = new Set(
        last30DaysCart.map(item => (item.search_query || "").toLowerCase().trim()).filter(q => q)
      );
      const uniqueConvertingSearches = convertingQueries.size;
      const totalUniqueSearches = Object.keys(queryFrequency).length;
      const conversionRate = (uniqueConvertingSearches / totalUniqueSearches) * 100;

      if (conversionRate > 15) {
        trends.push({
          icon: '✅',
          text: 'ביצועי המרה מצוינים',
          detail: `${conversionRate.toFixed(1)}% מהחיפושים מובילים לעגלה`
        });
      } else if (conversionRate < 5) {
        trends.push({
          icon: '💡',
          text: 'הזדמנות לשיפור המרות',
          detail: `רק ${conversionRate.toFixed(1)}% מהחיפושים מובילים לעגלה`
        });
      } else {
        trends.push({
          icon: '📊',
          text: 'שיעור המרה סביר',
          detail: `${conversionRate.toFixed(1)}% מהחיפושים מובילים לעגלה`
        });
      }
    }

    // Analyze price range searches
    const priceSearches = last30DaysQueries.filter(q => q.minPrice || q.maxPrice);
    if (priceSearches.length > totalSearches * 0.2) {
      const pricePercentage = Math.round((priceSearches.length / totalSearches) * 100);
      trends.push({
        icon: '💰',
        text: 'לקוחות רגישים למחיר',
        detail: `${pricePercentage}% מהחיפושים כוללים סינון מחיר`
      });
    }

    // Analyze search activity
    if (averageDaily > 50) {
      trends.push({
        icon: '📈',
        text: 'פעילות חיפוש גבוהה',
        detail: `ממוצע של ${averageDaily} חיפושים ליום`
      });
    }

    // SEO suggestions based on top keywords
    const seoSuggestions = topKeywords.slice(0, 5).map(({ keyword }) => {
      return `${keyword}`;
    });

    return {
      topKeywords,
      trends,
      seoSuggestions,
      totalSearches,
      averageDaily
    };
  }, [queries, cartAnalytics]);

  // Calculate cart conversion metrics - ALWAYS uses ALL data (no date filtering)
  const cartMetrics = useMemo(() => {
    if (!queries.length) {
      return {
        conversionRate: 0,
        totalCartItems: 0,
        topQueries: [],
        totalRevenue: 0,
        totalConversions: 0,
        uniqueProducts: 0
      };
    }

    // Use ALL cart analytics and ALL queries (no date filtering)
    const totalCartItems = cartAnalytics.length;
    const totalQueries = queries.length;
    const conversionRate = totalQueries > 0
      ? ((totalCartItems / totalQueries) * 100).toFixed(2)
      : 0;

    // Simple separation: cart analytics for cart, checkout events for checkout
    const finalAddToCartItems = cartAnalytics; // Use all cart analytics for cart
    const finalCheckoutItems = checkoutEvents; // Use checkout events for checkout

    // Group by search query for add to cart
    const addToCartGroups = {};
    finalAddToCartItems.forEach(item => {
      if (!item.search_query) return;

      if (!addToCartGroups[item.search_query]) {
        addToCartGroups[item.search_query] = {
          query: item.search_query,
          count: 0,
          products: new Set(),
          revenue: 0
        };
      }

      addToCartGroups[item.search_query].count += 1;
      addToCartGroups[item.search_query].products.add(item.product_id);

      // Calculate revenue if price is available
      if (item.product_price) {
        const price = parseFloat(item.product_price.replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          addToCartGroups[item.search_query].revenue += price * (item.quantity || 1);
        }
      }
    });

    // Group by search query for checkout
    const checkoutGroups = {};
    finalCheckoutItems.forEach(item => {
      if (!item.search_query) return;

      if (!checkoutGroups[item.search_query]) {
        checkoutGroups[item.search_query] = {
          query: item.search_query,
          count: 0,
          products: new Set(),
          revenue: 0
        };
      }

      checkoutGroups[item.search_query].count += 1;
      checkoutGroups[item.search_query].products.add(item.product_id);

      // Calculate revenue - for checkout events use cart_total, for cart items use product_price
      if (item.cart_total) {
        // For checkout events, use cart_total
        const price = parseFloat(item.cart_total.toString().replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          checkoutGroups[item.search_query].revenue += price;
        }
      } else if (item.product_price) {
        // Fallback for cart items
        const price = parseFloat(item.product_price.replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          checkoutGroups[item.search_query].revenue += price * (item.quantity || 1);
        }
      }
    });

    // Group by search query for product clicks
    const clickGroups = {};
    const productClickCounts = {}; // Aggregate clicks by product
    let aiClicksTotal = 0;
    let zeroResultsClicksTotal = 0;
    let rerankClicksTotal = 0;
    let injectClicksTotal = 0;
    clickEvents.forEach(item => {
      if (!item.search_query) return;

      const src = (item.source || '').toLowerCase();
      const isAi = src === 'ai';
      const isZeroResults = src === 'zero-results';
      const isRerank = src === 'rerank';
      const isInject = src === 'inject';
      if (isAi) aiClicksTotal += 1;
      if (isZeroResults) zeroResultsClicksTotal += 1;
      if (isRerank) rerankClicksTotal += 1;
      if (isInject) injectClicksTotal += 1;

      if (!clickGroups[item.search_query]) {
        clickGroups[item.search_query] = {
          query: item.search_query,
          count: 0,
          aiCount: 0,
          zeroResultsCount: 0,
          rerankCount: 0,
          injectCount: 0,
          products: new Set()
        };
      }

      clickGroups[item.search_query].count += 1;
      if (isAi) clickGroups[item.search_query].aiCount += 1;
      if (isZeroResults) clickGroups[item.search_query].zeroResultsCount += 1;
      if (isRerank) clickGroups[item.search_query].rerankCount += 1;
      if (isInject) clickGroups[item.search_query].injectCount += 1;

      if (item.product_id) {
        clickGroups[item.search_query].products.add(item.product_id);

        // Aggregate by product ID or name
        const pId = item.product_id;
        if (!productClickCounts[pId]) {
          productClickCounts[pId] = {
            id: pId,
            name: item.product_name || item.name || "מוצר לא ידוע",
            clicks: 0,
            aiClicks: 0
          };
        }
        productClickCounts[pId].clicks += 1;
        if (isAi) productClickCounts[pId].aiClicks += 1;
      }
    });

    // Compute Boosted Product Exposure
    const exposureCounts = {};
    queries.forEach(query => {
      if (query.deliveredProducts && Array.isArray(query.deliveredProducts)) {
        query.deliveredProducts.forEach(productName => {
          const normalizedName = trimAndNormalize(productName).toLowerCase();
          if (!exposureCounts[normalizedName]) {
            exposureCounts[normalizedName] = {
              name: productName,
              exposure: 0,
              isBoosted: false
            };
          }
          exposureCounts[normalizedName].exposure += 1;
        });
      }
    });

    // Cross-reference with boosted products list
    const boostedExposure = boostedProducts.map(bp => {
      const normalizedName = trimAndNormalize(bp.name).toLowerCase();
      const exposureData = exposureCounts[normalizedName] || { exposure: 0 };

      // Also check if this boosted product was clicked
      const clickData = Object.values(productClickCounts).find(c =>
        trimAndNormalize(c.name).toLowerCase() === normalizedName
      ) || { clicks: 0 };

      return {
        ...bp,
        exposure: exposureData.exposure,
        clicks: clickData.clicks
      };
    }).sort((a, b) => b.exposure - a.exposure);

    // Convert to arrays and sort by count
    const topClickedProducts = Object.values(productClickCounts)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    const topAddToCartQueries = Object.values(addToCartGroups)
      .map(group => ({
        ...group,
        products: Array.from(group.products).length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topCheckoutQueries = Object.values(checkoutGroups)
      .map(group => ({
        ...group,
        products: Array.from(group.products).length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topClickQueries = Object.values(clickGroups)
      .map(group => ({
        ...group,
        products: Array.from(group.products).length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate totals for each category
    const totalRevenueFromAddToCart = finalAddToCartItems.reduce((sum, item) => {
      if (item.product_price) {
        const price = parseFloat(item.product_price.replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          return sum + (price * (item.quantity || 1));
        }
      }
      return sum;
    }, 0);

    const totalRevenueFromCheckout = finalCheckoutItems.reduce((sum, item) => {
      if (item.cart_total) {
        // For checkout events, use cart_total
        const price = parseFloat(item.cart_total.toString().replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          return sum + price;
        }
      } else if (item.product_price) {
        // Fallback for cart items
        const price = parseFloat(item.product_price.replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          return sum + (price * (item.quantity || 1));
        }
      }
      return sum;
    }, 0);

    // Legacy calculations for backward compatibility
    const totalRevenue = topAddToCartQueries.reduce((sum, q) => sum + q.revenue, 0);
    const totalConversions = cartAnalytics.length;
    const totalRevenueFromCart = totalRevenueFromAddToCart + totalRevenueFromCheckout;

    const allUniqueProducts = new Set();
    cartAnalytics.forEach(item => {
      if (item.product_id) allUniqueProducts.add(item.product_id);
    });
    const uniqueProducts = allUniqueProducts.size;

    return {
      conversionRate,
      totalCartItems,
      topQueries: topAddToCartQueries, // Legacy - keep for backward compatibility
      totalRevenue,
      totalRevenueFromCart,
      totalConversions,
      uniqueProducts,
      boostedExposure,
      topClickedProducts,
      // New separated metrics
      addToCartMetrics: {
        items: finalAddToCartItems.length,
        revenue: totalRevenueFromAddToCart,
        queries: topAddToCartQueries,
        uniqueProducts: new Set(finalAddToCartItems.map(item => item.product_id)).size
      },
      checkoutMetrics: {
        items: finalCheckoutItems.length,
        revenue: totalRevenueFromCheckout,
        queries: topCheckoutQueries,
        uniqueProducts: new Set(finalCheckoutItems.map(item => item.product_id)).size
      },
      clickMetrics: {
        items: clickEvents.length,
        aiClicks: aiClicksTotal,
        zeroResultsClicks: zeroResultsClicksTotal,
        rerankClicks: rerankClicksTotal,
        injectClicks: injectClicksTotal,
        queries: topClickQueries,
        uniqueProducts: new Set(clickEvents.map(item => item.product_id)).size,
        topClickedProducts
      }
    };
  }, [cartAnalytics, checkoutEvents, clickEvents, queries, boostedProducts]);

  // Semantix Purchases Funnel
  const semantixFunnel = useMemo(() => {
    // Determine if we should use checkout or cart data
    const useCheckout = checkoutEvents && checkoutEvents.length > 0;
    const dataSource = useCheckout ? checkoutEvents : cartAnalytics;
    const mode = useCheckout ? 'checkout' : 'cart';

    const assumptions = mode === 'checkout'
      ? [
        `נעשה שימוש בשדה "search_query" כשאילתת המקור`,
        `ההכנסות חושבו על בסיס שדה "cart_total" - סכום הרכישה המלא`,
        `כמות מובאת מהשדה "quantity"`,
        `מזהה הזמנה מובא מהשדה "order_id" עבור ספירת הזמנות ייחודיות`,
        `השבוע מתחיל ביום ראשון (Israeli week format)`
      ]
      : [
        `נעשה שימוש בשדה "search_query" כשאילתת המקור`,
        `הכנסות משוערות חושבו על בסיס "product_price × quantity"`,
        `כמות מובאת מהשדה "quantity"`,
        `נספרות הוספות לעגלה ייחודיות`,
        `השבוע מתחיל ביום ראשון (Israeli week format)`
      ];

    if (!dataSource || dataSource.length === 0) {
      return {
        assumptions,
        totals: { revenue: 0, orders: 0, items: 0 },
        weekly: [],
        daily: [],
        byQueryProduct: [],
        hasData: false,
        mode
      };
    }

    const complexPurchases = dataSource
      .filter((event) => {
        const query = event.search_query || "";

        // Skip events with more than 3 products
        if (Array.isArray(event.products) && event.products.length > 3) {
          return false;
        }

        return isComplex(query);
      })
      .map((event) => {
        const quantity = event.quantity || 1;
        // Calculate revenue based on mode
        let revenue;
        if (mode === 'checkout') {
          // For checkout: use cart_total as the revenue (total purchase amount)
          const cartTotal = normalizePrice(event.cart_total ?? 0);
          revenue = cartTotal > 0 ? cartTotal : normalizePrice(event.product_price ?? 0) * quantity;
        } else {
          // For cart: use product_price * quantity (estimated revenue)
          revenue = normalizePrice(event.product_price ?? 0) * quantity;
        }

        // Extract product name - handle both direct fields and products array
        let productName = "לא ידוע";
        if (event.product_name) {
          productName = event.product_name;
        } else if (event.product) {
          productName = event.product;
        } else if (event.name) {
          productName = event.name;
        } else if (Array.isArray(event.products) && event.products.length > 0) {
          // If products is an array, get names from all products
          const productNames = event.products
            .map(p => p.product_name || p.name || "")
            .filter(name => name)
            .join(", ");
          productName = productNames || "לא ידוע";
        }

        return {
          searchQuery: event.search_query,
          productName,
          quantity,
          orderId: event.order_id || null,
          eventDate: parseEventTime(event.timestamp || event.created_at) ? new Date(parseEventTime(event.timestamp || event.created_at)) : null,
          revenue
        };
      });

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
    let totalCartAdditions = 0; // Count of cart additions
    let totalPurchases = 0; // Count of all purchase events

    complexPurchases.forEach((event) => {
      if (mode === 'checkout') {
        // For checkout: count all purchase events
        totalPurchases += 1;
        // Also track unique order IDs for reference
        if (event.orderId) {
          orderSet.add(event.orderId);
        }
      } else {
        // For cart: count each event as a cart addition
        totalCartAdditions += 1;
        // Also track by a unique identifier if available
        if (event.orderId) {
          orderSet.add(event.orderId);
        }
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
        orders: mode === 'checkout' ? totalPurchases : totalCartAdditions,
        items: totalItems
      },
      weekly,
      daily,
      byQueryProduct,
      hasData: true,
      mode
    };
  }, [checkoutEvents, cartAnalytics]);

  // Upsell Analytics - Calculate upsell purchases and cart additions
  const upsellAnalytics = useMemo(() => {
    // Create a map of queries to their delivered products for fast lookup
    // Use normalized query text for better matching
    const queryToDeliveredProducts = new Map();

    // Check if queries exists and is an array
    if (!queries || !Array.isArray(queries)) {
      return {
        hasData: false,
        totals: { revenue: 0, orders: 0, items: 0 },
        byQueryProduct: [],
        queries: []
      };
    }

    queries.forEach(query => {
      if (query && query.deliveredProducts && Array.isArray(query.deliveredProducts) && query.deliveredProducts.length > 0) {
        const queryText = trimAndNormalize(query.query || '').toLowerCase();
        queryToDeliveredProducts.set(queryText, query.deliveredProducts);
        // Also store with original query for fallback
        if (query.query) {
          queryToDeliveredProducts.set(query.query.toLowerCase().trim(), query.deliveredProducts);
        }
      }
    });

    if (queryToDeliveredProducts.size === 0) {
      return {
        hasData: false,
        totals: { revenue: 0, orders: 0, items: 0 },
        byQueryProduct: [],
        queries: []
      };
    }

    // Helper function to find delivered products for a query
    const findDeliveredProducts = (searchQuery) => {
      if (!searchQuery) return null;
      const normalized = trimAndNormalize(searchQuery).toLowerCase();
      return queryToDeliveredProducts.get(normalized) ||
        queryToDeliveredProducts.get(searchQuery.toLowerCase().trim());
    };

    // Process checkout events (purchases)
    const upsellPurchases = [];
    checkoutEvents.forEach(event => {
      const deliveredProducts = findDeliveredProducts(event.search_query);

      if (!deliveredProducts) return;

      // Skip events with more than 3 products
      if (Array.isArray(event.products) && event.products.length > 3) {
        return;
      }

      // Handle products array or single product
      const products = Array.isArray(event.products) && event.products.length > 0
        ? event.products
        : [{
          product_name: event.product_name || 'מוצר לא ידוע',
          product_price: event.product_price || 0,
          quantity: event.quantity || 1
        }];

      products.forEach(product => {
        const productName = product.product_name || product.name || 'מוצר לא ידוע';
        if (isUpsell(event.search_query, productName, deliveredProducts)) {
          const quantity = Number(product.quantity) || 1;
          const revenue = normalizePrice(event.cart_total ?? 0) ||
            normalizePrice(product.product_price || product.price || 0) * quantity;
          upsellPurchases.push({
            searchQuery: event.search_query,
            productName,
            quantity: quantity,
            orderId: event.order_id || null,
            revenue
          });
        }
      });
    });

    // Only process checkout events (purchases), not cart additions
    // User requested to only consider checkouts for upsell analytics
    const allUpsells = upsellPurchases;

    if (allUpsells.length === 0) {
      return {
        hasData: false,
        totals: { revenue: 0, orders: 0, items: 0 },
        byQueryProduct: [],
        queries: []
      };
    }

    // Calculate totals
    const totalRevenue = allUpsells.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
    const totalItems = allUpsells.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const uniqueOrders = new Set(upsellPurchases.filter(p => p.orderId).map(p => p.orderId)).size;

    // Group by query and product
    const detailMap = new Map();
    allUpsells.forEach(event => {
      const key = `${event.searchQuery || "ללא שאילתה"}__${event.productName}`;
      const entry = detailMap.get(key) || {
        search_query: event.searchQuery || "ללא שאילתה",
        product_name: event.productName,
        orders: new Set(),
        items: 0,
        revenue: 0
      };
      if (event.orderId) {
        entry.orders.add(event.orderId);
      }
      entry.items += Number(event.quantity) || 0;
      entry.revenue += Number(event.revenue) || 0;
      detailMap.set(key, entry);
    });

    const byQueryProduct = Array.from(detailMap.values())
      .map((entry) => ({
        search_query: entry.search_query,
        product_name: entry.product_name,
        orders: entry.orders.size,
        items: entry.items,
        revenue: entry.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Group by query for summary
    const queryMap = new Map();
    allUpsells.forEach(event => {
      const existing = queryMap.get(event.searchQuery) || {
        query: event.searchQuery || "ללא שאילתה",
        orders: new Set(),
        items: 0,
        revenue: 0
      };
      if (event.orderId) {
        existing.orders.add(event.orderId);
      }
      existing.items += Number(event.quantity) || 0;
      existing.revenue += Number(event.revenue) || 0;
      queryMap.set(event.searchQuery, existing);
    });

    const upsellQueries = Array.from(queryMap.values())
      .map(entry => ({
        query: entry.query,
        count: entry.orders.size || entry.items,
        products: 1, // Will be calculated from unique products
        revenue: entry.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      hasData: true,
      totals: {
        revenue: totalRevenue,
        orders: uniqueOrders,
        items: totalItems
      },
      byQueryProduct,
      queries: upsellQueries
    };
  }, [checkoutEvents, queries]); // Only checkouts, not cart additions

  // Set of boosted product names for fast O(1) per-query lookup
  const boostedProductNamesSet = useMemo(() => {
    const set = new Set();
    boostedProducts.forEach(bp => {
      if (bp.name) {
        set.add(trimAndNormalize(bp.name).toLowerCase());
      }
    });
    return set;
  }, [boostedProducts]);

  // Export queries to CSV
  const downloadCSV = () => {
    if (!filteredQueries.length) {
      alert('אין נתונים לייצוא');
      return;
    }

    // Create CSV content with proper headers order
    // Column order: 1. תאריך ושעה, 2. שאילתת חיפוש, 3. קטגוריה, 4. מחיר מינימלי, 5. מחיר מקסימלי, 6. כמות תוצאות
    const headers = ['תאריך ושעה', 'שאילתת חיפוש', 'קטגוריה', 'מחיר מינימלי', 'מחיר מקסימלי', 'כמות תוצאות'];
    const csvRows = [headers.join(',')];

    filteredQueries.forEach(query => {
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

  return (
    <div className="w-full">
      {/* Page Header with Card-like Design */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2MmgxMnpNMjQgMjRoMTJ2LTJIMjR2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Semantix Performance</h1>
                  <p className="text-purple-200 text-sm">
                    {session?.user?.name || "משתמש"} | {getCurrentTimePeriodLabel()}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0">
              {/* Export Button */}
              {filteredQueries.length > 0 && (
                <button
                  onClick={downloadCSV}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg text-sm backdrop-blur-sm ml-4"
                >
                  <Download className="h-4 w-4" />
                  ייצוא נתונים
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setTimePeriodOpen(!timePeriodOpen)}
                  className="flex items-center justify-center px-2 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white backdrop-blur-sm"
                >
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">{getCurrentTimePeriodLabel()}</span>
                  <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2 transition-transform ${timePeriodOpen ? 'rotate-180' : ''}`} />
                </button>

                {timePeriodOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setTimePeriodOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden" style={{ direction: 'rtl' }}>
                      {timePeriods.map((period) => (
                        <button
                          key={period.value}
                          onClick={() => handleTimePeriodChange(period)}
                          className={`w-full px-4 py-3 text-right hover:bg-gray-50 transition-colors text-sm ${selectedTimePeriod === period.value
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-gray-700'
                            }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hero Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-6 pb-6 pt-2">
            {/* Total Revenue - Hero Stat */}
            <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-300" />
                <p className="text-white/80 text-xs sm:text-sm font-medium">הכנסות דרך Semantix</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                ₪{((cartMetrics?.addToCartMetrics?.revenue || 0) + (cartMetrics?.checkoutMetrics?.revenue || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-green-300/80 text-xs mt-2 font-medium">
                עגלה + רכישות
              </p>
            </div>

            {/* AI Searches Processed */}
            <div className="p-4 sm:p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-blue-300" />
                <p className="text-white/80 text-xs sm:text-sm font-medium">חיפושי AI</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">{filteredCount.toLocaleString()}</p>
              <p className="text-white/60 text-xs mt-2">{getCurrentTimePeriodLabel()}</p>
            </div>

            {/* Product Discovery - Expanded */}
            <div className="p-4 sm:p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-cyan-300" />
                <p className="text-white/80 text-xs sm:text-sm font-medium">גילוי מוצרים</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {((cartMetrics?.clickMetrics?.items || 0) + (cartMetrics?.addToCartMetrics?.items || 0)).toLocaleString()}
              </p>
              <p className="text-white/60 text-xs mt-2">
                {(cartMetrics?.clickMetrics?.items || 0).toLocaleString()} לחיצות + {(cartMetrics?.addToCartMetrics?.items || 0).toLocaleString()} עגלה
              </p>
            </div>
          </div>
        </div>
      </header>


      {/* Semantix Conversion Funnel */}
      {queries.length > 0 && (cartAnalytics.length > 0 || clickEvents.length > 0 || checkoutEvents.length > 0) && (
        <section className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">משפך ההמרה של Semantix</h2>
                <p className="text-xs text-gray-500">מחיפוש חכם לרכישה</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funnel Bars */}
              <div className="space-y-3">
                {(() => {
                  const totalSearches = queries.length;
                  const totalClicks = cartMetrics?.clickMetrics?.items || 0;
                  const totalCart = cartMetrics?.addToCartMetrics?.items || 0;
                  const totalPurchases = cartMetrics?.checkoutMetrics?.items || 0;

                  const steps = [
                    { label: 'חיפושים', count: totalSearches, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700', pct: 100 },
                    { label: 'לחיצות על מוצרים', count: totalClicks, color: 'from-cyan-500 to-blue-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', pct: totalSearches > 0 ? (totalClicks / totalSearches * 100) : 0 },
                    { label: 'הוספה לעגלה', count: totalCart, color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50', textColor: 'text-green-700', pct: totalSearches > 0 ? (totalCart / totalSearches * 100) : 0 },
                    { label: 'רכישות', count: totalPurchases, color: 'from-purple-500 to-indigo-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700', pct: totalSearches > 0 ? (totalPurchases / totalSearches * 100) : 0 },
                  ];

                  return steps.map((step, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${step.textColor}`}>{step.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${step.bgColor} ${step.textColor}`}>
                            {step.count.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-500">{step.pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${step.color} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(step.pct, 2)}%` }}
                        />
                      </div>
                      {i < steps.length - 1 && steps[i + 1].count > 0 && (
                        <div className="flex justify-end mt-1">
                          <span className="text-[10px] text-gray-400 font-medium">
                            {step.count > 0 ? (steps[i + 1].count / step.count * 100).toFixed(1) : 0}% המרה
                          </span>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              {/* Funnel Pie Chart */}
              <div className="flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'חיפושים בלבד', value: Math.max(0, queries.length - (cartMetrics?.clickMetrics?.items || 0)) },
                        { name: 'לחיצות', value: Math.max(0, (cartMetrics?.clickMetrics?.items || 0) - (cartMetrics?.addToCartMetrics?.items || 0)) },
                        { name: 'עגלה', value: Math.max(0, (cartMetrics?.addToCartMetrics?.items || 0) - (cartMetrics?.checkoutMetrics?.items || 0)) },
                        { name: 'רכישות', value: cartMetrics?.checkoutMetrics?.items || 0 },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {['#93c5fd', '#22d3ee', '#34d399', '#a78bfa'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {[
                    { label: 'חיפושים', color: '#93c5fd' },
                    { label: 'לחיצות', color: '#22d3ee' },
                    { label: 'עגלה', color: '#34d399' },
                    { label: 'רכישות', color: '#a78bfa' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Charts Section — Top Queries + Activity */}
      {queries.length > 0 && (cartAnalytics.length > 0 || clickEvents.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Queries by Revenue Chart */}
          {(cartMetrics?.addToCartMetrics?.queries || []).length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900">שאילתות מובילות לפי הכנסות</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={(cartMetrics.addToCartMetrics.queries || []).slice(0, 7).map(q => ({
                    name: q.query.length > 18 ? q.query.substring(0, 18) + '...' : q.query,
                    revenue: q.revenue || 0,
                    count: q.count
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" tickFormatter={(v) => `₪${v.toLocaleString()}`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, textAnchor: 'end' }} />
                  <Tooltip
                    formatter={(value, name) => [name === 'revenue' ? `₪${value.toLocaleString()}` : value, name === 'revenue' ? 'הכנסות' : 'פעולות']}
                    contentStyle={{ direction: 'rtl', fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="url(#revenueGradient)" radius={[0, 6, 6, 0]} />
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Daily Search Activity Chart */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">פעילות חיפוש יומית</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const dailyMap = {};
                  const now = new Date();
                  // Initialize last 14 days
                  for (let i = 13; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    const key = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
                    dailyMap[key] = { date: key, searches: 0, clicks: 0, cart: 0 };
                  }
                  queries.forEach(q => {
                    const d = new Date(q.timestamp);
                    const key = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
                    if (dailyMap[key]) dailyMap[key].searches += 1;
                  });
                  clickEvents.forEach(e => {
                    const d = new Date(e.timestamp);
                    const key = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
                    if (dailyMap[key]) dailyMap[key].clicks += 1;
                  });
                  cartAnalytics.forEach(e => {
                    const d = new Date(e.timestamp);
                    const key = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
                    if (dailyMap[key]) dailyMap[key].cart += 1;
                  });
                  return Object.values(dailyMap);
                })()}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ direction: 'rtl', fontSize: 12 }} />
                <Area type="monotone" dataKey="searches" name="חיפושים" stroke="#6366f1" fill="url(#searchGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="clicks" name="לחיצות" stroke="#06b6d4" fill="url(#clickGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="cart" name="עגלה" stroke="#10b981" fill="url(#cartGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-indigo-500 rounded"></div><span className="text-xs text-gray-600">חיפושים</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-cyan-500 rounded"></div><span className="text-xs text-gray-600">לחיצות</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-emerald-500 rounded"></div><span className="text-xs text-gray-600">עגלה</span></div>
            </div>
          </div>
        </section>
      )}

      {/* Revenue Attribution Section */}
      {(cartAnalytics.length > 0 || checkoutEvents.length > 0 || clickEvents.length > 0 || loadingCart || loadingCheckout || loadingClicks) && (
        <section className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">הכנסות שנוצרו דרך Semantix</h2>
                <p className="text-xs text-gray-500">ייחוס הכנסות לחיפוש חכם</p>
              </div>
            </div>
            {(loadingCart || loadingCheckout || loadingClicks) ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (cartError || checkoutError) ? (
              <div className="text-center text-red-500 p-4">{cartError || checkoutError}</div>
            ) : (
              <>
                {/* Add to Cart Section */}
                {(cartMetrics?.addToCartMetrics?.revenue || 0) >= 1000 && <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl blur-md opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 p-4 sm:p-5 rounded-2xl shadow-xl ring-2 ring-purple-200 ring-offset-2">
                        <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="mr-3 sm:mr-4 min-w-0 flex-1">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                        ₪{(cartMetrics?.addToCartMetrics?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">הוספות לעגלה דרך חיפוש חכם</p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                        <span className="text-xs text-gray-500">
                          {(cartMetrics?.addToCartMetrics?.items || 0).toLocaleString('en-US')} הוספות לעגלה
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {(cartMetrics?.addToCartMetrics?.uniqueProducts || 0).toLocaleString('en-US')} מוצרים ייחודיים
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setCartDetailsExpanded(!cartDetailsExpanded)}
                    className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors self-start"
                  >
                    {cartDetailsExpanded ? (
                      <>
                        <span>הסתר פרטים</span>
                        <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                      </>
                    ) : (
                      <>
                        <span>קרא עוד</span>
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      </>
                    )}
                  </button>
                </div>}

                {/* Checkout Section - Only show if we have checkout events and revenue >= 1000 */}
                {checkoutEvents.length > 0 && (cartMetrics?.checkoutMetrics?.revenue || 0) >= 1000 && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl blur-md opacity-50"></div>
                          <div className="relative bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 p-4 sm:p-5 rounded-2xl shadow-xl ring-2 ring-purple-200 ring-offset-2">
                            <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                        <div className="mr-3 sm:mr-4 min-w-0 flex-1">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                            ₪{(cartMetrics?.checkoutMetrics?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">רכישות סך הכל</p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {(cartMetrics?.checkoutMetrics?.items || 0).toLocaleString('en-US')} רכישות
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              {(cartMetrics?.checkoutMetrics?.uniqueProducts || 0).toLocaleString('en-US')} מוצרים ייחודיים
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setCheckoutDetailsExpanded(!checkoutDetailsExpanded)}
                        className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors self-start"
                      >
                        {checkoutDetailsExpanded ? (
                          <>
                            <span>הסתר פרטים</span>
                            <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                          </>
                        ) : (
                          <>
                            <span>קרא עוד</span>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Product Clicks Section - Only show if we have click events */}
                {clickEvents.length > 0 && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-2xl blur-md opacity-50"></div>
                          <div className="relative bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 p-4 sm:p-5 rounded-2xl shadow-xl ring-2 ring-blue-200 ring-offset-2">
                            <MousePointer2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                        <div className="mr-3 sm:mr-4 min-w-0 flex-1">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                            {(cartMetrics?.clickMetrics?.items || 0).toLocaleString('en-US')}
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">לחיצות על מוצרים דרך חיפוש חכם</p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {(cartMetrics?.clickMetrics?.uniqueProducts || 0).toLocaleString('en-US')} מוצרים ייחודיים
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              {(cartMetrics?.clickMetrics?.queries || []).length} שאילתות ייחודיות
                            </span>
                            {(cartMetrics?.clickMetrics?.aiClicks || 0) > 0 && (
                              <>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                                  ✦ {(cartMetrics.clickMetrics.aiClicks).toLocaleString('en-US')} AI
                                </span>
                              </>
                            )}
                            {(cartMetrics?.clickMetrics?.zeroResultsClicks || 0) > 0 && (
                              <>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                  ◎ {(cartMetrics.clickMetrics.zeroResultsClicks).toLocaleString('en-US')} Zero
                                </span>
                              </>
                            )}
                            {(cartMetrics?.clickMetrics?.rerankClicks || 0) > 0 && (
                              <>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                  ↑ {(cartMetrics.clickMetrics.rerankClicks).toLocaleString('en-US')} Rerank
                                </span>
                              </>
                            )}
                            {(cartMetrics?.clickMetrics?.injectClicks || 0) > 0 && (
                              <>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
                                  ⊕ {(cartMetrics.clickMetrics.injectClicks).toLocaleString('en-US')} Inject
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setClickDetailsExpanded(!clickDetailsExpanded)}
                        className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors self-start"
                      >
                        {clickDetailsExpanded ? (
                          <>
                            <span>הסתר פרטים</span>
                            <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                          </>
                        ) : (
                          <>
                            <span>קרא עוד</span>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Boosted Product Exposure Section */}
                {(cartMetrics?.boostedExposure?.length > 0) && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl blur-md opacity-50"></div>
                          <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 p-4 sm:p-5 rounded-2xl shadow-xl ring-2 ring-orange-200 ring-offset-2">
                            <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                        <div className="mr-3 sm:mr-4 min-w-0 flex-1">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                            {(cartMetrics?.boostedExposure?.reduce((sum, p) => sum + (p.exposure || 0), 0) || 0).toLocaleString('en-US')}
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">חשיפות למוצרים מקודמים (Boosted)</p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {(cartMetrics?.boostedExposure?.length || 0).toLocaleString('en-US')} מוצרים מקודמים פעילים
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              {(cartMetrics?.boostedExposure?.reduce((sum, p) => sum + (p.clicks || 0), 0) || 0).toLocaleString('en-US')} לחיצות על מקודמים
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setExposureDetailsExpanded(!exposureDetailsExpanded)}
                        className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors self-start"
                      >
                        {exposureDetailsExpanded ? (
                          <>
                            <span>הסתר פרטים</span>
                            <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                          </>
                        ) : (
                          <>
                            <span>קרא עוד</span>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Expanded Details for Product Clicks */}
                {clickDetailsExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-8">
                    {/* Top Clicked Products Table */}
                    <div>
                      <h3 className="text-md font-medium text-gray-700 mb-4">מוצרים עם מספר הלחיצות הגבוה ביותר</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                שם המוצר
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                מספר לחיצות
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(cartMetrics.topClickedProducts || []).length > 0 ? (
                              (cartMetrics.topClickedProducts || []).map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                                    {item.name}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                      {item.clicks.toLocaleString('en-US')}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="2" className="px-6 py-8 text-center text-gray-500">
                                  אין נתוני לחיצות זמינים
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Original Query-based table remains */}
                    <div>
                      <h3 className="text-md font-medium text-gray-700 mb-4">שאילתות החיפוש המובילות ללחיצות</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                שאילתת חיפוש
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                לחיצות
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                מוצרים ייחודיים
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(cartMetrics.clickMetrics?.queries || []).length > 0 ? (
                              (cartMetrics.clickMetrics?.queries || []).map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                                    {item.query}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                      {item.count.toLocaleString('en-US')}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    {item.products.toLocaleString('en-US')}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                                  אין שאילתות זמינות
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded Details for Boosted Exposure */}
                {exposureDetailsExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-700 mb-4">ביצועי מוצרים מקודמים (Boosted)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                מוצר
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                רמת הגברה
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                חשיפות
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                לחיצות
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                CTR
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(cartMetrics.boostedExposure || []).length > 0 ? (
                              (cartMetrics.boostedExposure || []).map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right flex items-center gap-3">
                                    {item.image && (
                                      <img src={item.image} alt={item.name} className="w-8 h-8 rounded object-cover" />
                                    )}
                                    <span className="truncate max-w-[200px]">{item.name}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    <div className="flex items-center text-amber-500 font-bold">
                                      <Star className="w-3 h-3 fill-current mr-1" />
                                      {item.boost}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    {item.exposure.toLocaleString('en-US')}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    {item.clicks.toLocaleString('en-US')}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    <span className="font-medium text-indigo-600">
                                      {item.exposure > 0 ? ((item.clicks / item.exposure) * 100).toFixed(1) : '0.0'}%
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                  אין נתוני חשיפות למוצרים מקודמים
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Combined Semantix Purchases - Complex Queries + Upsells */}
                {((semantixFunnel.hasData && semantixFunnel.mode === 'checkout') || upsellAnalytics.hasData) && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-4">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl blur-md opacity-50"></div>
                          <div className="relative bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 p-4 sm:p-5 rounded-2xl shadow-xl ring-2 ring-purple-200 ring-offset-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none" className="h-6 w-6 sm:h-7 sm:w-7 text-white">
                              <g stroke="currentColor" strokeWidth="20" strokeLinecap="round">
                                <line x1="75" y1="110" x2="180" y2="60" />
                                <line x1="75" y1="110" x2="240" y2="150" />
                                <line x1="240" y1="150" x2="135" y2="240" />
                              </g>
                              <g fill="currentColor">
                                <rect x="55" y="90" width="40" height="40" rx="4" />
                                <rect x="160" y="40" width="40" height="40" rx="4" />
                                <rect x="220" y="130" width="40" height="40" rx="4" />
                                <rect x="115" y="220" width="40" height="40" rx="4" />
                              </g>
                            </svg>
                          </div>
                        </div>
                        <div className="mr-3 sm:mr-4 min-w-0 flex-1">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                            ₪{((semantixFunnel.hasData && semantixFunnel.mode === 'checkout' ? (semantixFunnel.totals.revenue || 0) : 0) + (upsellAnalytics.hasData ? (upsellAnalytics.totals.revenue || 0) : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            רכישות דרך סמנטיקס - חיפושים מורכבים ו-Upsell
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {((semantixFunnel.hasData && semantixFunnel.mode === 'checkout' ? (semantixFunnel.totals.orders || 0) : 0) + (upsellAnalytics.hasData ? (upsellAnalytics.totals.orders || 0) : 0)).toLocaleString('en-US')} רכישות
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              {((semantixFunnel.hasData && semantixFunnel.mode === 'checkout' ? (semantixFunnel.totals.items || 0) : 0) + (upsellAnalytics.hasData ? (upsellAnalytics.totals.items || 0) : 0)).toLocaleString('en-US')} מוצרים
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSemantixExpanded(!semantixExpanded)}
                        className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors self-start"
                      >
                        {semantixExpanded ? (
                          <>
                            <span>הסתר פרטים</span>
                            <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                          </>
                        ) : (
                          <>
                            <span>קרא עוד</span>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Expanded Details - Combined View */}
                    {semantixExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-100 space-y-8">
                        {/* Complex Queries Section */}
                        {semantixFunnel.hasData && semantixFunnel.mode === 'checkout' && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                              חיפושים מורכבים
                            </h3>
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-md font-medium text-gray-700 mb-4">
                                  שאילתות מורכבות מובילות (לפי הכנסות)
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full table-auto">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          שאילתת חיפוש
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          {semantixFunnel.mode === 'checkout' ? 'הכנסות' : 'הכנסות משוערות'}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {(() => {
                                        // Group by query and sum up
                                        const queryMap = new Map();
                                        semantixFunnel.byQueryProduct.forEach(item => {
                                          const existing = queryMap.get(item.search_query) || { orders: 0, items: 0, revenue: 0 };
                                          queryMap.set(item.search_query, {
                                            orders: existing.orders + item.orders,
                                            items: existing.items + item.items,
                                            revenue: existing.revenue + item.revenue
                                          });
                                        });
                                        return Array.from(queryMap.entries())
                                          .map(([query, data]) => ({ query, ...data }))
                                          .sort((a, b) => b.revenue - a.revenue)
                                          .slice(0, 10)
                                          .map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                              <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                                {item.query}
                                              </td>
                                              <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                                                ₪{item.revenue.toFixed(2)}
                                              </td>
                                            </tr>
                                          ));
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Detailed Query-Product Table */}
                              <div>
                                <h3 className="text-md font-medium text-gray-700 mb-4">פירוט מלא: שאילתה × מוצר</h3>
                                <p className="text-xs text-gray-600 mb-3">פירוט מפורט של כל רכישה לפי שאילתה ומוצר</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full table-auto">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          שאילתת חיפוש
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          מוצרים
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          {semantixFunnel.mode === 'checkout' ? 'הכנסות' : 'הכנסות משוערות'}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {semantixFunnel.byQueryProduct
                                        .filter(row => {
                                          // Filter out rows with N/A or unknown product names
                                          const productName = (row.product_name || '').toLowerCase();
                                          return productName &&
                                            productName !== 'n/a' &&
                                            productName !== 'לא ידוע' &&
                                            productName !== 'ללא שם מוצר';
                                        })
                                        .slice(0, 50)
                                        .map((row, index) => {
                                          // Split product names if they contain commas (multiple products)
                                          const products = row.product_name.split(',').map(p => p.trim());
                                          const hasMultipleProducts = products.length > 1;

                                          return (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                              <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                                {row.search_query || "ללא שאילתה"}
                                              </td>
                                              <td className="px-6 py-4 text-sm text-gray-700">
                                                {hasMultipleProducts ? (
                                                  <div className="space-y-1">
                                                    <div className="text-xs text-gray-500 font-medium mb-1">
                                                      {products.length} מוצרים:
                                                    </div>
                                                    <ul className="text-sm space-y-0.5 max-h-32 overflow-y-auto">
                                                      {products.slice(0, 5).map((product, idx) => (
                                                        <li key={idx} className="flex items-start">
                                                          <span className="text-emerald-600 ml-2">•</span>
                                                          <span className="flex-1">{product}</span>
                                                        </li>
                                                      ))}
                                                      {products.length > 5 && (
                                                        <li className="text-xs text-gray-500 italic mt-1">
                                                          + עוד {products.length - 5} מוצרים...
                                                        </li>
                                                      )}
                                                    </ul>
                                                  </div>
                                                ) : (
                                                  <span>{row.product_name}</span>
                                                )}
                                              </td>
                                              <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                                                ₪{row.revenue.toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      {semantixFunnel.byQueryProduct.length === 0 && (
                                        <tr>
                                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                            אין נתונים להצגה
                                          </td>
                                        </tr>
                                      )}
                                      {semantixFunnel.byQueryProduct.length > 50 && (
                                        <tr>
                                          <td colSpan={3} className="px-6 py-4 text-center text-gray-600 bg-gray-50 text-sm">
                                            מציג 50 ראשונים מתוך {semantixFunnel.byQueryProduct.length} רכישות
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Upsell Section */}
                        {upsellAnalytics.hasData && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                              רכישות דרך Upsell
                            </h3>
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-md font-medium text-gray-700 mb-4">
                                  שאילתות מובילות ל-Upsell (לפי הכנסות)
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full table-auto">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          שאילתת חיפוש
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          הכנסות
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          הזמנות
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          מוצרים
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {upsellAnalytics.queries.length > 0 ? (
                                        upsellAnalytics.queries.map((item, index) => (
                                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                              {item.query}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-purple-600">
                                              ₪{item.revenue.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                              {item.count}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                              {item.products}
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            אין נתונים להצגה
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Detailed Query-Product Table */}
                              <div>
                                <h3 className="text-md font-medium text-gray-700 mb-4">פירוט מלא: שאילתה × מוצר</h3>
                                <p className="text-xs text-gray-600 mb-3">פירוט מפורט של כל רכישת Upsell לפי שאילתה ומוצר</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full table-auto">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          שאילתת חיפוש
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          מוצר
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          הכנסות
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          הזמנות
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          כמות
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {upsellAnalytics.byQueryProduct
                                        .filter(row => {
                                          const productName = (row.product_name || '').toLowerCase();
                                          return productName &&
                                            productName !== 'n/a' &&
                                            productName !== 'לא ידוע' &&
                                            productName !== 'ללא שם מוצר';
                                        })
                                        .slice(0, 50)
                                        .map((row, index) => (
                                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                              {row.search_query || "ללא שאילתה"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">
                                              {row.product_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-purple-600">
                                              ₪{row.revenue.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                              {row.orders}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                              {row.items}
                                            </td>
                                          </tr>
                                        ))}
                                      {upsellAnalytics.byQueryProduct.length === 0 && (
                                        <tr>
                                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            אין נתונים להצגה
                                          </td>
                                        </tr>
                                      )}
                                      {upsellAnalytics.byQueryProduct.length > 50 && (
                                        <tr>
                                          <td colSpan={5} className="px-6 py-4 text-center text-gray-600 bg-gray-50 text-sm">
                                            מציג 50 ראשונים מתוך {upsellAnalytics.byQueryProduct.length} רכישות Upsell
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Expanded Details for Add to Cart */}
                {cartDetailsExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-700 mb-4">שאילתות החיפוש המובילות להוספה לעגלה</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                שאילתת חיפוש
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                הוספות לעגלה
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                מוצרים ייחודיים
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                הכנסות משוערות
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(cartMetrics.addToCartMetrics?.queries || []).map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                                  {item.query}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
                                    {item.count.toLocaleString('en-US')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                  {item.products.toLocaleString('en-US')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                  ₪{item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded Details for Checkout */}
                {checkoutDetailsExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-700 mb-4">שאילתות החיפוש המובילות לרכישות (עם סכומים)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                שאילתת חיפוש (שאילתות מורכבות/סמנטיות)
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                רכישות
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                מוצרים ייחודיים
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                הכנסות
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(cartMetrics.checkoutMetrics?.queries || []).length > 0 ? (
                              (cartMetrics.checkoutMetrics?.queries || []).map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                                    {item.query}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    <span className="inline-block px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                                      {item.count.toLocaleString('en-US')}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    {item.products.toLocaleString('en-US')}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                    ₪{item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                  אין נתוני רכישות זמינים כרגע
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {(cartMetrics.checkoutMetrics?.queries || []).length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-700 mb-4">תרשים רכישות</h3>
                        <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-end justify-around">
                          {(cartMetrics.checkoutMetrics?.queries || []).slice(0, 5).map((item, index) => {
                            // Calculate relative height (50% to 100% of container)
                            const maxCount = Math.max(...(cartMetrics.checkoutMetrics?.queries || []).slice(0, 5).map(q => q.count));
                            const height = maxCount > 0 ? 50 + ((item.count / maxCount) * 50) : 50;

                            return (
                              <div key={index} className="flex flex-col items-center">
                                <div
                                  className="bg-gradient-to-t from-green-500 to-emerald-500 rounded-t-md w-16 shadow-md"
                                  style={{ height: `${height}%` }}
                                >
                                  <div className="text-white text-center font-bold py-2">
                                    {item.count.toLocaleString('en-US')}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-2 max-w-[80px] truncate text-center" title={item.query}>
                                  {item.query}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Table Section - Enhanced Design */}
      <section className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100" dir="rtl">
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              שאילתות חיפוש וביצועים ({filteredCount})
            </h2>
            {totalLoaded > 0 && (
              <span className="text-sm text-gray-500">
                נטענו {totalLoaded} מהשרת
                {hasMoreQueries && (
                  <span className="ml-2 text-indigo-600">• יש עוד שאילתות</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            <span className="mr-3 text-gray-600">טוען שאילתות...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">שגיאה בטעינת השאילתות</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              נסה שוב
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredCount === 0 && (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">אין שאילתות זמינות</h3>
            <p className="text-gray-600 mb-4">
              {totalLoaded === 0
                ? "לא נמצאו שאילתות במערכת. התחל לחפש כדי לראות נתונים כאן."
                : "אין שאילתות בתקופה שנבחרה. נסה לשנות את סינון התאריך."}
            </p>
            {totalLoaded > 0 && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSelectedTimePeriod("all");
                  setFilters({ category: "", type: "", minPrice: "", maxPrice: "" });
                }}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                אפס סינונים
              </button>
            )}
          </div>
        )}

        {/* Mobile Cards View */}
        {!loading && !error && filteredQueries.length > 0 && (
          <div className="block md:hidden p-4 space-y-3" dir="rtl">
            {displayedQueries.map((query, index) => {
              const queryText = (query.query || '').toLowerCase().trim();
              const deliveredProducts = query.deliveredProducts || [];

              // Create a Set of normalized delivered product names for fast lookup
              const deliveredProductsSet = new Set(
                deliveredProducts.map(p => trimAndNormalize(p).toLowerCase())
              );

              // Helper function to check if product was in delivered results
              const wasProductDelivered = (productName) => {
                if (!productName || deliveredProductsSet.size === 0) return false;
                return deliveredProductsSet.has(trimAndNormalize(productName).toLowerCase());
              };

              const queryTime = new Date(query.timestamp).getTime();
              // Add 1-hour window for attribution? Or just strict >= ?
              // User said "old add to carts... marked for new".
              // So Strict >= queryTime is the most important first step. 
              // We can also say within 24 hours to be safe, but let's start with strict >= queryTime.

              const cartProducts = cartAnalytics
                .filter(item => {
                  const itemTime = parseEventTime(item.timestamp || item.created_at);
                  return (item.search_query || '').toLowerCase().trim() === queryText &&
                    itemTime >= queryTime;
                })
                .map(item => ({
                  name: item.product_name || 'מוצר לא ידוע',
                  price: item.product_price || 0,
                  quantity: item.quantity || 1
                }))
                .filter(product => wasProductDelivered(product.name)) // Only products that were shown
                .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);

              const purchaseProducts = checkoutEvents
                .filter(item => {
                  const itemTime = parseEventTime(item.timestamp || item.created_at);
                  return (item.search_query || '').toLowerCase().trim() === queryText &&
                    itemTime >= queryTime;
                })
                .flatMap(item => {
                  if (Array.isArray(item.products) && item.products.length > 0) {
                    return item.products.map(p => ({
                      name: p.product_name || p.name || 'מוצר לא ידוע',
                      price: p.product_price || p.price || 0,
                      quantity: p.quantity || 1
                    }));
                  }
                  return [{
                    name: item.product_name || 'מוצר לא ידוע',
                    price: item.product_price || 0,
                    quantity: item.quantity || 1
                  }];
                })
                .filter(item => item.name && wasProductDelivered(item.name)) // Only products that were shown
                .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);

              // Find click events for this query
              // Use tight window for inferred clicks (3 min) vs direct attribution (10 min)
              // Exclude 'native' source — these are ambient page clicks, not Semantix widget clicks
              const MOBILE_ATTRIBUTION_WINDOW_MS = 10 * 60 * 1000;
              const MOBILE_INFERRED_CLICK_WINDOW_MS = 3 * 60 * 1000;
              const clickedProducts = clickEvents
                .filter(item => {
                  if ((item.source || '').toLowerCase() === 'native') return false;
                  const itemTime = parseEventTime(item.timestamp || item.created_at);
                  const isInferred = item.query_source === 'inferred_from_recent';
                  const clickWindow = isInferred ? MOBILE_INFERRED_CLICK_WINDOW_MS : MOBILE_ATTRIBUTION_WINDOW_MS;
                  return (item.search_query || '').toLowerCase().trim() === queryText &&
                    itemTime >= queryTime &&
                    itemTime <= queryTime + clickWindow;
                })
                .map(item => ({
                  name: item.product_name || 'מוצר לא ידוע',
                  url: item.product_url || '',
                  source: (item.source || '').toLowerCase()
                }))
                .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);

              // Dominant click source for mobile card
              const mobileSourceCounts = {};
              clickedProducts.forEach(p => { if (p.source && p.source !== 'native') mobileSourceCounts[p.source] = (mobileSourceCounts[p.source] || 0) + 1; });
              const dominantSourceMobile = Object.entries(mobileSourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
              const mobileSourceBg = { 'ai': 'bg-indigo-50', 'zero-results': 'bg-orange-50', 'rerank': 'bg-purple-50', 'inject': 'bg-teal-50' };
              const mobileSourceBorder = { 'ai': 'border-indigo-300', 'zero-results': 'border-orange-300', 'rerank': 'border-purple-300', 'inject': 'border-teal-300' };

              // Boosted product detection for this query
              const boostedShownProductsMobile = deliveredProducts.filter(
                p => boostedProductNamesSet.has(trimAndNormalize(p).toLowerCase())
              );
              const hasBoostedShownMobile = boostedShownProductsMobile.length > 0;

              const hasCartAddition = cartProducts.length > 0;
              const hasPurchase = purchaseProducts.length > 0;
              const hasClick = clickedProducts.length > 0;
              const hasDeliveredProducts = Array.isArray(deliveredProducts) && deliveredProducts.length > 0;
              const isExpanded = expandedQueries[index] || false;

              const toggleExpanded = () => {
                setExpandedQueries(prev => ({
                  ...prev,
                  [index]: !prev[index]
                }));
              };

              // Determine indicator type (complex/upsell/regular)
              const primaryProduct = purchaseProducts[0] || cartProducts[0];
              const indicatorType = getIndicatorType(
                query.query,
                primaryProduct?.name,
                deliveredProducts,
                hasCartAddition || hasPurchase
              );

              // Determine card border color based on indicator type
              // Purchase = always purple, Cart = always green
              let borderColor = 'border-gray-200';
              if (hasPurchase) {
                // Purchase: always purple (complex, upsell, or regular)
                if (indicatorType.type === 'complex') {
                  borderColor = 'border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50';
                } else if (indicatorType.type === 'upsell') {
                  borderColor = 'border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50';
                } else {
                  borderColor = 'border-purple-300 bg-purple-50/30';
                }
              } else if (hasCartAddition) {
                // Cart: always green (complex, upsell, or regular)
                if (indicatorType.type === 'complex') {
                  borderColor = 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50';
                } else if (indicatorType.type === 'upsell') {
                  borderColor = 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50';
                } else {
                  borderColor = 'border-green-300 bg-green-50/30';
                }
              } else if (hasClick) {
                const srcBorder = dominantSourceMobile ? mobileSourceBorder[dominantSourceMobile] : null;
                const srcBg = dominantSourceMobile ? mobileSourceBg[dominantSourceMobile] : null;
                borderColor = `${srcBorder || 'border-blue-200'} ${srcBg || 'bg-blue-50/30'}`;
              }

              return (
                <div key={index} className={`border-2 ${borderColor} rounded-lg p-3 transition-all`}>
                  {/* Query Text with Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm mb-1">{query.query}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(query.timestamp).toLocaleDateString('he-IL')} • {new Date(query.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {hasBoostedShownMobile && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-semibold"
                          title={`${boostedShownProductsMobile.length} מוצר מקודם הוצג`}
                        >
                          ⚡ Boosted
                        </span>
                      )}
                      {hasClick && !hasCartAddition && !hasPurchase && (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full" title="לחיצה על מוצר">
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" />
                          </svg>
                        </span>
                      )}
                      {hasPurchase && (
                        <>
                          {indicatorType.type === 'complex' ? (
                            <div className="relative">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:shadow-[0_0_20px_rgba(147,51,234,0.7)] transition-shadow animate-pulse">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </span>
                              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75"></span>
                              </span>
                            </div>
                          ) : indicatorType.type === 'upsell' ? (
                            <div className="relative">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:shadow-[0_0_20px_rgba(147,51,234,0.7)] transition-shadow animate-pulse">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75"></span>
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-100 rounded-full">
                              <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </>
                      )}
                      {hasCartAddition && !hasPurchase && (
                        <>
                          {indicatorType.type === 'complex' ? (
                            <div className="relative">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-green-600 rounded-full shadow-[0_0_15px_rgba(22,163,74,0.5)] hover:shadow-[0_0_20px_rgba(22,163,74,0.7)] transition-shadow animate-pulse">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </span>
                              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                              </span>
                            </div>
                          ) : indicatorType.type === 'upsell' ? (
                            <div className="relative">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-green-600 rounded-full shadow-[0_0_15px_rgba(22,163,74,0.5)] hover:shadow-[0_0_20px_rgba(22,163,74,0.7)] transition-shadow animate-pulse">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-green-100 rounded-full">
                              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Category Pills */}
                  {query.category && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Array.isArray(query.category)
                        ? query.category.map((cat, i) => (
                          <span key={i} className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">{cat}</span>
                        ))
                        : <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">{query.category}</span>
                      }
                    </div>
                  )}

                  {/* Purchase/Cart Products Info */}
                  {hasPurchase && (
                    <div className={`mb-2 p-2 rounded-lg ${indicatorType.type === 'complex'
                      ? 'bg-purple-50/80 border border-purple-200'
                      : indicatorType.type === 'upsell'
                        ? 'bg-purple-50/80 border border-purple-200'
                        : 'bg-purple-50 border border-purple-200'
                      }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {indicatorType.type === 'complex' ? (
                          <span className="text-[10px] px-2 py-0.5 bg-purple-600 text-white rounded-full font-medium animate-pulse">
                            חיפוש מורכב
                          </span>
                        ) : indicatorType.type === 'upsell' ? (
                          <span className="text-[10px] px-2 py-0.5 bg-purple-600 text-white rounded-full font-medium animate-pulse">
                            Upsell
                          </span>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-xs font-medium text-purple-800">
                          {indicatorType.type === 'complex' || indicatorType.type === 'upsell' ? 'נרכש' : 'נרכש'}
                        </span>
                      </div>
                      <div className="text-xs text-purple-800 space-y-0.5">
                        {purchaseProducts.slice(0, 2).map((product, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1 flex-1">
                              <span>•</span>
                              <span className="flex-1">{product.name}</span>
                            </div>
                            <span className="font-semibold text-purple-700 whitespace-nowrap">
                              ₪{(product.price * product.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {purchaseProducts.length > 2 && (
                          <div className="text-purple-600 font-medium">+{purchaseProducts.length - 2} מוצרים נוספים</div>
                        )}
                      </div>
                    </div>
                  )}

                  {hasCartAddition && !hasPurchase && (
                    <div className={`mb-2 p-2 rounded-lg ${indicatorType.type === 'complex'
                      ? 'bg-green-50/80 border border-green-200'
                      : indicatorType.type === 'upsell'
                        ? 'bg-green-50/80 border border-green-200'
                        : 'bg-green-50 border border-green-200'
                      }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {indicatorType.type === 'complex' ? (
                          <span className="text-[10px] px-2 py-0.5 bg-green-600 text-white rounded-full font-medium animate-pulse">
                            חיפוש מורכב
                          </span>
                        ) : indicatorType.type === 'upsell' ? (
                          <span className="text-[10px] px-2 py-0.5 bg-green-600 text-white rounded-full font-medium animate-pulse">
                            Upsell
                          </span>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-xs font-medium text-green-800">
                          נוסף לעגלה
                        </span>
                      </div>
                      <div className="text-xs text-green-800 space-y-0.5">
                        {cartProducts.slice(0, 2).map((product, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1 flex-1">
                              <span>•</span>
                              <span className="flex-1">{product.name}</span>
                            </div>
                            <span className="font-semibold text-green-700 whitespace-nowrap">
                              ₪{(product.price * product.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {cartProducts.length > 2 && (
                          <div className="text-green-600 font-medium">+{cartProducts.length - 2} מוצרים נוספים</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Clicked Products */}
                  {hasClick && (
                    <div className="mb-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" />
                        </svg>
                        <span className="text-xs font-medium text-blue-800">לחץ על</span>
                      </div>
                      <div className="text-xs text-blue-800 space-y-0.5">
                        {clickedProducts.slice(0, 2).map((product, idx) => (
                          <div key={idx} className="flex items-center gap-1 flex-wrap">
                            <span>•</span>
                            <span className="flex-1">{product.name}</span>
                            {product.source === 'ai' && <span className="inline-flex items-center px-1 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[8px] font-bold">✦ AI</span>}
                            {product.source === 'zero-results' && <span className="inline-flex items-center px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-[8px] font-bold">◎ Zero</span>}
                            {product.source === 'rerank' && <span className="inline-flex items-center px-1 py-0.5 bg-purple-100 text-purple-600 rounded text-[8px] font-bold">↑ Rerank</span>}
                            {product.source === 'inject' && <span className="inline-flex items-center px-1 py-0.5 bg-teal-100 text-teal-600 rounded text-[8px] font-bold">⊕ Inject</span>}
                          </div>
                        ))}
                        {clickedProducts.length > 2 && (
                          <div className="text-blue-600 font-medium">+{clickedProducts.length - 2} מוצרים נוספים</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivered Products Toggle */}
                  {hasDeliveredProducts && (
                    <button
                      onClick={toggleExpanded}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors mb-2"
                    >
                      <span>ראו תוצאות ({deliveredProducts.length})</span>
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}

                  {/* Expanded Products List */}
                  {isExpanded && hasDeliveredProducts && (
                    <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-right">
                      <div className="text-xs font-semibold text-gray-600 mb-1.5">מוצרים שהוצגו:</div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {deliveredProducts.map((productName, idx) => {
                          const isBoosted = boostedProductNamesSet.has(trimAndNormalize(productName).toLowerCase());
                          return (
                            <div key={idx} className={`text-xs text-gray-700 flex items-start gap-1.5 p-1 rounded ${isBoosted ? 'bg-amber-50' : ''}`}>
                              <span className={`mt-0.5 ${isBoosted ? 'text-amber-500' : 'text-gray-400'}`}>•</span>
                              <span className="flex-1">{productName}</span>
                              {isBoosted && (
                                <span className="inline-flex items-center px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-semibold flex-shrink-0">
                                  ⚡
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && !error && filteredQueries.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-auto" dir="rtl">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    שאילתה
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    זמן
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    קטגוריה
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    לחיצה
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    הוספה לעגלה
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    רכישה
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedQueries.map((query, index) => {
                  // Check if this query led to cart addition or purchase and get products
                  const queryText = (query.query || '').toLowerCase().trim();
                  const deliveredProducts = query.deliveredProducts || [];

                  // Create a Set of normalized delivered product names for fast lookup
                  const deliveredProductsSet = new Set(
                    deliveredProducts.map(p => trimAndNormalize(p).toLowerCase())
                  );

                  // Helper function to check if product was in delivered results
                  const wasProductDelivered = (productName) => {
                    if (!productName || deliveredProductsSet.size === 0) return false;
                    return deliveredProductsSet.has(trimAndNormalize(productName).toLowerCase());
                  };

                  const queryTime = new Date(query.timestamp).getTime();
                  const ATTRIBUTION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

                  const cartProducts = cartAnalytics
                    .filter(item => {
                      const itemTime = parseEventTime(item.timestamp || item.created_at);
                      const isMatch = (item.search_query || '').toLowerCase().trim() === queryText;
                      return isMatch &&
                        itemTime >= queryTime &&
                        itemTime <= queryTime + ATTRIBUTION_WINDOW_MS;
                    })
                    .map(item => ({
                      name: item.product_name || 'מוצר לא ידוע',
                      price: item.product_price || 0,
                      quantity: item.quantity || 1
                    }))
                    .filter(product => wasProductDelivered(product.name)) // Only products that were shown
                    .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i); // unique

                  const purchaseProducts = checkoutEvents
                    .filter(item => {
                      const itemTime = parseEventTime(item.timestamp || item.created_at);
                      return (item.search_query || '').toLowerCase().trim() === queryText &&
                        itemTime >= queryTime &&
                        itemTime <= queryTime + ATTRIBUTION_WINDOW_MS;
                    })
                    .flatMap(item => {
                      // Handle products array or direct product_name
                      if (Array.isArray(item.products) && item.products.length > 0) {
                        return item.products.map(p => ({
                          name: p.product_name || p.name || 'מוצר לא ידוע',
                          price: p.product_price || p.price || 0,
                          quantity: p.quantity || 1
                        }));
                      }
                      return [{
                        name: item.product_name || 'מוצר לא ידוע',
                        price: item.product_price || 0,
                        quantity: item.quantity || 1
                      }];
                    })
                    .filter(item => item.name && wasProductDelivered(item.name)) // Only products that were shown
                    .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);

                  // Find click events for this query
                  // Use tight window for inferred clicks (3 min) vs direct attribution (10 min)
                  // Exclude 'native' source — these are ambient page clicks, not Semantix widget clicks
                  const INFERRED_CLICK_WINDOW_MS = 3 * 60 * 1000;
                  const clickedProducts = clickEvents
                    .filter(item => {
                      if ((item.source || '').toLowerCase() === 'native') return false;
                      const itemTime = parseEventTime(item.timestamp || item.created_at);
                      const isInferred = item.query_source === 'inferred_from_recent';
                      const clickWindow = isInferred ? INFERRED_CLICK_WINDOW_MS : ATTRIBUTION_WINDOW_MS;
                      return (item.search_query || '').toLowerCase().trim() === queryText &&
                        itemTime >= queryTime &&
                        itemTime <= queryTime + clickWindow;
                    })
                    .map(item => ({
                      name: item.product_name || 'מוצר לא ידוע',
                      url: item.product_url || '',
                      source: (item.source || '').toLowerCase()
                    }))
                    .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i); // unique

                  // Dominant click source for this query (excludes 'native')
                  const desktopSourceCounts = {};
                  clickedProducts.forEach(p => { if (p.source && p.source !== 'native') desktopSourceCounts[p.source] = (desktopSourceCounts[p.source] || 0) + 1; });
                  const dominantSource = Object.entries(desktopSourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
                  const sourceRowBg = { 'ai': 'bg-indigo-50 hover:bg-indigo-100', 'zero-results': 'bg-orange-50 hover:bg-orange-100', 'rerank': 'bg-purple-50 hover:bg-purple-100', 'inject': 'bg-teal-50 hover:bg-teal-100' };
                  const rowBgClass = sourceRowBg[dominantSource] || 'hover:bg-gray-50';

                  // Boosted product detection for this query
                  const boostedShownProducts = deliveredProducts.filter(
                    p => boostedProductNamesSet.has(trimAndNormalize(p).toLowerCase())
                  );
                  const hasBoostedShown = boostedShownProducts.length > 0;

                  const hasCartAddition = cartProducts.length > 0;
                  const hasPurchase = purchaseProducts.length > 0;
                  const hasClick = clickedProducts.length > 0;
                  const hasDeliveredProducts = Array.isArray(deliveredProducts) && deliveredProducts.length > 0;
                  const isExpanded = expandedQueries[index] || false;

                  const toggleExpanded = () => {
                    setExpandedQueries(prev => ({
                      ...prev,
                      [index]: !prev[index]
                    }));
                  };

                  // Determine indicator type for desktop view
                  const primaryProduct = purchaseProducts[0] || cartProducts[0];
                  const indicatorType = getIndicatorType(
                    query.query,
                    primaryProduct?.name,
                    deliveredProducts,
                    hasCartAddition || hasPurchase
                  );

                  return (
                    <tr
                      key={index}
                      className={`${rowBgClass} transition-colors`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="flex-1">{query.query}</span>
                              {hasBoostedShown && (
                                <span
                                  className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold"
                                  title={`${boostedShownProducts.length} מוצר מקודם הוצג בחיפוש זה`}
                                >
                                  ⚡ Boosted
                                </span>
                              )}
                            </div>
                            {hasDeliveredProducts && (
                              <button
                                onClick={toggleExpanded}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                              >
                                <span>ראו תוצאות</span>
                                <svg
                                  className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                          </div>
                          {isExpanded && hasDeliveredProducts && (
                            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                              <div className="text-xs font-semibold text-gray-600 mb-2">מוצרים שהוצגו ({deliveredProducts.length}):</div>
                              <div className="space-y-1 max-h-60 overflow-y-auto">
                                {deliveredProducts.map((productName, idx) => {
                                  const isBoosted = boostedProductNamesSet.has(trimAndNormalize(productName).toLowerCase());
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors border ${isBoosted ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}
                                    >
                                      <span className={isBoosted ? 'text-amber-500' : 'text-gray-400'}>•</span>
                                      <span className="text-xs text-gray-700 flex-1">{productName}</span>
                                      {isBoosted && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-semibold flex-shrink-0">
                                          ⚡ Boosted
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        {new Date(query.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        {Array.isArray(query.category)
                          ? query.category.map((cat, i) => (
                            <span key={i} className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full mr-1 mb-1">{cat}</span>
                          ))
                          : <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">{query.category}</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        {hasClick ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" />
                              </svg>
                            </span>
                            <div className="text-xs text-gray-700 max-w-[120px] space-y-1 text-center">
                              {clickedProducts.slice(0, 2).map((product, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-0.5">
                                  <div className="text-[10px] text-blue-700 truncate">• {product.name}</div>
                                  {product.source === 'ai' && <span className="inline-flex items-center px-1 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[8px] font-bold">✦ AI</span>}
                                  {product.source === 'zero-results' && <span className="inline-flex items-center px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-[8px] font-bold">◎ Zero</span>}
                                  {product.source === 'rerank' && <span className="inline-flex items-center px-1 py-0.5 bg-purple-100 text-purple-600 rounded text-[8px] font-bold">↑ Rerank</span>}
                                  {product.source === 'inject' && <span className="inline-flex items-center px-1 py-0.5 bg-teal-100 text-teal-600 rounded text-[8px] font-bold">⊕ Inject</span>}
                                </div>
                              ))}
                              {clickedProducts.length > 2 && (
                                <div className="text-[9px] text-blue-400 font-medium">
                                  +{clickedProducts.length - 2} עוד
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-300">–</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {hasCartAddition ? (
                          <div className="flex flex-col items-center gap-2">
                            {indicatorType.type === 'complex' && !hasPurchase ? (
                              <>
                                <div className="relative">
                                  <span className="inline-flex items-center justify-center w-7 h-7 bg-green-600 rounded-full shadow-[0_0_12px_rgba(22,163,74,0.4)] hover:shadow-[0_0_16px_rgba(22,163,74,0.6)] transition-shadow animate-pulse">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </span>
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                                  </span>
                                </div>
                                <span className="text-[9px] font-semibold text-green-600 uppercase tracking-wide">
                                  חיפוש מורכב
                                </span>
                              </>
                            ) : indicatorType.type === 'upsell' && !hasPurchase ? (
                              <>
                                <div className="relative">
                                  <span className="inline-flex items-center justify-center w-7 h-7 bg-green-600 rounded-full shadow-[0_0_12px_rgba(22,163,74,0.4)] hover:shadow-[0_0_16px_rgba(22,163,74,0.6)] transition-shadow animate-pulse">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                                  </span>
                                </div>
                                <span className="text-[9px] font-semibold text-green-600 uppercase tracking-wide">
                                  Upsell
                                </span>
                              </>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                            <div className="text-xs text-gray-700 max-w-xs space-y-1">
                              {cartProducts.slice(0, 2).map((product, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-0.5">
                                  <div className="truncate text-center">• {product.name}</div>
                                  <div className="font-semibold text-green-700 text-[10px]">
                                    ₪{(product.price * product.quantity).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-300">–</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {hasPurchase ? (
                          <div className="flex flex-col items-center gap-2">
                            {indicatorType.type === 'complex' ? (
                              <>
                                <div className="relative">
                                  <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-600 rounded-full shadow-[0_0_12px_rgba(147,51,234,0.4)] hover:shadow-[0_0_16px_rgba(147,51,234,0.6)] transition-shadow animate-pulse">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </span>
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75"></span>
                                  </span>
                                </div>
                                <span className="text-[9px] font-semibold text-purple-600 uppercase tracking-wide">
                                  חיפוש מורכב
                                </span>
                              </>
                            ) : indicatorType.type === 'upsell' ? (
                              <>
                                <div className="relative">
                                  <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-600 rounded-full shadow-[0_0_12px_rgba(147,51,234,0.4)] hover:shadow-[0_0_16px_rgba(147,51,234,0.6)] transition-shadow animate-pulse">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75"></span>
                                  </span>
                                </div>
                                <span className="text-[9px] font-semibold text-purple-600 uppercase tracking-wide">
                                  Upsell
                                </span>
                              </>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full">
                                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                            <div className="text-xs text-gray-700 max-w-xs space-y-1">
                              {purchaseProducts.slice(0, 2).map((product, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-0.5">
                                  <div className="truncate text-center">• {product.name}</div>
                                  <div className="font-semibold text-purple-700 text-[10px]">
                                    ₪{(product.price * product.quantity).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-300">–</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filteredQueries.length > 0 && totalPages > 1 && (
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-100">
            <nav className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="hidden sm:block">
                <p className="text-sm text-gray-700">
                  מציג <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> עד{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredCount)}
                  </span>{" "}
                  מתוך <span className="font-medium">{filteredCount}</span> תוצאות
                </p>
              </div>

              {/* Mobile page indicator */}
              <div className="block sm:hidden text-sm text-gray-700">
                עמוד <span className="font-medium">{currentPage}</span> מתוך <span className="font-medium">{totalPages}</span>
              </div>

              <div className="flex-1 flex justify-center sm:justify-end">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                    } mr-4`}
                >
                  קודם
                </button>

                <div className="hidden md:flex">
                  {paginationNumbers.map(num => (
                    <button
                      key={num}
                      onClick={() => handlePageClick(num)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium mx-1 rounded-md ${currentPage === num
                        ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                    } ml-4`}
                >
                  הבא
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Load More Button - Load additional queries from server */}
        {!loading && !error && hasMoreQueries && (
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-100">
            <div className="flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-gray-600 text-center">
                נטענו <span className="font-medium">{totalLoaded}</span> שאילתות מהשרת
                {filteredCount < totalLoaded && (
                  <span className="block mt-1 text-xs text-gray-500">
                    ({filteredCount} תוצאות אחרי סינון)
                  </span>
                )}
              </p>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${loadingMore ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    טוען עוד שאילתות...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    טען עוד שאילתות
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}



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
  { id: "insights", label: "תובנות עסקיות", link: "/analytics", icon: TrendingUp, external: true },
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

