'use client'
import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  BarChart3, Download, Search, ChevronDown, Calendar,
  TrendingUp, ShoppingCart, DollarSign, MousePointer2, Zap
} from "lucide-react";

// ─── constants used by isComplex / isUpsell ───────────────────────────────────
const simpleCategoryWords = ["יין","וויסקי","וודקה","ג'ין","גין","רום","בירה","ברנדי","קוניאק","ליקר","יין אדום","יין לבן","יין רוזה","רוזה","אדום","לבן"];
const varietalWords = ["שרדונה","מרלו","קברנה","קברנה סוביניון","סוביניון בלאן","ריזלינג","גרנאש","פינו נואר","פינו נויר","שיראז","סירה","מאלבק","טמפרניו","רוסאן","ויונייה","גמאי"];
const contextDescriptors = ["שמתאים","לחתונה","למסיבה","לאירוע","לארוחה","עם","ליד","טוב עם","מתאים עם","יבש","חצי יבש","קליל","מרענן","חגיגי","מינרלי"];
const attributeDescriptors = ["כשר","טבעוני","אורגני","יין טבעי","ללא אלכוהול","נטול אלכוהול","0%"];
const tasteDescriptors = ["אדל פלאוור","אבטיח","פסיפלורה","ליצ׳י","דובדבן","פירותי","תפוח","אגס","שזיף","ענבים","לימון","תות","אשכולית","אננס","מנגו","קוקוס","בננה","קפה","קקאו","דבש","וניל","שוקולד"];
const spiritStyleDescriptors = ["לבן","כהה","בהיר","שחור","spiced","מיושן","gold","silver","בלנד","סינגל מאלט"];
const spiritCategories = ["וויסקי","ויסקי","רום","וודקה","ג'ין","גין","ליקר","טקילה","ברנדי","קוניאק"];
const geoCountries = ["ישראל","צרפת","איטליה","ספרד","פורטוגל","גרמניה","גרמני","ארגנטינה","צ׳ילה","צילה","אוסטרליה","דרום אפריקה","ארה״ב","ארהב","קליפורניה","מרוקו","יוון","גאורגיה","אוסטריה","הונגריה","יפן","japan","שבלי","בורגון","טוסקנה"];
const geoAdjectives = ["יפני","איטלקי","צרפתי","ספרדי","ישראלי","פורטוגלי","גרמני","ארגנטינאי","מרוקאי","יווני","גאורגי","אוסטרלי","הונגרי","אוסטרי","אמריקאי","קליפורני","צ׳יליאני","ציליאני"];
const specialEditionPhrases = ["ספיישל","אדישן","מהדורה","סדרה","חדש","חדשים","מבצע"];
const brandPhrases = ["יין רמונים","יין קטן"];
const dealRegex = /\d+\s?ב[-\s]?\s?\d+/;
const currencyRegex = /\d+\s?(?:שח|₪)/i;
const rangeRegex = /(?:עד|מעל|מתחת|פחות|יותר|בין|ב-|מ-)\s*(?:מ|ל)?[-\s]?\s*\d+/i;
const skuPattern = /\d+\s*(?:קברנה|שרדונה|מרלו|סוביניון|מדבר|רום|וויסקי|ויסקי)/;
const glenCanonical = "גלן פידיך";
const knownBrandsWithTypos = [
  { correct:"מקאלן", typos:["מק קלאן","מקלאן","מקאללן","מאקלן"] },
  { correct:"גלנפידיך", typos:["גלן פיביך","גלןפדיך","גלן פידח","גלאן פידיך","גלן פידיק","גלן פידיץ"] },
  { correct:"ג'וני ווקר", typos:["ג'וני וו קר","ג'וני וואקר","ג'וני וו אקר","ג'אני ווקר"] },
  { correct:"לפרויג", typos:["לה פרויג","לפרואיג","לאפרויג","laphraoig","laphroaig"] },
  { correct:"טליסקר", typos:["טאליסקר","טליסקאר","taliskar","taliker"] },
  { correct:"ארדבג", typos:["ארד בג","ארדביג","ארדבאג","ardbeg"] },
];
const allTyposSet = new Set();
knownBrandsWithTypos.forEach(b => b.typos.forEach(t => allTyposSet.add(t.toLowerCase())));

const commonTransliterations = [
  { en:"shiraz", he:["שירז","שיראז"] }, { en:"cabernet", he:["קברנה"] },
  { en:"merlot", he:["מרלו"] }, { en:"chardonnay", he:["שרדונה"] },
  { en:"talisker", he:["טליסקר"] }, { en:"macallan", he:["מקאלן"] },
  { en:"glenfiddich", he:["גלנפידיך"] }, { en:"vodka", he:["וודקה"] },
  { en:"whiskey", he:["וויסקי","ויסקי"] }, { en:"whisky", he:["וויסקי","ויסקי"] },
  { en:"gin", he:["ג'ין","גין"] }, { en:"rum", he:["רום"] },
  { en:"rose", he:["רוזה"] }, { en:"blanc", he:["בלאן"] },
  { en:"chateau", he:["שאטו"] }, { en:"castel", he:["קסטל"] },
];

// ─── Utility functions ────────────────────────────────────────────────────────
function trimAndNormalize(v = "") { return v.toString().replace(/\s+/g, " ").trim(); }
function containsAny(q, list) { return list.some(t => q.includes(t.toLowerCase())); }
function levenshtein(a, b) {
  const la = a.length, lb = b.length;
  if (!la) return lb; if (!lb) return la;
  const m = Array.from({length:la+1}, () => new Array(lb+1).fill(0));
  for (let i=0;i<=la;i++) m[i][0]=i;
  for (let j=0;j<=lb;j++) m[0][j]=j;
  for (let i=1;i<=la;i++) for (let j=1;j<=lb;j++) {
    const c = a[i-1]===b[j-1]?0:1;
    m[i][j]=Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+c);
  }
  return m[la][lb];
}
function hasCategoryGeoPhrase(q) {
  return ["יין","וויסקי","ויסקי","וודקה","בירה","ברנדי","קוניאק","ליקר","ג'ין","גין","טקילה","רום"]
    .some(cat => geoAdjectives.some(adj => q.includes(`${cat} ${adj}`)));
}
function isPureEnglish(q) { return /^[a-z0-9\s'"-]+$/i.test(q); }
function hasSignificantTypo(q) { const l=q.toLowerCase().trim(); for(const t of allTyposSet) if(l.includes(t)) return true; return false; }
function normalizePrice(p) {
  if(p==null) return 0;
  const v = typeof p==="number" ? p : parseFloat(p.toString().replace(/[^0-9.,]/g,"").replace(/,/g,""));
  return Number.isFinite(v)?v:0;
}
function isTransliteration(t1, t2) {
  const a=t1.toLowerCase().trim(), b=t2.toLowerCase().trim();
  if(!a||!b) return false;
  const aEn=/[a-z]/.test(a), bHe=/[֐-׿]/.test(b), bEn=/[a-z]/.test(b), aHe=/[֐-׿]/.test(a);
  if(!((aEn&&bHe)||(bEn&&aHe))) return false;
  for(const tr of commonTransliterations) {
    const en=tr.en.toLowerCase();
    if(aEn&&bHe&&a.includes(en)&&tr.he.some(h=>b.includes(h))) return true;
    if(bEn&&aHe&&b.includes(en)&&tr.he.some(h=>a.includes(h))) return true;
  }
  return false;
}
function parseEventTime(ts) {
  if(!ts) return 0;
  if(typeof ts==="number") return ts<10000000000?ts*1000:ts;
  const p=new Date(ts).getTime();
  if(!isNaN(p)){if(!isNaN(Number(ts))&&Number(ts)<10000000000) return Number(ts)*1000; return p;}
  return 0;
}
function isComplex(query) {
  const n=trimAndNormalize(query); if(!n) return false;
  const l=n.toLowerCase();
  if(simpleCategoryWords.includes(l)) return false;
  if(varietalWords.includes(l)) return false;
  if(skuPattern.test(l)) return false;
  if(isPureEnglish(l)&&!l.includes(" ")) return false;
  if(hasSignificantTypo(l)) return true;
  if(containsAny(l,contextDescriptors)) return true;
  if(currencyRegex.test(l)) return true;
  if(rangeRegex.test(l)) return true;
  if(dealRegex.test(l)) return true;
  if(/(?:מחיר|במחיר|עולה|עד|מעל|מתחת|פחות|יותר|בתקציב|תקציב|ב-|זול|יקר)\s*(?:של|מ)?[-\s]?\s*\d+/i.test(l)) return true;
  if(containsAny(l,attributeDescriptors)) return true;
  if(containsAny(l,geoCountries)) return true;
  if(["mud house","mudhouse","mud-house"].some(v=>l.includes(v))) return true;
  if(["new zealand","newzealand","ניו זילנד"].some(v=>l.includes(v))) return true;
  if(hasCategoryGeoPhrase(l)) return true;
  if(containsAny(l,tasteDescriptors)) return true;
  if(containsAny(l,brandPhrases.map(p=>p.toLowerCase()))) return true;
  if(containsAny(l,["גלן","glen"])){
    const gv=["גלן פיביך","גלןפדיך","גלן פידח","גלנפידיך","גלאן פידיך","גלן פידיק","glenfiddich"];
    if(containsAny(l,gv)) return true;
    if(levenshtein(l.replace(/\s+/g,""),glenCanonical.replace(/\s+/g,"").toLowerCase())<=2) return true;
  }
  if(containsAny(l,specialEditionPhrases.map(p=>p.toLowerCase()))) return true;
  const hasSS=spiritStyleDescriptors.some(d=>l.includes(d.toLowerCase()));
  const hasSC=spiritCategories.some(c=>l.includes(c.toLowerCase()));
  if(hasSS&&hasSC) return true;
  if(/[a-z]/i.test(l)) return true;
  return false;
}
function isUpsell(query, productName, deliveredProducts) {
  if(!query||!productName||!deliveredProducts||deliveredProducts.length===0) return false;
  const nq=trimAndNormalize(query).toLowerCase(), np=trimAndNormalize(productName).toLowerCase();
  const inResults=deliveredProducts.some(p=>trimAndNormalize(p).toLowerCase()===np);
  if(!inResults) return false;
  if(isTransliteration(nq,np)) return false;
  const qw=nq.split(/\s+/).filter(w=>w.length>2&&!["עם","של","עד","מעל","מתחת","עבור","with","for","and","the"].includes(w));
  const pw=np.split(/\s+/).filter(w=>w.length>2);
  for(const a of qw) for(const b of pw) if(isTransliteration(a,b)) return false;
  if(qw.length>0&&qw.every(w=>np.includes(w))) return false;
  for(const a of qw) for(const b of pw) {
    const aE=/^[a-z0-9\s'"-]+$/i.test(a), bE=/^[a-z0-9\s'"-]+$/i.test(b);
    const aH=/[֐-׿]/.test(a), bH=/[֐-׿]/.test(b);
    if((aE&&bE)||(aH&&bH)){
      const mx=a.length<=5?2:3;
      if(levenshtein(a,b)<=mx) return false;
      if(a.length>=4&&b.length>=4&&(a.includes(b)||b.includes(a))) return false;
    }
  }
  return true;
}
function getIndicatorType(query, productName, deliveredProducts, hasPurchaseOrCart) {
  if(!hasPurchaseOrCart) return {type:'regular',isSpecial:false};
  if(isComplex(query)) return {type:'complex',isSpecial:true};
  if(productName&&isTransliteration(query,productName)) return {type:'complex',isSpecial:true};
  if(productName&&isUpsell(query,productName,deliveredProducts)) return {type:'upsell',isSpecial:true};
  return {type:'regular',isSpecial:false};
}
function formatCurrency(v) {
  return `₪${(v||0).toLocaleString("he-IL",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    emerald: { iconBg:"bg-emerald-400/20", iconText:"text-emerald-300", val:"text-white", sub:"text-emerald-300" },
    blue:    { iconBg:"bg-blue-400/20",    iconText:"text-blue-300",    val:"text-white", sub:"text-blue-300" },
    cyan:    { iconBg:"bg-cyan-400/20",    iconText:"text-cyan-300",    val:"text-white", sub:"text-cyan-300" },
    purple:  { iconBg:"bg-purple-400/20",  iconText:"text-purple-300",  val:"text-white", sub:"text-purple-300" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/8 border border-white/10 p-5 backdrop-blur-sm hover:bg-white/12 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-8 h-8 ${c.iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${c.iconText}`} />
          </div>
          <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">{label}</span>
        </div>
        <p className={`text-3xl font-black tabular-nums tracking-tight ${c.val}`}>{value}</p>
        {sub && <p className={`text-xs font-medium mt-1.5 ${c.sub}`}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, iconColor = "from-indigo-500 to-purple-600", children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/60 to-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 bg-gradient-to-br ${iconColor} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FunnelStep({ label, count, pct, color, isLast }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-500">{label}</span>
          <span className="text-xs font-bold text-gray-700 tabular-nums">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-8 rounded-lg bg-gray-100 overflow-hidden">
          <div
            className={`h-full ${color} rounded-lg transition-all duration-700`}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
        <p className="text-center text-sm font-bold text-gray-800 mt-1.5 tabular-nums">{count.toLocaleString('he-IL')}</p>
      </div>
      {!isLast && (
        <div className="hidden lg:flex text-gray-300 text-lg font-light self-center absolute">→</div>
      )}
    </div>
  );
}

function MetricBlock({ label, value, badge, color, children, expanded, onToggle }) {
  const palettes = {
    indigo: { border:"border-indigo-200", bg:"bg-indigo-50/60", icon:"from-indigo-500 to-purple-600", val:"text-indigo-900", badge:"bg-indigo-100 text-indigo-700", btn:"text-indigo-600 hover:bg-indigo-100" },
    green:  { border:"border-emerald-200", bg:"bg-emerald-50/60", icon:"from-green-500 to-emerald-600", val:"text-emerald-900", badge:"bg-emerald-100 text-emerald-700", btn:"text-emerald-600 hover:bg-emerald-100" },
    blue:   { border:"border-blue-200", bg:"bg-blue-50/60", icon:"from-blue-500 to-cyan-600", val:"text-blue-900", badge:"bg-blue-100 text-blue-700", btn:"text-blue-600 hover:bg-blue-100" },
    amber:  { border:"border-amber-200", bg:"bg-amber-50/60", icon:"from-amber-500 to-orange-500", val:"text-amber-900", badge:"bg-amber-100 text-amber-700", btn:"text-amber-600 hover:bg-amber-100" },
    orange: { border:"border-orange-200", bg:"bg-orange-50/60", icon:"from-orange-500 to-red-500", val:"text-orange-900", badge:"bg-orange-100 text-orange-700", btn:"text-orange-600 hover:bg-orange-100" },
    purple: { border:"border-purple-200", bg:"bg-purple-50/60", icon:"from-purple-500 to-indigo-600", val:"text-purple-900", badge:"bg-purple-100 text-purple-700", btn:"text-purple-600 hover:bg-purple-100" },
  };
  const p = palettes[color] || palettes.indigo;
  return (
    <div className={`rounded-2xl border ${p.border} ${p.bg} overflow-hidden`}>
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-2xl font-black tabular-nums ${p.val}`}>{value}</p>
          {badge && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badge.map((b, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${p.badge}`}>{b}</span>
              ))}
            </div>
          )}
        </div>
        {onToggle && (
          <button onClick={onToggle} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${p.btn}`}>
            {expanded ? "הסתר" : "פרטים"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {expanded && children && (
        <div className="border-t border-current border-opacity-10 bg-white/60">
          {children}
        </div>
      )}
    </div>
  );
}

function QueryBadge({ type }) {
  if (type === 'complex') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-purple-600 text-white rounded-full">✦ מורכב</span>
  );
  if (type === 'upsell') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">↑ Upsell</span>
  );
  return null;
}

function SourceBadge({ source }) {
  const map = {
    ai:           "bg-indigo-100 text-indigo-700",
    "zero-results":"bg-orange-100 text-orange-700",
    rerank:       "bg-purple-100 text-purple-700",
    inject:       "bg-teal-100 text-teal-700",
  };
  const labels = { ai:"✦ AI", "zero-results":"◎ Zero", rerank:"↑ Rerank", inject:"⊕ Inject" };
  if (!map[source]) return null;
  return <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full ${map[source]}`}>{labels[source]}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalyticsPanel({ session, onboarding }) {
  const onboardDB = onboarding?.credentials?.dbName || onboarding?.dbName || "";

  const [queries, setQueries]                   = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState("");
  const [hasMoreQueries, setHasMoreQueries]     = useState(false);
  const [loadingMore, setLoadingMore]           = useState(false);
  const [cartAnalytics, setCartAnalytics]       = useState([]);
  const [loadingCart, setLoadingCart]           = useState(false);
  const [cartError, setCartError]               = useState("");
  const [clickedProductsDrawerOpen, setClickedProductsDrawerOpen] = useState(false);
  const [zeroResultsCart, setZeroResultsCart]   = useState({count:0,sessions:0,value:0,items:[]});
  const [zeroResultsCheckout, setZeroResultsCheckout] = useState({count:0,value:0,items:[]});
  const [zeroResultsExpanded, setZeroResultsExpanded] = useState(false);
  const [injectCart, setInjectCart]             = useState({count:0,sessions:0,value:0,items:[]});
  const [injectCheckout, setInjectCheckout]     = useState({count:0,value:0,items:[]});
  const [injectExpanded, setInjectExpanded]     = useState(false);
  const [checkoutEvents, setCheckoutEvents]     = useState([]);
  const [loadingCheckout, setLoadingCheckout]   = useState(false);
  const [checkoutError, setCheckoutError]       = useState("");
  const [clickEvents, setClickEvents]           = useState([]);
  const [loadingClicks, setLoadingClicks]       = useState(false);
  const [clickError, setClickError]             = useState("");
  const [boostedProducts, setBoostedProducts]   = useState([]);
  const [cartDetailsExpanded, setCartDetailsExpanded]         = useState(false);
  const [checkoutDetailsExpanded, setCheckoutDetailsExpanded] = useState(false);
  const [clickDetailsExpanded, setClickDetailsExpanded]       = useState(false);
  const [exposureDetailsExpanded, setExposureDetailsExpanded] = useState(false);
  const [semantixExpanded, setSemantixExpanded] = useState(false);
  const [upsellExpanded, setUpsellExpanded]     = useState(false);
  const [expandedQueries, setExpandedQueries]   = useState({});
  const [filters, setFilters]                   = useState({category:"",type:"",minPrice:"",maxPrice:""});
  const [categoryOptions, setCategoryOptions]   = useState([]);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate]         = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [timePeriodOpen, setTimePeriodOpen]         = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("7d");

  const timePeriods = [
    { value:"today", label:"היום",           days:0   },
    { value:"7d",    label:"7 ימים אחרונים", days:7   },
    { value:"30d",   label:"30 ימים אחרונים",days:30  },
    { value:"90d",   label:"90 ימים אחרונים",days:90  },
    { value:"1y",    label:"שנה אחרונה",     days:365 },
    { value:"all",   label:"כל הנתונים",     days:null},
  ];

  const handleTimePeriodChange = (period) => {
    setSelectedTimePeriod(period.value);
    setTimePeriodOpen(false);
    if (period.value === "all") { setStartDate(""); setEndDate(""); }
    else if (period.value === "today") {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today); setEndDate(today);
    } else if (period.days !== null) {
      const end = new Date(), start = new Date();
      start.setDate(start.getDate() - period.days);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };
  const getCurrentTimePeriodLabel = () => timePeriods.find(p => p.value === selectedTimePeriod)?.label || "כל הנתונים";

  useEffect(() => {
    const h = (e) => { if (e.key==='Escape') setTimePeriodOpen(false); };
    if (timePeriodOpen) { document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }
  }, [timePeriodOpen]);

  // Fetch all analytics
  useEffect(() => {
    if (!onboardDB) return;
    const fetchAll = async () => {
      try {
        setLoading(true); setLoadingCart(true); setLoadingCheckout(true); setLoadingClicks(true);
        setError(""); setCartError(""); setCheckoutError(""); setClickError("");
        const payload = { dbName:onboardDB, startDate:startDate||null, endDate:endDate||null };
        const [qRes, perfRes, boostRes] = await Promise.all([
          fetch("/api/analytics/queries",         {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),
          fetch("/api/analytics/performance",     {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),
          fetch("/api/analytics/boosted-products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dbName:onboardDB})}),
        ]);
        const qData = await qRes.json();
        const perfData = await perfRes.json();
        const boostData = await boostRes.json();
        if (!qRes.ok)    throw new Error(qData.error    || "Failed to fetch queries");
        if (!perfRes.ok) throw new Error(perfData.error || "Failed to fetch performance");
        setQueries(qData.queries || []); setHasMoreQueries(false);
        setCartAnalytics(perfData.cart || []);
        setCheckoutEvents(perfData.checkout || []);
        setZeroResultsCart({ count:perfData.zeroResultsCartCount||0, sessions:perfData.zeroResultsCartSessions||0, value:perfData.zeroResultsCartValue||0, items:perfData.zeroResultsItems||[] });
        setZeroResultsCheckout({ count:perfData.zeroResultsCheckoutCount||0, value:perfData.zeroResultsCheckoutValue||0, items:perfData.zeroResultsCheckoutItems||[] });
        setInjectCart({ count:perfData.injectCartCount||0, sessions:perfData.injectCartSessions||0, value:perfData.injectCartValue||0, items:perfData.injectItems||[] });
        setInjectCheckout({ count:perfData.injectCheckoutCount||0, value:perfData.injectCheckoutValue||0, items:perfData.injectCheckoutItems||[] });
        setBoostedProducts(boostData.boostedProducts || []);
      } catch (err) { console.error(err); setError(err.message); }
      finally { setLoading(false); setLoadingCart(false); setLoadingCheckout(false); setLoadingClicks(false); }
    };
    fetchAll();
  }, [onboardDB, startDate, endDate]);

  // Clicks (separate fetch, no date filter)
  useEffect(() => {
    if (!onboardDB) return;
    (async () => {
      setLoadingClicks(true); setClickError("");
      try {
        const res = await fetch("/api/cart-analytics", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dbName:onboardDB,type:"clicks"})});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error fetching clicks");
        setClickEvents(data.clickEvents || []);
      } catch (err) { setClickError(err.message); }
      finally { setLoadingClicks(false); }
    })();
  }, [onboardDB]);

  useEffect(() => {
    const cats = [];
    queries.forEach(q => {
      if (typeof q.category==="string" && q.category.trim()) cats.push(q.category.trim().toLowerCase());
      else if (Array.isArray(q.category)) q.category.forEach(c => { if (typeof c==="string" && c.trim()) cats.push(c.trim().toLowerCase()); });
    });
    setCategoryOptions([...new Set(cats)].map(c => c.charAt(0).toUpperCase()+c.slice(1)));
  }, [queries]);

  const filteredQueries = queries.filter(q => {
    let match = true;
    if (filters.category) {
      const sel = filters.category.toLowerCase();
      if (typeof q.category==="string") { if (q.category.trim().toLowerCase()!==sel) match=false; }
      else if (Array.isArray(q.category)) { if (!q.category.some(c=>typeof c==="string"&&c.trim().toLowerCase()===sel)) match=false; }
      else match=false;
    }
    if (filters.type && q.type!==filters.type) match=false;
    if (filters.minPrice && q.price<parseFloat(filters.minPrice)) match=false;
    if (filters.maxPrice && q.price>parseFloat(filters.maxPrice)) match=false;
    if (startDate||endDate) {
      const qd=new Date(q.timestamp);
      if (startDate && qd<new Date(startDate)) match=false;
      if (endDate) { const e=new Date(endDate); e.setDate(e.getDate()+1); if(qd>e) match=false; }
    }
    return match;
  });

  const totalLoaded = queries.length;
  const filteredCount = filteredQueries.length;
  const totalPages = Math.ceil(filteredCount / itemsPerPage);
  const displayedQueries = filteredQueries.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

  const maxPageButtons=5;
  let startPage=Math.max(1,currentPage-2), endPage=Math.min(totalPages,currentPage+2);
  if (totalPages>maxPageButtons) {
    if (currentPage<=3) { startPage=1; endPage=maxPageButtons; }
    else if (currentPage>=totalPages-2) { startPage=totalPages-maxPageButtons+1; endPage=totalPages; }
  } else { startPage=1; endPage=totalPages; }
  const paginationNumbers=[];
  for(let i=startPage;i<=endPage;i++) paginationNumbers.push(i);

  // Cart metrics useMemo
  const cartMetrics = useMemo(() => {
    if (!queries.length) return {conversionRate:0,totalCartItems:0,topQueries:[],totalRevenue:0,totalRevenueFromCart:0,totalConversions:0,uniqueProducts:0,boostedExposure:[],topClickedProducts:[],addToCartMetrics:{items:0,revenue:0,queries:[],uniqueProducts:0},checkoutMetrics:{items:0,revenue:0,queries:[],uniqueProducts:0},clickMetrics:{items:0,aiClicks:0,zeroResultsClicks:0,rerankClicks:0,injectClicks:0,queries:[],uniqueProducts:0,topClickedProducts:[]}};
    const totalCartItems=cartAnalytics.length, totalQueries=queries.length;
    const conversionRate=totalQueries>0?((totalCartItems/totalQueries)*100).toFixed(2):0;
    const addToCartGroups={}, checkoutGroups={}, clickGroups={}, productClickCounts={};
    let aiClicksTotal=0, zeroResultsClicksTotal=0, rerankClicksTotal=0, injectClicksTotal=0;
    cartAnalytics.forEach(item => {
      if (!item.search_query) return;
      if (!addToCartGroups[item.search_query]) addToCartGroups[item.search_query]={query:item.search_query,count:0,products:new Set(),revenue:0};
      addToCartGroups[item.search_query].count+=1; addToCartGroups[item.search_query].products.add(item.product_id);
      if (item.product_price) { const p=parseFloat(String(item.product_price).replace(/[^0-9.]/g,'')); if(!isNaN(p)) addToCartGroups[item.search_query].revenue+=p*(item.quantity||1); }
    });
    const checkoutProductGroups={};
    function addToCheckoutProducts(name, price, qty) {
      if (!name) return;
      if (!checkoutProductGroups[name]) checkoutProductGroups[name]={name,count:0,revenue:0};
      checkoutProductGroups[name].count+=1;
      const p=parseFloat(String(price||'0').replace(/[^0-9.]/g,''));
      if(!isNaN(p) && p>0) checkoutProductGroups[name].revenue+=p*(qty||1);
    }
    checkoutEvents.forEach(item => {
      if (item.search_query) {
        if (!checkoutGroups[item.search_query]) checkoutGroups[item.search_query]={query:item.search_query,count:0,products:new Set(),revenue:0};
        checkoutGroups[item.search_query].count+=1; checkoutGroups[item.search_query].products.add(item.product_id);
        if (item.cart_total) { const p=parseFloat(item.cart_total.toString().replace(/[^0-9.]/g,'')); if(!isNaN(p)) checkoutGroups[item.search_query].revenue+=p; }
        else if (item.product_price) { const p=parseFloat(String(item.product_price).replace(/[^0-9.]/g,'')); if(!isNaN(p)) checkoutGroups[item.search_query].revenue+=p*(item.quantity||1); }
      }
      // Group by product name — handle top-level or nested arrays
      const topName = item.product_name || item.name || item.product || null;
      if (topName) {
        const rev = item.cart_total || item.product_price || 0;
        addToCheckoutProducts(topName, rev, item.quantity||1);
      } else {
        const subItems = (Array.isArray(item.products)?item.products:[]).concat(Array.isArray(item.cart_items)?item.cart_items:[]);
        subItems.forEach(p => addToCheckoutProducts(p.product_name||p.name||p.title||null, p.price||p.product_price||0, p.quantity||1));
      }
    });
    clickEvents.forEach(item => {
      if (!item.search_query) return;
      const src=(item.source||'').toLowerCase();
      if(src==='ai') aiClicksTotal++; if(src==='zero-results') zeroResultsClicksTotal++; if(src==='rerank') rerankClicksTotal++; if(src==='inject') injectClicksTotal++;
      if (!clickGroups[item.search_query]) clickGroups[item.search_query]={query:item.search_query,count:0,aiCount:0,zeroResultsCount:0,rerankCount:0,injectCount:0,products:new Set()};
      clickGroups[item.search_query].count+=1;
      if(src==='ai') clickGroups[item.search_query].aiCount+=1;
      if(src==='zero-results') clickGroups[item.search_query].zeroResultsCount+=1;
      if(src==='rerank') clickGroups[item.search_query].rerankCount+=1;
      if(src==='inject') clickGroups[item.search_query].injectCount+=1;
      if (item.product_id) {
        clickGroups[item.search_query].products.add(item.product_id);
        const pId=item.product_id;
        if (!productClickCounts[pId]) productClickCounts[pId]={id:pId,name:item.product_name||item.name||"מוצר לא ידוע",clicks:0,aiClicks:0};
        productClickCounts[pId].clicks+=1; if(src==='ai') productClickCounts[pId].aiClicks+=1;
      }
    });
    const exposureCounts={};
    queries.forEach(q => {
      if (q.deliveredProducts&&Array.isArray(q.deliveredProducts)) q.deliveredProducts.forEach(pn => {
        const nn=trimAndNormalize(pn).toLowerCase();
        if (!exposureCounts[nn]) exposureCounts[nn]={name:pn,exposure:0};
        exposureCounts[nn].exposure+=1;
      });
    });
    const boostedExposure=boostedProducts.map(bp => {
      const nn=trimAndNormalize(bp.name).toLowerCase();
      const exp=exposureCounts[nn]||{exposure:0};
      const clk=Object.values(productClickCounts).find(c=>trimAndNormalize(c.name).toLowerCase()===nn)||{clicks:0};
      return {...bp,exposure:exp.exposure,clicks:clk.clicks};
    }).sort((a,b)=>b.exposure-a.exposure);
    const topClickedProducts=Object.values(productClickCounts).sort((a,b)=>b.clicks-a.clicks).slice(0,10);
    const topAddToCartQueries=Object.values(addToCartGroups).map(g=>({...g,products:Array.from(g.products).length})).sort((a,b)=>b.count-a.count).slice(0,10);
    const topCheckoutQueries=Object.values(checkoutGroups).map(g=>({...g,products:Array.from(g.products).length})).sort((a,b)=>b.count-a.count).slice(0,10);
    const topClickQueries=Object.values(clickGroups).map(g=>({...g,products:Array.from(g.products).length})).sort((a,b)=>b.count-a.count).slice(0,10);

    // AI-only cart cross-reference: cart items whose session+product had an AI click
    const aiClickKeys = new Set(
      clickEvents.filter(e=>(e.source||'').toLowerCase()==='ai' && e.session_id && e.product_id)
        .map(e=>`${e.session_id}:${String(e.product_id)}`)
    );
    const aiCartItems = cartAnalytics.filter(i =>
      i.session_id && i.product_id && aiClickKeys.has(`${i.session_id}:${String(i.product_id)}`)
    );
    const aiCartRevenue = aiCartItems.reduce((s,i)=>{
      const p=parseFloat(String(i.product_price||i.price||'0').replace(/[^0-9.]/g,''));
      return s+(isNaN(p)?0:p*(i.quantity||1));
    },0);
    const aiCartQueryGroups={};
    aiCartItems.forEach(i=>{
      if(!i.search_query) return;
      if(!aiCartQueryGroups[i.search_query]) aiCartQueryGroups[i.search_query]={query:i.search_query,count:0,revenue:0};
      aiCartQueryGroups[i.search_query].count++;
      const p=parseFloat(String(i.product_price||i.price||'0').replace(/[^0-9.]/g,''));
      if(!isNaN(p)) aiCartQueryGroups[i.search_query].revenue+=p*(i.quantity||1);
    });
    const topAiCartQueries=Object.values(aiCartQueryGroups).sort((a,b)=>b.count-a.count).slice(0,10);

    const totalRevenueFromAddToCart=cartAnalytics.reduce((s,i)=>{if(i.product_price){const p=parseFloat(String(i.product_price).replace(/[^0-9.]/g,''));if(!isNaN(p))return s+p*(i.quantity||1);}return s;},0);
    const totalRevenueFromCheckout=checkoutEvents.reduce((s,i)=>{if(i.cart_total){const p=parseFloat(i.cart_total.toString().replace(/[^0-9.]/g,''));if(!isNaN(p))return s+p;}else if(i.product_price){const p=parseFloat(String(i.product_price).replace(/[^0-9.]/g,''));if(!isNaN(p))return s+p*(i.quantity||1);}return s;},0);
    const totalRevenue=topAddToCartQueries.reduce((s,q)=>s+q.revenue,0);
    const totalConversions=cartAnalytics.length;
    const totalRevenueFromCart=totalRevenueFromAddToCart+totalRevenueFromCheckout;
    const allUniqueProducts=new Set(); cartAnalytics.forEach(i=>{if(i.product_id)allUniqueProducts.add(i.product_id);});
    return {
      conversionRate,totalCartItems,topQueries:topAddToCartQueries,totalRevenue,totalRevenueFromCart,totalConversions,uniqueProducts:allUniqueProducts.size,boostedExposure,topClickedProducts,
      addToCartMetrics:{items:cartAnalytics.length,revenue:totalRevenueFromAddToCart,queries:topAddToCartQueries,uniqueProducts:new Set(cartAnalytics.map(i=>i.product_id)).size},
      aiCartMetrics:{items:aiCartItems.length,revenue:aiCartRevenue,queries:topAiCartQueries,uniqueProducts:new Set(aiCartItems.map(i=>i.product_id)).size},
      checkoutMetrics:{items:checkoutEvents.length,revenue:totalRevenueFromCheckout,queries:topCheckoutQueries,uniqueProducts:new Set(checkoutEvents.map(i=>i.product_id)).size,topProducts:Object.values(checkoutProductGroups).sort((a,b)=>b.count-a.count).slice(0,15)},
      clickMetrics:{items:clickEvents.length,aiClicks:aiClicksTotal,zeroResultsClicks:zeroResultsClicksTotal,rerankClicks:rerankClicksTotal,injectClicks:injectClicksTotal,queries:topClickQueries,uniqueProducts:new Set(clickEvents.map(i=>i.product_id)).size,topClickedProducts},
    };
  }, [cartAnalytics, checkoutEvents, clickEvents, queries, boostedProducts]);

  // semantixFunnel useMemo (preserved from original)
  const semantixFunnel = useMemo(() => {
    const useCheckout=checkoutEvents&&checkoutEvents.length>0;
    const dataSource=useCheckout?checkoutEvents:cartAnalytics, mode=useCheckout?'checkout':'cart';
    if (!dataSource||dataSource.length===0) return {totals:{revenue:0,orders:0,items:0},weekly:[],daily:[],byQueryProduct:[],hasData:false,mode};
    // Helper: extract flat product entries from a checkout event
    function expandEvent(e) {
      if (!isComplex(e.search_query||"")) return [];
      const ts=parseEventTime(e.timestamp||e.created_at);
      const eventDate=ts?new Date(ts):null;
      const base={searchQuery:e.search_query,orderId:e.order_id||null,eventDate};
      // Top-level single product
      if(e.product_name||e.product||e.name) {
        const qty=e.quantity||1;
        let rev; if(mode==='checkout'){const ct=normalizePrice(e.cart_total??0);rev=ct>0?ct:normalizePrice(e.product_price??0)*qty;}else{rev=normalizePrice(e.product_price??0)*qty;}
        return [{...base,productName:e.product_name||e.product||e.name,quantity:qty,revenue:rev}];
      }
      // Nested products array
      const subItems=(Array.isArray(e.products)&&e.products.length>0?e.products:null)||(Array.isArray(e.cart_items)&&e.cart_items.length>0?e.cart_items:null);
      if(subItems&&subItems.length>0&&subItems.length<=6) {
        return subItems.map(p=>{
          const pn=p.product_name||p.name||p.title||"לא ידוע";
          const qty=p.quantity||1;
          const rev=normalizePrice(p.price??p.product_price??0)*qty;
          return {...base,productName:pn,quantity:qty,revenue:rev};
        });
      }
      return [];
    }
    const complexPurchases=dataSource.flatMap(expandEvent);
    if (!complexPurchases.length) return {totals:{revenue:0,orders:0,items:0},weekly:[],daily:[],byQueryProduct:[],hasData:false,mode};

    // Deduplicate: same product in the same order (checkout_initiated + completed both fire)
    // Key: orderId+productName when orderId exists, else productName+query+30-min bucket
    const deduped = [];
    const seen = new Map();
    for (const e of complexPurchases) {
      let key;
      if (e.orderId) {
        key = `order:${e.orderId}__${e.productName}`;
      } else {
        const bucket = e.eventDate ? Math.floor(e.eventDate.getTime() / (30 * 60 * 1000)) : 'x';
        key = `noorder:${e.searchQuery}__${e.productName}__${bucket}`;
      }
      if (!seen.has(key)) {
        seen.set(key, e);
        deduped.push(e);
      } else {
        // Keep the one with the higher revenue (completed > initiated)
        const existing = seen.get(key);
        if (e.revenue > existing.revenue) {
          const idx = deduped.indexOf(existing);
          deduped[idx] = e;
          seen.set(key, e);
        }
      }
    }
    const uniquePurchases = deduped;

    const orderSet=new Set(); let totalRevenue=0,totalItems=0,totalOrders=0;
    uniquePurchases.forEach(e=>{totalOrders+=1;if(e.orderId)orderSet.add(e.orderId);totalRevenue+=e.revenue;totalItems+=e.quantity;});
    const weeklyMap=new Map(),dailyMap=new Map(),detailMap=new Map();
    uniquePurchases.forEach(e=>{
      if(e.eventDate instanceof Date&&!isNaN(e.eventDate)){
        const dd=new Date(e.eventDate);dd.setHours(0,0,0,0);const dk=dd.toISOString();
        const dl=e.eventDate.toLocaleDateString("he-IL",{weekday:"long",year:"numeric",month:"2-digit",day:"2-digit"});
        const de=dailyMap.get(dk)||{period:dl,revenue:0,items:0,orders:new Set()};
        de.revenue+=e.revenue;de.items+=e.quantity;if(e.orderId)de.orders.add(e.orderId);dailyMap.set(dk,de);
        const ws=new Date(dd);ws.setDate(ws.getDate()-ws.getDay());const we=new Date(ws);we.setDate(ws.getDate()+6);
        const wk=ws.toISOString(),wl=`${ws.toLocaleDateString("he-IL")} - ${we.toLocaleDateString("he-IL")}`;
        const wen=weeklyMap.get(wk)||{period:wl,revenue:0,items:0,orders:new Set()};
        wen.revenue+=e.revenue;wen.items+=e.quantity;if(e.orderId)wen.orders.add(e.orderId);weeklyMap.set(wk,wen);
      }
      const dk2=`${e.searchQuery||"ללא שאילתה"}__${e.productName}`;
      const de2=detailMap.get(dk2)||{search_query:e.searchQuery||"ללא שאילתה",product_name:e.productName,orders:new Set(),items:0,revenue:0};
      if(e.orderId)de2.orders.add(e.orderId);de2.items+=e.quantity;de2.revenue+=e.revenue;detailMap.set(dk2,de2);
    });
    return {
      totals:{revenue:totalRevenue,orders:mode==='checkout'?totalOrders:totalOrders,items:totalItems},
      weekly:Array.from(weeklyMap.entries()).sort((a,b)=>new Date(a[0])-new Date(b[0])).map(([,e])=>({period:e.period,semantix_revenue:e.revenue,semantix_orders:e.orders.size,semantix_items:e.items})),
      daily:Array.from(dailyMap.entries()).sort((a,b)=>new Date(a[0])-new Date(b[0])).map(([,e])=>({period:e.period,semantix_revenue:e.revenue,semantix_orders:e.orders.size,semantix_items:e.items})),
      byQueryProduct:Array.from(detailMap.values()).map(e=>({search_query:e.search_query,product_name:e.product_name,orders:e.orders.size,items:e.items,revenue:e.revenue})).sort((a,b)=>b.revenue-a.revenue),
      events: uniquePurchases.slice().sort((a,b)=>(b.eventDate?.getTime()||0)-(a.eventDate?.getTime()||0)),
      hasData:true,mode,
    };
  }, [checkoutEvents, cartAnalytics]);

  const boostedProductNamesSet = useMemo(() => {
    const s=new Set(); boostedProducts.forEach(bp=>{if(bp.name)s.add(trimAndNormalize(bp.name).toLowerCase());}); return s;
  }, [boostedProducts]);

  // CSV download
  const downloadCSV = () => {
    if (!filteredQueries.length) { alert('אין נתונים לייצוא'); return; }
    const headers=['תאריך ושעה','שאילתת חיפוש','קטגוריה','מחיר מינימלי','מחיר מקסימלי','כמות תוצאות'];
    const rows=[headers.join(',')];
    filteredQueries.forEach(q=>{
      const ts=q.timestamp?new Date(q.timestamp).toLocaleString('he-IL',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'N/A';
      const sq=q.query&&typeof q.query==='string'?`"${q.query.replace(/"/g,'""')}"` :'N/A';
      let cat='N/A';
      if(q.category){if(Array.isArray(q.category)){const s=q.category.join(', ');cat=s&&s!=='unknown'?`"${s.replace(/"/g,'""')}"` :'N/A';}else if(typeof q.category==='string'&&q.category!=='unknown')cat=`"${q.category.replace(/"/g,'""')}"` ;}
      const minP=(q.minPrice&&typeof q.minPrice==='number')?`₪${q.minPrice}`:'N/A';
      const maxP=(q.maxPrice&&typeof q.maxPrice==='number')?`₪${q.maxPrice}`:'N/A';
      const rc=(typeof q.resultsCount==='number'&&q.resultsCount>=0)?q.resultsCount.toString():'N/A';
      rows.push([`"${ts}"`,sq,cat,`"${minP}"`,`"${maxP}"`,`"${rc}"`].join(','));
    });
    const blob=new Blob(['﻿'+rows.join('\n')],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`semantix-queries-${new Date().toISOString().split('T')[0]}.csv`;
    a.style.visibility='hidden';document.body.appendChild(a);a.click();document.body.removeChild(a);
  };

  // Derived values for header KPIs
  const totalRevenue = checkoutEvents.length===0
    ? (zeroResultsCart.value + injectCart.value)
    : ((cartMetrics?.addToCartMetrics?.revenue||0) + (cartMetrics?.checkoutMetrics?.revenue||0));
  const conversionRate = filteredCount>0
    ? (((cartMetrics?.addToCartMetrics?.items||0)/filteredCount)*100).toFixed(1)
    : '0.0';

  // Daily activity for chart
  const dailyActivityData = useMemo(() => {
    const map={};
    const now=new Date();
    for(let i=13;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const k=d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});map[k]={date:k,searches:0,clicks:0,cart:0};}
    queries.forEach(q=>{const k=new Date(q.timestamp).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});if(map[k])map[k].searches+=1;});
    clickEvents.forEach(e=>{const k=new Date(e.timestamp).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});if(map[k])map[k].clicks+=1;});
    cartAnalytics.forEach(e=>{const k=new Date(e.timestamp).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});if(map[k])map[k].cart+=1;});
    return Object.values(map);
  }, [queries, clickEvents, cartAnalytics]);

  const isDataLoading = loading || loadingCart || loadingCheckout;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full" dir="rtl">

      {/* ── LIGHT HEADER ─────────────────────────────────────────────────── */}
      <header className="mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Title row */}
          <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">ביצועי Semantix</h1>
                <p className="text-gray-400 text-xs mt-0.5">
                  {session?.user?.name || "משתמש"} · {getCurrentTimePeriodLabel()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filteredQueries.length > 0 && (
                <button onClick={downloadCSV}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-semibold transition-colors">
                  <Download className="h-3.5 w-3.5" />ייצוא CSV
                </button>
              )}
              <div className="relative">
                <button onClick={() => setTimePeriodOpen(!timePeriodOpen)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-xs font-semibold transition-colors">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  {getCurrentTimePeriodLabel()}
                  <ChevronDown className={`h-3.5 w-3.5 text-indigo-400 transition-transform duration-200 ${timePeriodOpen?"rotate-180":""}`} />
                </button>
                {timePeriodOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTimePeriodOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden" dir="rtl">
                      <div className="p-1.5">
                        {timePeriods.map(period => (
                          <button key={period.value} onClick={() => handleTimePeriodChange(period)}
                            className={`w-full px-3 py-2 text-right rounded-lg text-sm transition-colors flex items-center justify-between ${selectedTimePeriod===period.value?"bg-indigo-50 text-indigo-700 font-bold":"text-gray-700 hover:bg-gray-50"}`}>
                            <span>{period.label}</span>
                            {selectedTimePeriod===period.value && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-x-reverse divide-gray-100">
            {[
              { icon: DollarSign,    label:"הכנסות",       color:"text-emerald-600", bg:"bg-emerald-50", value:`₪${totalRevenue.toLocaleString('he-IL',{maximumFractionDigits:0})}`, sub: checkoutEvents.length===0?"עגלה (Zero + Inject)":"עגלה + רכישות" },
              { icon: Search,        label:"חיפושי AI",    color:"text-indigo-600",  bg:"bg-indigo-50",  value:filteredCount.toLocaleString('he-IL'), sub:getCurrentTimePeriodLabel() },
              { icon: MousePointer2, label:"אינטראקציות",  color:"text-cyan-600",    bg:"bg-cyan-50",    value:((cartMetrics?.clickMetrics?.items||0)+(cartMetrics?.addToCartMetrics?.items||0)).toLocaleString('he-IL'), sub:`${(cartMetrics?.clickMetrics?.items||0).toLocaleString()} לחיצות · ${(cartMetrics?.addToCartMetrics?.items||0).toLocaleString()} עגלה` },
              { icon: TrendingUp,    label:"המרה",         color:"text-purple-600",  bg:"bg-purple-50",  value:`${conversionRate}%`, sub:"חיפוש ← עגלה" },
            ].map(({icon:Icon,label,color,bg,value,sub},i)=>(
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-500">{label}</span>
                </div>
                <p className="text-2xl font-black tabular-nums text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── CONVERSION FUNNEL ────────────────────────────────────────────── */}
      {queries.length > 0 && (cartAnalytics.length > 0 || clickEvents.length > 0 || checkoutEvents.length > 0) && (() => {
        const steps = [
          { label:"חיפושים",       count:queries.length,                               color:"bg-indigo-500",  pct:100 },
          { label:"לחיצות",        count:cartMetrics?.clickMetrics?.items||0,          color:"bg-cyan-500",    pct:queries.length>0?((cartMetrics?.clickMetrics?.items||0)/queries.length*100):0 },
          { label:"הוספה לעגלה",  count:cartMetrics?.addToCartMetrics?.items||0,       color:"bg-emerald-500", pct:queries.length>0?((cartMetrics?.addToCartMetrics?.items||0)/queries.length*100):0 },
          { label:"רכישות",        count:cartMetrics?.checkoutMetrics?.items||0,        color:"bg-purple-500",  pct:queries.length>0?((cartMetrics?.checkoutMetrics?.items||0)/queries.length*100):0 },
        ];
        return (
          <section className="mb-6">
            <SectionCard title="משפך ההמרה" subtitle="מחיפוש חכם לרכישה" icon={TrendingUp} iconColor="from-indigo-500 to-purple-600">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {steps.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">{s.label}</span>
                      <span className="text-xs font-bold text-gray-600 tabular-nums">{s.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{width:`${Math.max(s.pct,2)}%`}} />
                    </div>
                    <p className="text-2xl font-black tabular-nums text-gray-900">{s.count.toLocaleString('he-IL')}</p>
                    {i < steps.length-1 && steps[i+1].count > 0 && (
                      <p className="text-[11px] text-gray-400 font-medium">↓ {s.count>0?(steps[i+1].count/s.count*100).toFixed(1):0}% המרה לשלב הבא</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          </section>
        );
      })()}

      {/* ── CHARTS ───────────────────────────────────────────────────────── */}
      {queries.length > 0 && (cartAnalytics.length > 0 || clickEvents.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Daily activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">פעילות יומית</h3>
                <p className="text-xs text-gray-400">14 ימים אחרונים</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyActivityData} margin={{top:5,right:5,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{fontSize:12,direction:'rtl',borderRadius:8,border:'1px solid #f0f0f0',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}} />
                <Area type="monotone" dataKey="searches" name="חיפושים" stroke="#6366f1" fill="url(#sg)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="clicks"   name="לחיצות"  stroke="#06b6d4" fill="url(#cg)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="cart"     name="עגלה"    stroke="#10b981" fill="url(#ag)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-5 mt-3">
              {[["#6366f1","חיפושים"],["#06b6d4","לחיצות"],["#10b981","עגלה"]].map(([c,l])=>(
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded" style={{backgroundColor:c}} />
                  <span className="text-xs text-gray-500 font-medium">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top queries by revenue */}
          {(cartMetrics?.addToCartMetrics?.queries||[]).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">שאילתות מובילות לפי הכנסות</h3>
                  <p className="text-xs text-gray-400">Top 7</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart layout="vertical" margin={{top:0,right:10,left:0,bottom:0}}
                  data={(cartMetrics.addToCartMetrics.queries||[]).slice(0,7).map(q=>({name:q.query.length>18?q.query.slice(0,18)+'…':q.query,revenue:q.revenue||0}))}>
                  <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
                  <XAxis type="number" tickFormatter={v=>`₪${v.toLocaleString()}`} tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{fontSize:10,fill:"#374151",textAnchor:'end'}} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v=>[`₪${v.toLocaleString()}`,'הכנסות']} contentStyle={{fontSize:12,direction:'rtl',borderRadius:8,border:'1px solid #f0f0f0',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}} />
                  <Bar dataKey="revenue" fill="url(#rg)" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {/* ── REVENUE ATTRIBUTION ──────────────────────────────────────────── */}
      {(cartAnalytics.length > 0 || checkoutEvents.length > 0 || clickEvents.length > 0 || loadingCart || loadingCheckout || loadingClicks) && (
        <section className="mb-6">
          <SectionCard title="הכנסות שנוצרו דרך Semantix" subtitle="ייחוס הכנסות לחיפוש חכם" icon={DollarSign} iconColor="from-purple-500 to-indigo-600">
            {isDataLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-100 border-t-indigo-500" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Cart — AI-attributed only */}
                {(cartMetrics?.aiCartMetrics?.items||0) > 0 && (
                  <MetricBlock color="indigo" label="הוספות לעגלה דרך AI"
                    value={cartMetrics.aiCartMetrics.revenue >= 100 ? formatCurrency(cartMetrics.aiCartMetrics.revenue) : `${cartMetrics.aiCartMetrics.items} הוספות`}
                    badge={[`✦ ${(cartMetrics.aiCartMetrics.items||0).toLocaleString()} AI`,`${(cartMetrics.aiCartMetrics.uniqueProducts||0).toLocaleString()} מוצרים`]}
                    expanded={cartDetailsExpanded} onToggle={()=>setCartDetailsExpanded(!cartDetailsExpanded)}>
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-500 mb-3">שאילתות AI מובילות לעגלה</p>
                      <div className="space-y-1.5">
                        {(cartMetrics.aiCartMetrics?.queries||[]).map((item,i)=>(
                          <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-sm text-gray-700 font-medium">{item.query}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{item.count} הוספות</span>
                              {item.revenue > 0 && <span className="text-xs font-bold text-indigo-800">₪{item.revenue.toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </MetricBlock>
                )}

                {/* Zero-results */}
                {(() => {
                  const zeroClicks = clickEvents.filter(e=>e.source==="zero-results");
                  const zeroClickMap = {};
                  zeroClicks.forEach(e=>{const k=e.product_name||e.product_id||"?";zeroClickMap[k]=(zeroClickMap[k]||{name:k,query:e.search_query,clicks:0});zeroClickMap[k].clicks++;});
                  const topZeroClicks = Object.values(zeroClickMap).sort((a,b)=>b.clicks-a.clicks).slice(0,10);
                  const hasAnything = zeroResultsCart.count>0 || topZeroClicks.length>0;
                  if (!hasAnything) return null;
                  return (
                    <MetricBlock color="orange" label="חיפושי אפס-תוצאות → עגלה"
                      value={zeroResultsCart.count>0?`${zeroResultsCart.count.toLocaleString()} הוספות · ${formatCurrency(zeroResultsCart.value)}`:`${topZeroClicks.length} מוצרים נלחצו`}
                      badge={[...(zeroResultsCart.sessions>0?[`${zeroResultsCart.sessions} סשנים`]:[]),...(topZeroClicks.length>0?[`${zeroClicks.length} לחיצות`]:[]),...(zeroResultsCheckout.count>0?[`✓ ${zeroResultsCheckout.count} תשלום`]:[])]}
                      expanded={zeroResultsExpanded} onToggle={()=>setZeroResultsExpanded(!zeroResultsExpanded)}>
                      <div>
                        {topZeroClicks.length > 0 && (
                          <div className="px-4 pt-3 pb-2">
                            <p className="text-xs font-semibold text-orange-700 mb-2">מוצרים שנלחצו</p>
                            <div className="space-y-1.5">
                              {topZeroClicks.map((item,i)=>(
                                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-orange-50/60 rounded-lg border border-orange-100">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                                    {item.query && <p className="text-xs text-orange-500 mt-0.5">"{item.query}"</p>}
                                  </div>
                                  <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full shrink-0">{item.clicks} לחיצות</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {zeroResultsCart.count > 0 && zeroResultsCart.value > 0 && (
                          <div className="border-t border-orange-100 divide-y divide-orange-100">
                            <p className="text-xs font-semibold text-orange-700 px-4 pt-3 pb-1">הוספות לעגלה</p>
                            {zeroResultsCart.items.map((item,i)=>(
                              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{item.productName||item.productId}</p>
                                  {item.searchQuery && <p className="text-xs text-orange-600 mt-0.5">"{item.searchQuery}"</p>}
                                </div>
                                {(item.product_price!=null||item.price!=null) && (
                                  <p className="text-sm font-bold text-gray-700">₪{parseFloat(String(item.product_price??item.price??"").replace(/[^0-9.]/g,"")).toLocaleString('he-IL',{minimumFractionDigits:2})}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {zeroResultsCheckout.count > 0 && (
                          <div className="border-t border-green-100 bg-green-50/40 divide-y divide-green-100">
                            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                              <p className="text-xs font-semibold text-green-700">✓ הגיעו לתשלום</p>
                              {zeroResultsCheckout.value > 0 && <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded-full">₪{zeroResultsCheckout.value.toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
                            </div>
                            {zeroResultsCheckout.items.map((item,i)=>(
                              <div key={i} className="flex items-center justify-between px-4 py-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{item.productName||item.productId}</p>
                                  {item.searchQuery && <p className="text-xs text-green-600 mt-0.5">"{item.searchQuery}"</p>}
                                </div>
                                {item.checkoutPrice > 0 && (
                                  <p className="text-sm font-bold text-green-700">₪{item.checkoutPrice.toLocaleString('he-IL',{minimumFractionDigits:2})}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </MetricBlock>
                  );
                })()}

                {/* Inject */}
                {(() => {
                  const injClicks = clickEvents.filter(e=>e.source==="inject");
                  const injClickMap = {};
                  injClicks.forEach(e=>{const k=e.product_name||e.product_id||"?";injClickMap[k]=(injClickMap[k]||{name:k,query:e.search_query,clicks:0});injClickMap[k].clicks++;});
                  const topInjClicks = Object.values(injClickMap).sort((a,b)=>b.clicks-a.clicks).slice(0,10);
                  const hasAnything = injectCart.count>0 || topInjClicks.length>0;
                  if (!hasAnything) return null;
                  return (
                    <MetricBlock color="purple" label="הזרקת מוצרים (Inject) → עגלה"
                      value={injectCart.count>0?`${injectCart.count.toLocaleString()} הוספות · ${formatCurrency(injectCart.value)}`:`${topInjClicks.length} מוצרים נלחצו`}
                      badge={[...(injectCart.sessions>0?[`${injectCart.sessions} סשנים`]:[]),...(topInjClicks.length>0?[`${injClicks.length} לחיצות`]:[]),...(injectCheckout.count>0?[`✓ ${injectCheckout.count} תשלום`]:[])]}
                      expanded={injectExpanded} onToggle={()=>setInjectExpanded(!injectExpanded)}>
                      <div>
                        {topInjClicks.length > 0 && (
                          <div className="px-4 pt-3 pb-2">
                            <p className="text-xs font-semibold text-purple-700 mb-2">מוצרים שנלחצו</p>
                            <div className="space-y-1.5">
                              {topInjClicks.map((item,i)=>(
                                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-purple-50/60 rounded-lg border border-purple-100">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                                    {item.query && <p className="text-xs text-purple-500 mt-0.5">"{item.query}"</p>}
                                  </div>
                                  <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full shrink-0">{item.clicks} לחיצות</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {injectCart.count > 0 && injectCart.value > 0 && (
                          <div className="border-t border-purple-100 divide-y divide-purple-100">
                            <p className="text-xs font-semibold text-purple-700 px-4 pt-3 pb-1">הוספות לעגלה</p>
                            {injectCart.items.map((item,i)=>(
                              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{item.productName||item.productId}</p>
                                  {item.searchQuery && <p className="text-xs text-purple-600 mt-0.5">"{item.searchQuery}"</p>}
                                </div>
                                {item.price!=null && item.price!=="" && (
                                  <p className="text-sm font-bold text-gray-700">₪{parseFloat(String(item.price).replace(/[^0-9.]/g,"")).toLocaleString('he-IL',{minimumFractionDigits:2})}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {injectCheckout.count > 0 && (
                          <div className="border-t border-green-100 bg-green-50/40 divide-y divide-green-100">
                            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                              <p className="text-xs font-semibold text-green-700">✓ הגיעו לתשלום</p>
                              {injectCheckout.value > 0 && <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded-full">₪{injectCheckout.value.toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
                            </div>
                            {injectCheckout.items.map((item,i)=>(
                              <div key={i} className="flex items-center justify-between px-4 py-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{item.productName||item.productId}</p>
                                  {item.searchQuery && <p className="text-xs text-green-600 mt-0.5">"{item.searchQuery}"</p>}
                                </div>
                                {item.checkoutPrice > 0 && (
                                  <p className="text-sm font-bold text-green-700">₪{item.checkoutPrice.toLocaleString('he-IL',{minimumFractionDigits:2})}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </MetricBlock>
                  );
                })()}

                {/* Checkout */}
                {checkoutEvents.length > 0 && (cartMetrics?.checkoutMetrics?.revenue||0) >= 1000 && (
                  <MetricBlock color="green" label="רכישות (Checkout)"
                    value={formatCurrency(cartMetrics.checkoutMetrics.revenue)}
                    badge={[`${(cartMetrics.checkoutMetrics.items||0).toLocaleString()} רכישות`,`${(cartMetrics.checkoutMetrics.uniqueProducts||0).toLocaleString()} מוצרים`]}
                    expanded={checkoutDetailsExpanded} onToggle={()=>setCheckoutDetailsExpanded(!checkoutDetailsExpanded)}>
                    <div className="p-4 space-y-4">
                      {(cartMetrics.checkoutMetrics?.topProducts||[]).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">מוצרים שנרכשו</p>
                          <div className="space-y-1.5">
                            {(cartMetrics.checkoutMetrics.topProducts||[]).map((item,i)=>(
                              <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-gray-100">
                                <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">{item.count} רכישות</span>
                                  {item.revenue > 0 && <span className="text-xs font-bold text-emerald-800">₪{item.revenue.toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(cartMetrics.checkoutMetrics?.queries||[]).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">שאילתות מובילות לרכישות</p>
                          <div className="space-y-1.5">
                            {(cartMetrics.checkoutMetrics.queries||[]).map((item,i)=>(
                              <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-gray-100">
                                <span className="text-sm text-gray-700 font-medium">{item.query}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">{item.count} רכישות</span>
                                  {item.revenue > 0 && <span className="text-xs font-bold text-emerald-800">₪{item.revenue.toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </MetricBlock>
                )}

                {/* Clicks — AI only */}
                {(cartMetrics?.clickMetrics?.aiClicks||0) > 0 && (
                  <MetricBlock color="blue" label="לחיצות AI על מוצרים"
                    value={`${(cartMetrics.clickMetrics.aiClicks).toLocaleString('he-IL')} לחיצות ✦ AI`}
                    badge={[
                      `${(cartMetrics?.clickMetrics?.uniqueProducts||0)} מוצרים`,
                    ]}
                    expanded={clickDetailsExpanded} onToggle={()=>setClickDetailsExpanded(!clickDetailsExpanded)}>
                    <div className="p-4 space-y-4">
                      {(cartMetrics.clickMetrics?.topClickedProducts||[]).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">מוצרים עם הכי הרבה לחיצות</p>
                          <div className="space-y-1.5">
                            {(cartMetrics.clickMetrics.topClickedProducts||[]).map((item,i)=>(
                              <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-gray-100">
                                <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                                <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">{item.clicks.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </MetricBlock>
                )}

                {/* Boosted Exposure */}
                {(cartMetrics?.boostedExposure?.length > 0) && (
                  <MetricBlock color="amber" label="חשיפות למוצרים מקודמים"
                    value={(cartMetrics?.boostedExposure?.reduce((s,p)=>s+(p.exposure||0),0)||0).toLocaleString('he-IL')}
                    badge={[`${(cartMetrics?.boostedExposure?.length||0)} מוצרים`,`${(cartMetrics?.boostedExposure?.reduce((s,p)=>s+(p.clicks||0),0)||0)} לחיצות`]}
                    expanded={exposureDetailsExpanded} onToggle={()=>setExposureDetailsExpanded(!exposureDetailsExpanded)}>
                    <div className="p-4">
                      <div className="space-y-1.5">
                        {(cartMetrics.boostedExposure||[]).slice(0,10).map((item,i)=>(
                          <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-700 font-semibold">{item.exposure.toLocaleString()} חשיפות</span>
                              {item.clicks > 0 && <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full">{item.clicks} לחיצות</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </MetricBlock>
                )}

                {/* Semantix complex purchases */}
                {semantixFunnel.hasData && (
                  <MetricBlock color="purple" label={`רכישות Semantix מורכבות (${semantixFunnel.mode==='checkout'?'Checkout':'עגלה'})`}
                    value={`${formatCurrency(semantixFunnel.totals.revenue)} · ${semantixFunnel.totals.orders.toLocaleString()} ${semantixFunnel.mode==='checkout'?'רכישות':'הוספות'}`}
                    expanded={semantixExpanded} onToggle={()=>setSemantixExpanded(!semantixExpanded)}>
                    <div className="p-4">
                      {semantixFunnel.daily.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 mb-3">מגמה יומית</p>
                          <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={semantixFunnel.daily.slice(-14)} margin={{top:0,right:5,left:-25,bottom:0}}>
                              <defs><linearGradient id="sfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
                              <XAxis dataKey="period" tick={{fontSize:9,fill:"#9ca3af"}} axisLine={false} tickLine={false} tickFormatter={v=>v.split(" ")[0]} />
                              <YAxis tick={{fontSize:9,fill:"#9ca3af"}} axisLine={false} tickLine={false} />
                              <Tooltip formatter={v=>[`₪${v.toLocaleString()}`,'הכנסות']} contentStyle={{fontSize:11,direction:'rtl',borderRadius:6}} />
                              <Bar dataKey="semantix_revenue" fill="url(#sfg)" radius={[3,3,0,0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      <p className="text-xs font-semibold text-gray-500 mb-2">פירוט עסקאות</p>
                      <div className="overflow-hidden rounded-lg border border-gray-100">
                        {/* header row */}
                        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-3 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 text-right">
                          <span>מוצר</span>
                          <span>שאילתה</span>
                          <span>תאריך ושעה</span>
                          <span>מחיר</span>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                          {(semantixFunnel.events||[]).map((item,i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-3 items-center px-3 py-2.5 hover:bg-purple-50/30 transition-colors text-right">
                              <span className="text-sm font-medium text-gray-800 truncate">{item.productName || '—'}</span>
                              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full truncate w-fit">{item.searchQuery || '—'}</span>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {item.eventDate
                                  ? item.eventDate.toLocaleString('he-IL', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
                                  : '—'}
                              </span>
                              <span className="text-sm font-bold text-purple-700 whitespace-nowrap">
                                {item.revenue > 0 ? `₪${item.revenue.toLocaleString('he-IL',{maximumFractionDigits:0})}` : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </MetricBlock>
                )}
              </div>
            )}
          </SectionCard>
        </section>
      )}

      {/* ── INJECT & ZERO-RESULTS CLICKED PRODUCTS ───────────────────────── */}
      {(() => {
        const injClicks  = clickEvents.filter(e => e.source === "inject");
        const zeroClicks = clickEvents.filter(e => e.source === "zero-results");
        if (injClicks.length === 0 && zeroClicks.length === 0) return null;

        const buildMap = (clicks) => {
          const map = {};
          clicks.forEach(e => {
            const k = e.product_name || String(e.product_id) || "?";
            if (!map[k]) map[k] = { name: k, queries: new Set(), clicks: 0 };
            map[k].clicks++;
            if (e.search_query) map[k].queries.add(e.search_query);
          });
          return Object.values(map)
            .sort((a,b) => b.clicks - a.clicks)
            .slice(0, 50)
            .map(r => ({...r, queries: [...r.queries].slice(0, 3)}));
        };

        const topInj  = buildMap(injClicks);
        const topZero = buildMap(zeroClicks);

        const ProductRow = ({ item, badgeColor, queryColor }) => (
          <div className="flex items-start justify-between gap-3 py-3 px-4 hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800">{item.name}</p>
              {item.queries.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.queries.map((q,qi) => (
                    <span key={qi} className={`text-xs px-2 py-0.5 rounded-full ${queryColor}`}>"{q}"</span>
                  ))}
                </div>
              )}
            </div>
            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
              {item.clicks} {item.clicks === 1 ? "לחיצה" : "לחיצות"}
            </span>
          </div>
        );

        return (
          <section className="mb-6" dir="rtl">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header / trigger */}
              <button
                onClick={() => setClickedProductsDrawerOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                    <MousePointer2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">מוצרים שנלחצו — Inject &amp; Zero-Results</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {injClicks.length > 0 && <span className="text-teal-600 font-medium">⊕ {injClicks.length} Inject</span>}
                      {injClicks.length > 0 && zeroClicks.length > 0 && <span className="mx-1 text-gray-300">·</span>}
                      {zeroClicks.length > 0 && <span className="text-orange-500 font-medium">◎ {zeroClicks.length} Zero-Results</span>}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${clickedProductsDrawerOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Expandable body */}
              {clickedProductsDrawerOpen && (
                <div className={`border-t border-gray-100 grid ${topInj.length > 0 && topZero.length > 0 ? "md:grid-cols-2" : "grid-cols-1"} divide-x divide-x-reverse divide-gray-100`}>
                  {topInj.length > 0 && (
                    <div>
                      <div className="px-4 py-2.5 bg-teal-50/60 border-b border-teal-100 flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full">⊕ Inject</span>
                        <span className="text-xs text-teal-600">{topInj.length} מוצרים · {injClicks.length} לחיצות</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {topInj.map((item, i) => (
                          <ProductRow key={i} item={item} badgeColor="bg-teal-100 text-teal-800" queryColor="bg-teal-50 text-teal-600" />
                        ))}
                      </div>
                    </div>
                  )}
                  {topZero.length > 0 && (
                    <div>
                      <div className="px-4 py-2.5 bg-orange-50/60 border-b border-orange-100 flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full">◎ Zero-Results</span>
                        <span className="text-xs text-orange-600">{topZero.length} מוצרים · {zeroClicks.length} לחיצות</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {topZero.map((item, i) => (
                          <ProductRow key={i} item={item} badgeColor="bg-orange-100 text-orange-800" queryColor="bg-orange-50 text-orange-600" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── SEARCH LOG TABLE ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" dir="rtl">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-slate-50/80 to-white flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-gray-800 rounded-xl flex items-center justify-center shadow-sm">
              <Search className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">יומן חיפושים</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filteredCount.toLocaleString('he-IL')} שאילתות{totalLoaded>0&&` · ${totalLoaded.toLocaleString()} נטענו`}</p>
            </div>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {categoryOptions.length > 0 && (
              <select value={filters.category} onChange={e=>setFilters(p=>({...p,category:e.target.value}))}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200">
                <option value="">כל הקטגוריות</option>
                {categoryOptions.map(c=><option key={c} value={c.toLowerCase()}>{c}</option>)}
              </select>
            )}
            {(filters.category || filters.type || filters.minPrice || filters.maxPrice) && (
              <button onClick={()=>setFilters({category:"",type:"",minPrice:"",maxPrice:""})}
                className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">
                נקה סינונים
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-100 border-t-indigo-500" />
            <span className="text-sm text-gray-400 font-medium">טוען שאילתות...</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">שגיאה בטעינת הנתונים</p>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <button onClick={()=>window.location.reload()} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors">נסה שוב</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredCount === 0 && (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="h-7 w-7 text-gray-200" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">אין שאילתות להצגה</p>
            <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
              {totalLoaded===0?"לא נמצאו שאילתות. התחל לחפש כדי לראות נתונים.":"אין שאילתות בתקופה שנבחרה. נסה לשנות את טווח הזמן."}
            </p>
            {totalLoaded > 0 && (
              <button onClick={()=>{setStartDate("");setEndDate("");setSelectedTimePeriod("all");setFilters({category:"",type:"",minPrice:"",maxPrice:""});}}
                className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-colors">
                אפס סינונים
              </button>
            )}
          </div>
        )}

        {/* Mobile cards */}
        {!loading && !error && filteredQueries.length > 0 && (
          <div className="block md:hidden p-4 space-y-2.5">
            {displayedQueries.map((query, index) => {
              const queryText=(query.query||'').toLowerCase().trim();
              const deliveredProducts=query.deliveredProducts||[];
              const deliveredProductsSet=new Set(deliveredProducts.map(p=>trimAndNormalize(p).toLowerCase()));
              const wasDelivered=(n)=>!n||deliveredProductsSet.size===0?false:deliveredProductsSet.has(trimAndNormalize(n).toLowerCase());
              const qt=new Date(query.timestamp).getTime();
              const ATTR=10*60*1000, INF=3*60*1000;
              const cartProducts=cartAnalytics.filter(i=>{const t=parseEventTime(i.timestamp||i.created_at);return(i.search_query||'').toLowerCase().trim()===queryText&&t>=qt;}).map(i=>({name:i.product_name||'מוצר לא ידוע',price:i.product_price||0,quantity:i.quantity||1})).filter(p=>wasDelivered(p.name)).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
              const purchaseProducts=checkoutEvents.filter(i=>{const t=parseEventTime(i.timestamp||i.created_at);return(i.search_query||'').toLowerCase().trim()===queryText&&t>=qt&&t<=qt+ATTR;}).flatMap(i=>{if(Array.isArray(i.products)&&i.products.length>0)return i.products.map(p=>({name:p.product_name||p.name||'מוצר לא ידוע',price:p.product_price||p.price||0,quantity:p.quantity||1}));return[{name:i.product_name||'מוצר לא ידוע',price:i.product_price||0,quantity:i.quantity||1}];}).filter(i=>i.name&&wasDelivered(i.name)).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
              const clickedProducts=clickEvents.filter(i=>{if((i.source||'').toLowerCase()==='native')return false;const t=parseEventTime(i.timestamp||i.created_at);const w=i.query_source==='inferred_from_recent'?INF:ATTR;return(i.search_query||'').toLowerCase().trim()===queryText&&t>=qt&&t<=qt+w;}).map(i=>({name:i.product_name||'מוצר לא ידוע',source:(i.source||'').toLowerCase()})).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
              const hasCart=cartProducts.length>0, hasPurchase=purchaseProducts.length>0, hasClick=clickedProducts.length>0;
              const hasDelivered=Array.isArray(deliveredProducts)&&deliveredProducts.length>0;
              const isExpanded=expandedQueries[index]||false;
              const primaryProduct=purchaseProducts[0]||cartProducts[0];
              const indType=getIndicatorType(query.query,primaryProduct?.name,deliveredProducts,hasCart||hasPurchase);
              const hasBoosted=deliveredProducts.some(p=>boostedProductNamesSet.has(trimAndNormalize(p).toLowerCase()));

              let borderCls="border-gray-200";
              if(hasPurchase) borderCls="border-purple-300 bg-purple-50/30";
              else if(hasCart) borderCls="border-emerald-300 bg-emerald-50/30";
              else if(hasClick) borderCls="border-blue-200 bg-blue-50/20";

              return (
                <div key={index} className={`border-2 ${borderCls} rounded-xl p-3.5 transition-all`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{query.query}</span>
                        <QueryBadge type={indType.type} />
                        {hasBoosted && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">⚡ Boosted</span>}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(query.timestamp).toLocaleDateString('he-IL')} · {new Date(query.timestamp).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div className="flex gap-1">
                      {hasPurchase && <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs">✓</span>}
                      {hasCart && !hasPurchase && <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-xs">🛒</span>}
                      {hasClick && !hasCart && !hasPurchase && <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">👆</span>}
                    </div>
                  </div>
                  {hasPurchase && purchaseProducts.slice(0,2).map((p,i)=>(
                    <div key={i} className="text-xs text-purple-700 bg-purple-50 rounded-lg px-2.5 py-1.5 mb-1">נרכש: {p.name} · ₪{(p.price*p.quantity).toFixed(2)}</div>
                  ))}
                  {hasCart && !hasPurchase && cartProducts.slice(0,2).map((p,i)=>(
                    <div key={i} className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 mb-1">עגלה: {p.name} · ₪{(p.price*p.quantity).toFixed(2)}</div>
                  ))}
                  {hasDelivered && (
                    <button onClick={()=>setExpandedQueries(prev=>({...prev,[index]:!prev[index]}))}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium mt-1 flex items-center gap-1">
                      תוצאות ({deliveredProducts.length})
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded?"rotate-180":""}`} />
                    </button>
                  )}
                  {isExpanded && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-2.5 space-y-1">
                      {deliveredProducts.map((p,i)=>{
                        const ib=boostedProductNamesSet.has(trimAndNormalize(p).toLowerCase());
                        return <div key={i} className={`text-xs flex items-center gap-1.5 ${ib?"text-amber-700":"text-gray-600"}`}><span className={ib?"text-amber-400":"text-gray-300"}>•</span>{p}{ib&&<span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">⚡</span>}</div>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop table */}
        {!loading && !error && filteredQueries.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" dir="rtl">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">שאילתת חיפוש</th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">זמן</th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">קטגוריה</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">לחיצה</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">עגלה</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">רכישה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedQueries.map((query, index) => {
                  const queryText=(query.query||'').toLowerCase().trim();
                  const deliveredProducts=query.deliveredProducts||[];
                  const deliveredProductsSet=new Set(deliveredProducts.map(p=>trimAndNormalize(p).toLowerCase()));
                  const wasDelivered=(n)=>!n||deliveredProductsSet.size===0?false:deliveredProductsSet.has(trimAndNormalize(n).toLowerCase());
                  const qt=new Date(query.timestamp).getTime();
                  const ATTR=10*60*1000, INF=3*60*1000;

                  const cartProducts=cartAnalytics.filter(i=>{const t=parseEventTime(i.timestamp||i.created_at);return(i.search_query||'').toLowerCase().trim()===queryText&&t>=qt&&t<=qt+ATTR;}).map(i=>({name:i.product_name||'מוצר לא ידוע',price:i.product_price||0,quantity:i.quantity||1})).filter(p=>wasDelivered(p.name)).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
                  const purchaseProducts=checkoutEvents.filter(i=>{const t=parseEventTime(i.timestamp||i.created_at);return(i.search_query||'').toLowerCase().trim()===queryText&&t>=qt&&t<=qt+ATTR;}).flatMap(i=>{if(Array.isArray(i.products)&&i.products.length>0)return i.products.map(p=>({name:p.product_name||p.name||'מוצר לא ידוע',price:p.product_price||p.price||0,quantity:p.quantity||1}));return[{name:i.product_name||'מוצר לא ידוע',price:i.product_price||0,quantity:i.quantity||1}];}).filter(i=>i.name&&wasDelivered(i.name)).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
                  const clickedProducts=clickEvents.filter(i=>{if((i.source||'').toLowerCase()==='native')return false;const t=parseEventTime(i.timestamp||i.created_at);const w=i.query_source==='inferred_from_recent'?INF:ATTR;return(i.search_query||'').toLowerCase().trim()===queryText&&t>=qt&&t<=qt+w;}).map(i=>({name:i.product_name||'מוצר לא ידוע',url:i.product_url||'',source:(i.source||'').toLowerCase()})).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);

                  const hasPurchase=purchaseProducts.length>0, hasCart=cartProducts.length>0, hasClick=clickedProducts.length>0;
                  const hasDelivered=Array.isArray(deliveredProducts)&&deliveredProducts.length>0;
                  const isExpanded=expandedQueries[index]||false;
                  const primaryProduct=purchaseProducts[0]||cartProducts[0];
                  const indType=getIndicatorType(query.query,primaryProduct?.name,deliveredProducts,hasCart||hasPurchase);
                  const hasBoosted=deliveredProducts.some(p=>boostedProductNamesSet.has(trimAndNormalize(p).toLowerCase()));

                  const srcCounts={};
                  clickedProducts.forEach(p=>{if(p.source&&p.source!=='native')srcCounts[p.source]=(srcCounts[p.source]||0)+1;});
                  const domSrc=Object.entries(srcCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
                  const rowBg={ai:'bg-indigo-50/40 hover:bg-indigo-50/70','zero-results':'bg-orange-50/40 hover:bg-orange-50/70',rerank:'bg-purple-50/40 hover:bg-purple-50/70',inject:'bg-teal-50/40 hover:bg-teal-50/70'};
                  let trCls=hasPurchase?'bg-purple-50/30 hover:bg-purple-50/60':hasCart?'bg-emerald-50/30 hover:bg-emerald-50/60':hasClick?(rowBg[domSrc]||'hover:bg-gray-50'):'hover:bg-gray-50/60';

                  return (
                    <tr key={index} className={`${trCls} transition-colors`}>
                      {/* Query */}
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{query.query}</span>
                            <QueryBadge type={indType.type} />
                            {hasBoosted && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">⚡ Boosted</span>}
                          </div>
                          {hasPurchase && purchaseProducts.slice(0,2).map((p,i)=>(
                            <div key={i} className="text-xs text-purple-700 flex items-center gap-1">
                              <span className="text-purple-400">✓</span>{p.name}
                              {p.price>0&&<span className="font-semibold mr-1">· ₪{(p.price*p.quantity).toFixed(2)}</span>}
                            </div>
                          ))}
                          {hasCart && !hasPurchase && cartProducts.slice(0,2).map((p,i)=>(
                            <div key={i} className="text-xs text-emerald-700 flex items-center gap-1">
                              <span className="text-emerald-400">+</span>{p.name}
                              {p.price>0&&<span className="font-semibold mr-1">· ₪{(p.price*p.quantity).toFixed(2)}</span>}
                            </div>
                          ))}
                          {hasDelivered && (
                            <button onClick={()=>setExpandedQueries(prev=>({...prev,[index]:!prev[index]}))}
                              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 font-medium w-fit px-2 py-0.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                              {isExpanded?"הסתר":"תוצאות"} ({deliveredProducts.length})
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded?"rotate-180":""}`} />
                            </button>
                          )}
                          {isExpanded && (
                            <div className="mt-1 p-2.5 bg-white border border-gray-200 rounded-xl space-y-1 max-h-36 overflow-y-auto">
                              {deliveredProducts.map((p,i)=>{
                                const ib=boostedProductNamesSet.has(trimAndNormalize(p).toLowerCase());
                                return (
                                  <div key={i} className={`text-xs flex items-center gap-1.5 p-1 rounded-lg ${ib?"bg-amber-50":""}`}>
                                    <span className={ib?"text-amber-400":"text-gray-300"}>•</span>
                                    <span className={ib?"text-amber-800 font-medium":"text-gray-600"}>{p}</span>
                                    {ib && <span className="text-[9px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded font-bold">⚡</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Time */}
                      <td className="px-4 py-3.5 text-xs text-gray-400 font-medium whitespace-nowrap">
                        <div>{new Date(query.timestamp).toLocaleDateString('he-IL')}</div>
                        <div>{new Date(query.timestamp).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</div>
                      </td>
                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {query.category && (Array.isArray(query.category)?query.category:[query.category]).map((c,i)=>(
                            <span key={i} className="inline-block text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{c}</span>
                          ))}
                        </div>
                      </td>
                      {/* Click */}
                      <td className="px-4 py-3.5 text-center">
                        {hasClick ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <MousePointer2 className="h-3 w-3 text-blue-600" />
                            </div>
                            <div className="flex flex-wrap justify-center gap-0.5">
                              {[...new Set(clickedProducts.map(p=>p.source))].map(s=><SourceBadge key={s} source={s} />)}
                            </div>
                            {clickedProducts.filter(p=>p.source==='zero-results'||p.source==='inject').map((p,i)=>{
                              const inCart = cartProducts.some(c=>c.name===p.name);
                              return (
                                <div key={i} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-lg text-right max-w-[120px] leading-tight ${inCart?'bg-emerald-50 text-emerald-700 border border-emerald-100':'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                                  {inCart && <span className="text-emerald-500 ml-0.5">+</span>}
                                  {p.name}
                                </div>
                              );
                            })}
                          </div>
                        ) : <span className="text-gray-200">—</span>}
                      </td>
                      {/* Cart */}
                      <td className="px-4 py-3.5 text-center">
                        {hasCart ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                              <ShoppingCart className="h-3 w-3 text-emerald-600" />
                            </div>
                            <span className="text-[10px] text-emerald-600 font-semibold">{cartProducts.length}</span>
                          </div>
                        ) : <span className="text-gray-200">—</span>}
                      </td>
                      {/* Purchase */}
                      <td className="px-4 py-3.5 text-center">
                        {hasPurchase ? (
                          indType.type==='complex'||indType.type==='upsell' ? (
                            <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(147,51,234,0.4)]">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                              <span className="text-purple-600 text-xs font-bold">✓</span>
                            </div>
                          )
                        ) : <span className="text-gray-200">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filteredCount > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between flex-wrap gap-3 bg-gray-50/30">
            <p className="text-xs text-gray-400 font-medium">
              עמוד {currentPage} מתוך {totalPages} · {filteredCount.toLocaleString()} שאילתות
            </p>
            <div className="flex items-center gap-1.5">
              <button disabled={currentPage===1} onClick={()=>setCurrentPage(p=>Math.max(p-1,1))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                הקודם
              </button>
              {paginationNumbers.map(n=>(
                <button key={n} onClick={()=>setCurrentPage(n)}
                  className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${currentPage===n?"bg-indigo-600 text-white shadow-sm":"border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                  {n}
                </button>
              ))}
              <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>Math.min(p+1,totalPages))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                הבא
              </button>
            </div>
          </div>
        )}

        {/* Load more */}
        {!loading && !error && hasMoreQueries && (
          <div className="px-6 py-4 border-t border-gray-50 flex justify-center">
            <button disabled={loadingMore}
              onClick={async()=>{setLoadingMore(true);try{const res=await fetch("https://dashboard-server-ae00.onrender.com/queries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dbName:onboardDB,skip:queries.length,limit:100})});const data=await res.json();if(res.ok){const fq=data.queries||[];setQueries(prev=>[...prev,...fq]);setHasMoreQueries(fq.length===100);}}catch(e){console.error(e);}finally{setLoadingMore(false);}}}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm ${loadingMore?"opacity-60 cursor-not-allowed":""}`}>
              {loadingMore ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />טוען...</> : "טען עוד שאילתות"}
            </button>
          </div>
        )}
      </section>

    </div>
  );
}
