'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Zap, Target, DollarSign, Search,
  ShoppingCart, Star, AlertTriangle, CheckCircle, ArrowUpRight,
  ArrowDownRight, Lightbulb, Megaphone, Package, Users, BarChart3,
  Calendar, RefreshCw, ChevronRight, Flame, Award, Clock
} from 'lucide-react';

function normalizePrice(price) {
  if (price == null) return 0;
  const value = typeof price === 'number' ? price : parseFloat(price.toString().replace(/[^0-9.,]/g, '').replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function parseEventTime(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') {
    return ts < 1e12 ? ts * 1000 : ts;
  }
  return new Date(ts).getTime();
}

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon: Icon, color, trend, trendLabel }) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  };
  const bgMap = {
    indigo: 'bg-indigo-50',
    purple: 'bg-purple-50',
    cyan: 'bg-cyan-50',
    emerald: 'bg-emerald-50',
    amber: 'bg-amber-50',
    rose: 'bg-rose-50',
  };
  const textMap = {
    indigo: 'text-indigo-700',
    purple: 'text-purple-700',
    cyan: 'text-cyan-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.indigo}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
            ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
    </div>
  );
}

// ── Campaign Suggestion Card ───────────────────────────────────────────────────
function CampaignCard({ title, description, type, priority, action, metrics }) {
  const configs = {
    boost: { bg: 'from-purple-50 to-indigo-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: Zap, iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600' },
    seo: { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: Search, iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
    catalog: { bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: Package, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    conversion: { bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: Target, iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
    pricing: { bg: 'from-rose-50 to-pink-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700', icon: DollarSign, iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600' },
  };
  const cfg = configs[type] || configs.boost;
  const CfgIcon = cfg.icon;
  const priorityLabels = { high: { label: 'עדיפות גבוהה', cls: 'bg-red-100 text-red-700' }, medium: { label: 'עדיפות בינונית', cls: 'bg-amber-100 text-amber-700' }, low: { label: 'עדיפות נמוכה', cls: 'bg-gray-100 text-gray-600' } };
  const pCfg = priorityLabels[priority] || priorityLabels.medium;

  return (
    <div className={`rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.bg} p-5 hover:shadow-md transition-all`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-xl ${cfg.iconBg} flex-shrink-0`}>
          <CfgIcon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pCfg.cls}`}>{pCfg.label}</span>
          </div>
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        </div>
      </div>
      <p className="text-xs text-gray-600 mb-3 leading-relaxed">{description}</p>
      {metrics && metrics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {metrics.map((m, i) => (
            <span key={i} className={`text-xs px-2 py-1 rounded-lg font-medium ${cfg.badge}`}>{m}</span>
          ))}
        </div>
      )}
      {action && (
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-indigo-700 cursor-pointer transition-colors">
          <span>{action}</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

// ── Insight Row ───────────────────────────────────────────────────────────────
function InsightRow({ icon, title, detail, color }) {
  const colorMap = {
    green: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    amber: 'text-amber-600 bg-amber-50',
    rose: 'text-rose-600 bg-rose-50',
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className={`text-lg w-8 h-8 rounded-lg flex items-center justify-center ${cls} flex-shrink-0`}>{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

// ── Main InsightsPanel ─────────────────────────────────────────────────────────
export default function InsightsPanel({ session, onboarding }) {
  const dbName = onboarding?.credentials?.dbName || onboarding?.dbName;

  const [loading, setLoading] = useState(true);
  const [queries, setQueries] = useState([]);
  const [cartEvents, setCartEvents] = useState([]);
  const [checkoutEvents, setCheckoutEvents] = useState([]);
  const [clickEvents, setClickEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Last 30 days date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  const fetchData = async () => {
    if (!dbName) { setLoading(false); return; }
    setLoading(true);
    try {
      const [qRes, perfRes, clickRes] = await Promise.all([
        fetch('/api/analytics/queries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, startDate, endDate })
        }),
        fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, startDate, endDate })
        }),
        fetch('/api/cart-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, type: 'clicks', startDate, endDate })
        })
      ]);

      const qData = qRes.ok ? await qRes.json() : {};
      const perfData = perfRes.ok ? await perfRes.json() : {};
      const clickData = clickRes.ok ? await clickRes.json() : {};

      setQueries(qData.queries || []);
      setCartEvents(perfData.cart || []);
      setCheckoutEvents(perfData.checkout || []);
      setClickEvents(clickData.clicks || clickData.events || []);
    } catch (e) {
      console.error('InsightsPanel fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [dbName]);

  // ─── Computed Insights ───────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!queries.length) return null;

    // ── keyword frequency ──
    const freq = {};
    queries.forEach(q => {
      const k = (q.query || '').toLowerCase().trim();
      if (k) freq[k] = (freq[k] || 0) + 1;
    });
    const topKeywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([kw, cnt]) => ({ kw, cnt }));

    // ── revenue ──
    const cartRevenue = cartEvents.reduce((s, e) => s + normalizePrice(e.product_price || e.price || 0) * (e.quantity || 1), 0);
    const checkoutRevenue = checkoutEvents.reduce((s, e) => s + normalizePrice(e.cart_total || e.total || 0), 0);
    const totalRevenue = cartRevenue + checkoutRevenue;

    // ── conversions ──
    const uniqueSearches = Object.keys(freq).length;
    const convertingSearches = new Set(cartEvents.map(e => (e.search_query || '').toLowerCase().trim()).filter(Boolean)).size;
    const convRate = uniqueSearches > 0 ? (convertingSearches / uniqueSearches * 100) : 0;

    // ── zero-result searches ──
    const zeroResultQueries = queries.filter(q => q.resultsCount === 0 || q.results_count === 0);
    const zeroResultKeywords = {};
    zeroResultQueries.forEach(q => {
      const k = (q.query || '').toLowerCase().trim();
      if (k) zeroResultKeywords[k] = (zeroResultKeywords[k] || 0) + 1;
    });
    const topZeroResults = Object.entries(zeroResultKeywords).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // ── price sensitivity ──
    const priceQueries = queries.filter(q => q.minPrice || q.maxPrice);
    const priceRate = queries.length > 0 ? (priceQueries.length / queries.length * 100) : 0;

    // ── daily activity (last 14 days) ──
    const dailyMap = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      dailyMap[key] = { date: key, searches: 0, cart: 0, checkout: 0 };
    }
    queries.forEach(q => {
      const key = new Date(q.timestamp).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      if (dailyMap[key]) dailyMap[key].searches++;
    });
    cartEvents.forEach(e => {
      const key = new Date(parseEventTime(e.timestamp)).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      if (dailyMap[key]) dailyMap[key].cart++;
    });
    checkoutEvents.forEach(e => {
      const key = new Date(parseEventTime(e.timestamp)).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      if (dailyMap[key]) dailyMap[key].checkout++;
    });
    const dailyData = Object.values(dailyMap);

    // ── week-over-week search trend ──
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const thisWeek = queries.filter(q => new Date(q.timestamp) >= weekAgo).length;
    const lastWeek = queries.filter(q => new Date(q.timestamp) >= twoWeeksAgo && new Date(q.timestamp) < weekAgo).length;
    const searchTrend = lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : 0;

    // ── top revenue queries ──
    const revenueByQuery = {};
    cartEvents.forEach(e => {
      const k = e.search_query || 'אחר';
      revenueByQuery[k] = (revenueByQuery[k] || 0) + normalizePrice(e.product_price || 0) * (e.quantity || 1);
    });
    checkoutEvents.forEach(e => {
      const k = e.search_query || 'אחר';
      revenueByQuery[k] = (revenueByQuery[k] || 0) + normalizePrice(e.cart_total || 0);
    });
    const topRevenueQueries = Object.entries(revenueByQuery).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([q, rev]) => ({
      name: q.length > 20 ? q.slice(0, 20) + '…' : q,
      revenue: Math.round(rev)
    }));

    // ── avg searches per day ──
    const avgDaily = (queries.length / 30).toFixed(1);

    // ── click-to-cart rate ──
    const clickToCart = clickEvents.length > 0 ? (cartEvents.length / clickEvents.length * 100).toFixed(1) : 0;

    // ── category distribution ──
    const catMap = {};
    queries.forEach(q => {
      const cats = Array.isArray(q.category) ? q.category : [q.category].filter(Boolean);
      cats.forEach(c => { if (c && c !== 'unknown') catMap[c] = (catMap[c] || 0) + 1; });
    });
    const categoryData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

    // ── campaign suggestions ──
    const suggestions = [];

    // Suggestion 1: Zero results → add to catalog
    if (topZeroResults.length > 0) {
      suggestions.push({
        title: `הוסף מוצרים לקטלוג: "${topZeroResults[0][0]}"`,
        description: `${topZeroResults[0][1]} חיפושים לא קיבלו תוצאות. הוספת מוצרים רלוונטיים יכולה להגדיל הכנסות.`,
        type: 'catalog',
        priority: 'high',
        action: 'פתח ניהול מוצרים',
        metrics: [`${topZeroResults[0][1]} חיפושים ללא תוצאות`, 'הזדמנות מיידית']
      });
    }

    // Suggestion 2: Low conversion → boost top search
    if (convRate < 10 && topKeywords.length > 0) {
      suggestions.push({
        title: `שפר המרות עבור "${topKeywords[0].kw}"`,
        description: `שיעור ההמרה הנוכחי עומד על ${convRate.toFixed(1)}%. קדם מוצרים רלוונטיים וודא שתוצאות החיפוש מדויקות.`,
        type: 'boost',
        priority: 'high',
        action: 'נהל בוסטים',
        metrics: [`${convRate.toFixed(1)}% המרה`, `${topKeywords[0].cnt} חיפושים`]
      });
    }

    // Suggestion 3: Price-sensitive customers → create promotions
    if (priceRate > 25) {
      suggestions.push({
        title: 'צור מבצעי מחיר ממוקדים',
        description: `${Math.round(priceRate)}% מהלקוחות מסננים לפי מחיר. שקול מבצעים עונתיים ותוכניות נאמנות.`,
        type: 'pricing',
        priority: 'medium',
        action: 'עיין בניתוח מחירים',
        metrics: [`${Math.round(priceRate)}% רגישים למחיר`]
      });
    }

    // Suggestion 4: High-performing search → SEO
    if (topKeywords.length > 2) {
      suggestions.push({
        title: `מנף מילות מפתח לSEO: "${topKeywords[0].kw}"`,
        description: 'החיפושים הפופולריים ביותר מגלים כוונת קנייה. צור תכני SEO ממוקדים כדי להגדיל תנועה אורגנית.',
        type: 'seo',
        priority: 'medium',
        action: 'צפה בכל מילות המפתח',
        metrics: topKeywords.slice(0, 3).map(k => `${k.kw} (${k.cnt})`)
      });
    }

    // Suggestion 5: High search volume → remarketing
    if (queries.length > 100 && checkoutRevenue > 0) {
      const roas = checkoutRevenue > 0 ? (checkoutRevenue / 100).toFixed(0) : 0;
      suggestions.push({
        title: 'הפעל קמפיין ריטרגטינג',
        description: 'בעלי עגלה נטושה ומשתמשים שחיפשו ולא קנו הם קהל מצוין לריטרגטינג. הגדל את אחוז הסגירה.',
        type: 'conversion',
        priority: 'medium',
        action: 'נתח עגלות נטושות',
        metrics: [`${cartEvents.length} עגלות`, `${checkoutEvents.length} רכישות`]
      });
    }

    // Suggestion 6: Growing search trend → capitalize
    if (searchTrend > 15) {
      suggestions.push({
        title: 'גידול בחיפושים — פעל עכשיו!',
        description: `נפח החיפושים גדל ב-${searchTrend}% בשבוע האחרון. ודא שהמלאי שלך מוכן ושהמוצרים הנכונים מקודמים.`,
        type: 'boost',
        priority: 'high',
        action: 'בדוק מוצרים מקודמים',
        metrics: [`+${searchTrend}% גידול`, 'השבוע']
      });
    }

    return {
      topKeywords, totalRevenue, cartRevenue, checkoutRevenue,
      convRate, uniqueSearches, convertingSearches,
      topZeroResults, priceRate, dailyData, searchTrend,
      topRevenueQueries, avgDaily, clickToCart, categoryData,
      suggestions, totalSearches: queries.length,
      totalCart: cartEvents.length, totalCheckout: checkoutEvents.length,
      totalClicks: clickEvents.length,
    };
  }, [queries, cartEvents, checkoutEvents, clickEvents]);

  if (!dbName) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-indigo-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">אין חיבור לחנות</h3>
        <p className="text-gray-500 text-sm">השלם את תהליך ה-Onboarding כדי לראות תובנות עסקיות</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4" />
        <p className="text-gray-500 text-sm">טוען נתוני BI...</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">אין נתונים עדיין</h3>
        <p className="text-gray-500 text-sm">נתונים יופיעו לאחר שמשתמשים יתחילו לחפש בחנות שלך</p>
      </div>
    );
  }

  const { topKeywords, totalRevenue, convRate, dailyData, searchTrend, topRevenueQueries,
    avgDaily, categoryData, suggestions, totalSearches, totalCart, totalCheckout,
    clickToCart, priceRate, topZeroResults } = insights;

  return (
    <div className="w-full space-y-8" dir="rtl">

      {/* ── Page Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">תובנות עסקיות</h1>
                <p className="text-purple-200 text-sm">30 הימים האחרונים</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setRefreshing(true); fetchData(); }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            רענן נתונים
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="הכנסות מ-Semantix"
          value={`₪${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtitle={`עגלה + רכישות`}
          icon={DollarSign}
          color="emerald"
          trend={searchTrend > 0 ? searchTrend : undefined}
        />
        <KpiCard
          title="חיפושים"
          value={totalSearches.toLocaleString()}
          subtitle={`ממוצע ${avgDaily} ביום`}
          icon={Search}
          color="indigo"
          trend={searchTrend}
          trendLabel={searchTrend > 0 ? `+${searchTrend}% לעומת שבוע שעבר` : undefined}
        />
        <KpiCard
          title="שיעור המרה"
          value={`${convRate.toFixed(1)}%`}
          subtitle={`${totalCart} הוספות לעגלה`}
          icon={Target}
          color={convRate >= 15 ? 'emerald' : convRate >= 8 ? 'amber' : 'rose'}
          trendLabel={convRate >= 15 ? 'ביצועים מצוינים' : convRate < 5 ? 'יש מקום לשיפור' : 'ביצועים סבירים'}
        />
        <KpiCard
          title="רכישות"
          value={totalCheckout.toLocaleString()}
          subtitle={`לחיצה→עגלה: ${clickToCart}%`}
          icon={ShoppingCart}
          color="purple"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Daily Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">פעילות יומית — 14 ימים אחרונים</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="insightSearchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="insightCartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="insightCheckoutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="searches" name="חיפושים" stroke="#6366f1" fill="url(#insightSearchGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="cart" name="עגלה" stroke="#10b981" fill="url(#insightCartGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="checkout" name="רכישות" stroke="#8b5cf6" fill="url(#insightCheckoutGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-3">
            {[{ c: '#6366f1', l: 'חיפושים' }, { c: '#10b981', l: 'עגלה' }, { c: '#8b5cf6', l: 'רכישות' }].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: item.c }} />
                <span className="text-xs text-gray-500">{item.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        {categoryData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Package className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">פילוח קטגוריות</h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} contentStyle={{ direction: 'rtl', fontSize: 11, borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {categoryData.slice(0, 4).map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600">{cat.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{cat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Revenue by Query + Top Keywords ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue by Query Chart */}
        {topRevenueQueries.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">הכנסות לפי חיפוש</h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topRevenueQueries} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <XAxis type="number" tickFormatter={v => `₪${v.toLocaleString()}`} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#64748b', textAnchor: 'end' }} />
                <Tooltip formatter={v => [`₪${v.toLocaleString()}`, 'הכנסות']} contentStyle={{ direction: 'rtl', fontSize: 11, borderRadius: '8px' }} />
                <Bar dataKey="revenue" fill="url(#revGrad)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Keywords + Trends */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Flame className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">מילות מפתח מובילות</h3>
          </div>
          <div className="space-y-2">
            {topKeywords.slice(0, 8).map((item, i) => {
              const maxCnt = topKeywords[0].cnt;
              const pct = (item.cnt / maxCnt * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4 text-center">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-800">{item.kw}</span>
                      <span className="text-xs text-gray-500">{item.cnt}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Business Insights Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Key Insights */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Lightbulb className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">תובנות מרכזיות</h3>
          </div>
          <div>
            {topKeywords.length > 0 && (
              <InsightRow
                icon="🔥"
                title={`חיפוש הכי פופולרי: "${topKeywords[0].kw}"`}
                detail={`${topKeywords[0].cnt} חיפושים — ${((topKeywords[0].cnt / totalSearches) * 100).toFixed(1)}% מהסך הכל`}
                color="amber"
              />
            )}
            <InsightRow
              icon={convRate >= 15 ? '✅' : convRate >= 8 ? '📊' : '💡'}
              title={convRate >= 15 ? 'המרות מצוינות' : convRate >= 8 ? 'שיעור המרה סביר' : 'הזדמנות לשיפור המרות'}
              detail={`${convRate.toFixed(1)}% מהחיפושים הובילו להוספה לעגלה`}
              color={convRate >= 15 ? 'green' : convRate >= 8 ? 'blue' : 'rose'}
            />
            {priceRate > 20 && (
              <InsightRow
                icon="💰"
                title="לקוחות רגישים למחיר"
                detail={`${Math.round(priceRate)}% מהחיפושים כוללים סינון מחיר`}
                color="amber"
              />
            )}
            {topZeroResults.length > 0 && (
              <InsightRow
                icon="⚠️"
                title={`"${topZeroResults[0][0]}" — לא נמצאו תוצאות`}
                detail={`${topZeroResults[0][1]} חיפושים ללא תוצאה — שקול להוסיף מוצר`}
                color="rose"
              />
            )}
            {searchTrend > 0 && (
              <InsightRow
                icon="📈"
                title={`גידול של ${searchTrend}% בחיפושים`}
                detail="בהשוואה לשבוע הקודם — ניצל את המומנטום!"
                color="green"
              />
            )}
            {Number(avgDaily) > 10 && (
              <InsightRow
                icon="🏃"
                title="פעילות חיפוש גבוהה"
                detail={`ממוצע ${avgDaily} חיפושים ביום ב-30 הימים האחרונים`}
                color="blue"
              />
            )}
          </div>
        </div>

        {/* Zero Results Opportunities */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">הזדמנויות — חיפושים ללא תוצאות</h3>
          </div>
          {topZeroResults.length > 0 ? (
            <div className="space-y-2">
              {topZeroResults.map(([kw, cnt], i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-orange-50/60 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-500 w-4">{i + 1}</span>
                    <span className="text-sm font-semibold text-gray-800">"{kw}"</span>
                  </div>
                  <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{cnt} חיפושים</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-3">הוספת מוצרים עבור חיפושים אלה יכולה להגדיל הכנסות</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-emerald-700">מצוין! אין חיפושים ללא תוצאות</p>
              <p className="text-xs text-gray-400 mt-1">הקטלוג שלך מכסה את כל הדרישות</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Campaign Suggestions ── */}
      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">המלצות קמפיינים</h2>
              <p className="text-xs text-gray-500">המלצות מבוססות נתוני החיפוש שלך</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map((s, i) => <CampaignCard key={i} {...s} />)}
          </div>
        </div>
      )}

    </div>
  );
}
