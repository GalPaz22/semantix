'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ComposedChart, Line, CartesianGrid, Cell,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  Search, ShoppingCart, MousePointer2, CreditCard, RefreshCw,
  Clock, Calendar, BarChart3, AlertTriangle, CheckCircle,
  ArrowUpRight, ArrowDownRight, Target, Activity,
  Users, Tag, Layers, TrendingUp, TrendingDown, Zap,
  Eye, Star, Package
} from 'lucide-react';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function parseTs(ts) {
  if (!ts) return 0;
  if (ts instanceof Date) return ts.getTime();
  const n = Number(ts);
  if (!isNaN(n)) return n < 1e12 ? n * 1000 : n;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function safeRate(num, den, digits = 1) {
  if (!den || den === 0 || !num) return 0;
  return +((num / den) * 100).toFixed(digits);
}

function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString('he-IL');
}

// Profiles data helpers (mirroring UserProfilesPanel)
function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(item => {
        if (typeof item === 'string') return { label: item, count: 1 };
        const label = item.name || item.tag || item.label || item.key || String(item);
        const count = Number(item.count || item.clicks || item.clickCount || item.value || 1);
        return { label, count };
      })
      .filter(t => t.label)
      .sort((a, b) => b.count - a.count);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([label, count]) => ({ label, count: Number(count) || 1 }))
      .sort((a, b) => b.count - a.count);
  }
  return [];
}

function parseCats(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function getLastVisitMs(profile) {
  const ts = profile.newestVisit || profile.newest_visit || profile.lastVisit
    || profile.last_visit || profile.lastSeen || profile.updatedAt;
  return ts ? new Date(ts).getTime() : 0;
}

function profileTagClicks(profile) {
  return parseTags(profile.tags).reduce((s, t) => s + t.count, 0);
}

// ── Design atoms ──────────────────────────────────────────────────────────────

// RTL progress bar — fills from right
function RtlBar({ pct, color = '#6366f1', height = 'h-2', rounded = 'rounded-full' }) {
  return (
    <div className={`relative w-full bg-gray-100 ${rounded} ${height} overflow-hidden`}>
      <div
        className={`absolute inset-y-0 right-0 ${rounded} transition-all duration-500`}
        style={{ width: `${Math.min(Math.max(pct, 1), 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// KPI card
function KpiCard({ label, value, sub, icon: Icon, gradient, trend, highlight }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-5
      ${highlight ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
            ${trend > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// Section header
function SectionHeader({ icon: Icon, color, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className={`p-2 ${color} rounded-lg`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
const TOOLTIP_STYLE = { direction: 'rtl', fontSize: 11, borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' };

// ── Main panel ────────────────────────────────────────────────────────────────
export default function SearchBehaviorPanel({ session, onboarding }) {
  const dbName = onboarding?.credentials?.dbName || onboarding?.dbName;

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [queries, setQueries]           = useState([]);
  const [cartEvents, setCartEvents]     = useState([]);
  const [checkoutEvents, setCheckoutEvents] = useState([]);
  const [clickEvents, setClickEvents]   = useState([]);
  const [profiles, setProfiles]         = useState([]);
  const [profileMeta, setProfileMeta]   = useState(null);

  const endDate   = new Date().toISOString().split('T')[0];
  const startDate = (() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  const fetchData = async () => {
    if (!dbName) { setLoading(false); return; }
    setLoading(true);
    try {
      const [qRes, perfRes, clickRes, profRes] = await Promise.all([
        fetch('/api/analytics/queries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, startDate, endDate }),
        }),
        fetch('/api/analytics/performance', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, startDate, endDate }),
        }),
        fetch('/api/cart-analytics', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, type: 'clicks', startDate, endDate }),
        }),
        fetch('/api/profiles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName }),
        }),
      ]);

      const [qData, perfData, clickData, profData] = await Promise.all([
        qRes.ok   ? qRes.json()    : {},
        perfRes.ok? perfRes.json() : {},
        clickRes.ok? clickRes.json(): {},
        profRes.ok? profRes.json() : {},
      ]);

      setQueries(qData.queries || []);
      setCartEvents(perfData.cart || []);
      setCheckoutEvents(perfData.checkout || []);
      setClickEvents(clickData.clickEvents || []);
      setProfiles(profData.profiles || []);
      setProfileMeta(profData.meta || null);
    } catch (e) {
      console.error('SearchBehaviorPanel fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [dbName]);

  // ─── All derived analytics ─────────────────────────────────────────────────
  const data = useMemo(() => {
    const hasData = queries.length || clickEvents.length || cartEvents.length || profiles.length;
    if (!hasData) return null;

    const now = new Date();
    const NOW = now.getTime();
    const D7  = NOW - 7  * 864e5;
    const D30 = NOW - 30 * 864e5;
    const D90 = NOW - 90 * 864e5;

    // ── Funnel ──────────────────────────────────────────────────────────────
    const totalSearches  = queries.length;
    const totalClicks    = clickEvents.length;
    const totalATC       = cartEvents.length;
    const totalCheckout  = checkoutEvents.length;

    const ctr           = safeRate(totalClicks, totalSearches);
    const clickToATC    = safeRate(totalATC, totalClicks);
    const atcToCheckout = safeRate(totalCheckout, totalATC);
    const overallConv   = safeRate(totalCheckout, totalSearches, 2);

    // WoW trends
    const weekAgo     = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14);

    const isTs = (q, from, to) => {
      const t = new Date(q.timestamp);
      return !isNaN(t) && t >= from && (!to || t < to);
    };
    const thisWeekQ  = queries.filter(q => isTs(q, weekAgo)).length;
    const lastWeekQ  = queries.filter(q => isTs(q, twoWeeksAgo, weekAgo)).length;
    const qTrend     = lastWeekQ > 0 ? Math.round((thisWeekQ - lastWeekQ) / lastWeekQ * 100) : 0;

    const thisWeekATC = cartEvents.filter(e => parseTs(e.timestamp) >= weekAgo.getTime()).length;
    const lastWeekATC = cartEvents.filter(e => { const t = parseTs(e.timestamp); return t >= twoWeeksAgo.getTime() && t < weekAgo.getTime(); }).length;
    const atcTrend    = lastWeekATC > 0 ? Math.round((thisWeekATC - lastWeekATC) / lastWeekATC * 100) : 0;

    // ── Daily timeline (14 days) ────────────────────────────────────────────
    const dailyMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      dailyMap[key] = { date: key, searches: 0, clicks: 0, atc: 0, checkout: 0 };
    }
    const dayKey = ts => ts ? new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : null;
    queries.forEach(q => { const k = dayKey(q.timestamp); if (k && dailyMap[k]) dailyMap[k].searches++; });
    clickEvents.forEach(e => { const ts = parseTs(e.timestamp || e.time || e.event_time); if (!ts) return; const k = dayKey(ts); if (k && dailyMap[k]) dailyMap[k].clicks++; });
    cartEvents.forEach(e => { const ts = parseTs(e.timestamp); if (!ts) return; const k = dayKey(ts); if (k && dailyMap[k]) dailyMap[k].atc++; });
    checkoutEvents.forEach(e => { const ts = parseTs(e.timestamp); if (!ts) return; const k = dayKey(ts); if (k && dailyMap[k]) dailyMap[k].checkout++; });
    const dailyData = Object.values(dailyMap);

    // ── Hourly distribution ─────────────────────────────────────────────────
    const hourlyArr = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, searches: 0 }));
    queries.forEach(q => { if (!q.timestamp) return; const t = new Date(q.timestamp); if (!isNaN(t)) hourlyArr[t.getHours()].searches++; });
    const peakEntry = hourlyArr.reduce((mx, h) => h.searches > mx.searches ? h : mx, hourlyArr[0]);

    // ── Day-of-week ─────────────────────────────────────────────────────────
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dowArr = dayNames.map(d => ({ day: d, searches: 0, atc: 0 }));
    queries.forEach(q => { if (!q.timestamp) return; const t = new Date(q.timestamp); if (!isNaN(t)) dowArr[t.getDay()].searches++; });
    cartEvents.forEach(e => { const ts = parseTs(e.timestamp); if (!ts) return; dowArr[new Date(ts).getDay()].atc++; });

    // ── Search performance matrix ───────────────────────────────────────────
    const perfMap = {};
    queries.forEach(q => {
      const k = (q.query || '').trim().toLowerCase();
      if (!k) return;
      if (!perfMap[k]) perfMap[k] = { query: k, searches: 0, clicks: 0, atc: 0, revenue: 0, zeroResults: false };
      perfMap[k].searches++;
      if ((q.resultsCount ?? q.results_count) === 0) perfMap[k].zeroResults = true;
    });
    clickEvents.forEach(e => {
      const k = (e.search_query || '').trim().toLowerCase();
      if (k && perfMap[k]) perfMap[k].clicks++;
    });
    cartEvents.forEach(e => {
      const k = (e.search_query || '').trim().toLowerCase();
      if (k && perfMap[k]) {
        perfMap[k].atc++;
        const p = parseFloat(String(e.product_price || e.price || 0).replace(/[^0-9.]/g, '')) || 0;
        perfMap[k].revenue += p * (Number(e.quantity) || 1);
      }
    });
    const searchPerfList = Object.values(perfMap)
      .map(s => ({ ...s, ctr: safeRate(s.clicks, s.searches), conv: safeRate(s.atc, s.searches) }))
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 20);

    // ── Top clicked products ────────────────────────────────────────────────
    const productMap = {};
    clickEvents.forEach(e => {
      const key = String(e.product_id || e.product_name || '?');
      const name = e.product_name || e.product_id || 'לא ידוע';
      if (!productMap[key]) productMap[key] = { name, clicks: 0, atc: 0 };
      productMap[key].clicks++;
    });
    cartEvents.forEach(e => {
      const key = String(e.product_id || e.product_name || '?');
      if (productMap[key]) productMap[key].atc++;
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.clicks - a.clicks).slice(0, 10)
      .map(p => ({ ...p, convRate: safeRate(p.atc, p.clicks) }));

    // ── Zero results ────────────────────────────────────────────────────────
    const zeroMap = {};
    queries.filter(q => (q.resultsCount ?? q.results_count) === 0).forEach(q => {
      const k = (q.query || '').trim().toLowerCase();
      if (k) zeroMap[k] = (zeroMap[k] || 0) + 1;
    });
    const topZeroResults = Object.entries(zeroMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // ATC bar chart
    const atcBarData = Object.values(productMap)
      .sort((a, b) => b.atc - a.atc).slice(0, 8)
      .map(p => ({ name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name, atc: p.atc, clicks: p.clicks }));

    // ─────────────────────────────────────────────────────────────────────────
    // PROFILES INTELLIGENCE
    // ─────────────────────────────────────────────────────────────────────────

    // Activity buckets
    const profActive7d  = profiles.filter(p => getLastVisitMs(p) >= D7).length;
    const profActive30d = profiles.filter(p => getLastVisitMs(p) >= D30).length;
    const profDormant   = profiles.filter(p => { const t = getLastVisitMs(p); return t > 0 && t < D90; }).length;
    const totalProfiles = profiles.length;
    const totalTagClicks = profiles.reduce((s, p) => s + profileTagClicks(p), 0);
    const avgClicksPerProfile = totalProfiles > 0 ? (totalTagClicks / totalProfiles).toFixed(1) : 0;

    // Category distribution across all profiles
    const catFreq = {};
    profiles.forEach(p => {
      const cats = [
        ...parseCats(p.softCategories || p.softCategory || p.soft_categories),
        ...parseCats(p.categories || p.hardCategories || p.category || p.hard_categories),
      ];
      cats.forEach(c => { if (c) catFreq[c] = (catFreq[c] || 0) + 1; });
    });
    const catDistribution = Object.entries(catFreq)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name, count, pct: safeRate(count, totalProfiles) }));
    const topCategory = catDistribution[0]?.name || null;

    // Tag (product attribute) affinity across all profiles
    const tagFreq = {};
    profiles.forEach(p => {
      parseTags(p.tags).forEach(t => {
        if (t.label) tagFreq[t.label] = (tagFreq[t.label] || 0) + t.count;
      });
    });
    const topProductTags = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([label, count]) => ({ label, count }));
    const maxTagCount = topProductTags[0]?.count || 1;

    // ── Cross-reference: profile session → cart/click behavior ──────────────
    // Map: sessionId → primary category (first hard cat, else first soft cat)
    const sessionToCat = {};
    profiles.forEach(p => {
      const sid = p.sessionId || p.session_id;
      if (!sid) return;
      const hard = parseCats(p.categories || p.hardCategories || p.category || p.hard_categories);
      const soft = parseCats(p.softCategories || p.softCategory || p.soft_categories);
      const primary = hard[0] || soft[0] || null;
      if (primary) sessionToCat[sid] = primary;
    });

    // Aggregate clicks + ATCs per category (via session cross-ref)
    const catClicks = {}; const catATC = {};
    clickEvents.forEach(e => {
      const cat = sessionToCat[e.session_id];
      if (cat) catClicks[cat] = (catClicks[cat] || 0) + 1;
    });
    cartEvents.forEach(e => {
      const cat = sessionToCat[e.session_id];
      if (cat) catATC[cat] = (catATC[cat] || 0) + 1;
    });

    // Segment performance table (category × behaviour)
    const segmentData = catDistribution.slice(0, 7).map(({ name, count }) => ({
      name,
      profiles: count,
      clicks: catClicks[name] || 0,
      atc: catATC[name] || 0,
      convRate: safeRate(catATC[name] || 0, catClicks[name] || count),
      engRate: safeRate((catClicks[name] || 0) + (catATC[name] || 0), count),
    })).sort((a, b) => b.atc - a.atc);

    // Profile recency timeline for chart
    const recencyData = [
      { label: '7 ימים', value: profActive7d, fill: '#10b981' },
      { label: '30 ימים', value: profActive30d - profActive7d, fill: '#6366f1' },
      { label: '90 ימים', value: profiles.filter(p => { const t = getLastVisitMs(p); return t >= D90 && t < D30; }).length, fill: '#f59e0b' },
      { label: 'לא פעיל', value: profDormant, fill: '#e2e8f0' },
    ].filter(d => d.value > 0);

    // Top engaged profiles (by tag clicks)
    const topEngagedProfiles = [...profiles]
      .map(p => ({ ...p, tagClicks: profileTagClicks(p) }))
      .filter(p => p.tagClicks > 0)
      .sort((a, b) => b.tagClicks - a.tagClicks)
      .slice(0, 5);

    return {
      // Funnel
      totalSearches, totalClicks, totalATC, totalCheckout,
      ctr, clickToATC, atcToCheckout, overallConv,
      qTrend, atcTrend,
      // Time charts
      dailyData, hourlyArr, peakEntry, dowArr,
      // Search
      searchPerfList, topZeroResults,
      // Products
      topProducts, atcBarData,
      // Profiles
      totalProfiles, profActive7d, profActive30d, profDormant,
      avgClicksPerProfile, totalTagClicks, topCategory,
      catDistribution, topProductTags, maxTagCount,
      segmentData, recencyData, topEngagedProfiles,
    };
  }, [queries, clickEvents, cartEvents, checkoutEvents, profiles]);

  // ── Empty states ──────────────────────────────────────────────────────────
  if (!dbName) return (
    <div className="flex flex-col items-center justify-center py-24 text-center" dir="rtl">
      <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
        <Activity className="h-8 w-8 text-indigo-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">אין חיבור לחנות</h3>
      <p className="text-gray-500 text-sm">השלם את תהליך ה-Onboarding כדי לראות ניתוח התנהגות</p>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24" dir="rtl">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4" />
      <p className="text-gray-500 text-sm">טוען נתונים...</p>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-24 text-center" dir="rtl">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Activity className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">אין נתונים עדיין</h3>
      <p className="text-gray-500 text-sm">נתונים יופיעו לאחר שמשתמשים יתחילו לחפש בחנות</p>
    </div>
  );

  const {
    totalSearches, totalClicks, totalATC, totalCheckout,
    ctr, clickToATC, atcToCheckout, overallConv, qTrend, atcTrend,
    dailyData, hourlyArr, peakEntry, dowArr,
    searchPerfList, topZeroResults,
    topProducts, atcBarData,
    totalProfiles, profActive7d, profActive30d,
    avgClicksPerProfile, topCategory,
    catDistribution, topProductTags, maxTagCount,
    segmentData, recencyData, topEngagedProfiles,
  } = data;

  const funnelSteps = [
    { label: 'חיפושים', value: totalSearches, color: '#6366f1' },
    { label: 'לחיצות מוצרים', value: totalClicks, color: '#8b5cf6' },
    { label: 'הוספות לעגלה', value: totalATC, color: '#10b981' },
    { label: 'רכישות', value: totalCheckout, color: '#f59e0b' },
  ];

  return (
    <div className="w-full space-y-8" dir="rtl">

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER                                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, white 1px, transparent 1px), radial-gradient(circle at 85% 20%, white 1px, transparent 1px)', backgroundSize: '55px 55px' }} />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">מסע הלקוח</h1>
              <p className="text-blue-200 text-sm">חיפוש ← לחיצה ← עגלה ← רכישה | קהל + פרופילים | 30 ימים</p>
            </div>
          </div>
          <button
            onClick={() => { setRefreshing(true); fetchData(); }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-sm font-medium flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            רענן נתונים
          </button>
        </div>
        {/* summary chips */}
        <div className="relative px-6 sm:px-8 pb-5 flex flex-wrap gap-2">
          {[
            { label: `${fmtNum(totalSearches)} חיפושים`, color: 'bg-white/15' },
            { label: `${fmtNum(totalClicks)} לחיצות`, color: 'bg-white/15' },
            { label: `${fmtNum(totalATC)} עגלות`, color: 'bg-white/15' },
            { label: `${fmtNum(totalProfiles)} פרופילים`, color: 'bg-emerald-500/30' },
            { label: `${overallConv}% המרה`, color: overallConv >= 1 ? 'bg-emerald-500/30' : 'bg-rose-500/25' },
          ].map((c, i) => (
            <span key={i} className={`${c.color} text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm`}>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FUNNEL KPIs                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="חיפושים" value={fmtNum(totalSearches)}
          sub={`ממוצע ${(totalSearches / 30).toFixed(1)}/יום`}
          icon={Search} gradient="from-indigo-500 to-indigo-600" trend={qTrend} />
        <KpiCard label="לחיצות על מוצרים" value={fmtNum(totalClicks)}
          sub={`CTR: ${ctr}%`}
          icon={MousePointer2} gradient="from-purple-500 to-purple-600" />
        <KpiCard label="הוספות לעגלה" value={fmtNum(totalATC)}
          sub={`מלחיצות: ${clickToATC}%`}
          icon={ShoppingCart} gradient="from-emerald-500 to-emerald-600" trend={atcTrend} />
        <KpiCard label="רכישות" value={fmtNum(totalCheckout)}
          sub={`המרה כוללת: ${overallConv}%`}
          icon={CreditCard} gradient="from-amber-500 to-amber-600" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FUNNEL VISUAL + DAILY CHART                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={Target} color="bg-indigo-50 text-indigo-600" title="משפך המרה" />
          <div className="space-y-4">
            {funnelSteps.map((step, i) => {
              const dropPct = i > 0 && funnelSteps[i - 1].value > 0
                ? safeRate(step.value, funnelSteps[i - 1].value) : undefined;
              const totalPct = safeRate(step.value, totalSearches);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: step.color }} />
                      <span className="text-xs font-semibold text-gray-700">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-mono">{step.value.toLocaleString()}</span>
                      {dropPct !== undefined && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded
                          ${dropPct >= 50 ? 'text-emerald-700 bg-emerald-50' : dropPct >= 20 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'}`}>
                          {dropPct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <RtlBar pct={totalPct} color={step.color} height="h-3" />
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-5 border-t border-gray-50 grid grid-cols-3 gap-2">
            {[
              { label: 'חיפוש ← לחיצה', value: `${ctr}%` },
              { label: 'לחיצה ← עגלה', value: `${clickToATC}%` },
              { label: 'עגלה ← רכישה', value: `${atcToCheckout}%` },
            ].map((r, i) => (
              <div key={i} className="text-center bg-gray-50 rounded-xl py-2.5 px-1">
                <p className="text-sm font-bold text-gray-900">{r.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{r.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={Calendar} color="bg-blue-50 text-blue-600" title="פעילות יומית" subtitle="14 ימים אחרונים" />
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sbSearchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="searches" name="חיפושים" stroke="#6366f1" fill="url(#sbSearchGrad)" strokeWidth={2} dot={false} />
              <Bar dataKey="clicks" name="לחיצות" fill="#8b5cf6" opacity={0.75} radius={[2, 2, 0, 0]} />
              <Bar dataKey="atc" name="עגלה" fill="#10b981" opacity={0.85} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="checkout" name="רכישות" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-3">
            {[{ c: '#6366f1', l: 'חיפושים', line: false }, { c: '#8b5cf6', l: 'לחיצות', line: false }, { c: '#10b981', l: 'עגלה', line: false }, { c: '#f59e0b', l: 'רכישות', line: true }].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {item.line ? <div className="w-5 h-0.5 rounded" style={{ backgroundColor: item.c }} /> : <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.c }} />}
                <span className="text-xs text-gray-500">{item.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* AUDIENCE INTELLIGENCE                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {totalProfiles > 0 && (
        <>
          {/* Audience KPI row */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 sm:p-8">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            <div className="relative flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">ניתוח קהל</h2>
                <p className="text-purple-200 text-xs">פרופילי משתמשים × פעילות חיפוש</p>
              </div>
            </div>
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Users, label: 'פרופילים', value: fmtNum(totalProfiles), sub: 'סה״כ ב-DB', light: true },
                { icon: Activity, label: 'פעילים 7 ימים', value: fmtNum(profActive7d), sub: `${safeRate(profActive7d, totalProfiles)}% מהקהל`, light: profActive7d > 0 },
                { icon: MousePointer2, label: 'ממוצע לחיצות', value: avgClicksPerProfile, sub: 'לחיצות/פרופיל', light: true },
                { icon: Star, label: 'קטגוריה מובילה', value: topCategory || '—', sub: `${catDistribution[0]?.pct || 0}% מהפרופילים`, light: !!topCategory },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <item.icon className={`h-5 w-5 mb-2 ${item.light ? 'text-white' : 'text-white/50'}`} />
                  <p className="text-xl font-bold text-white truncate">{item.value}</p>
                  <p className="text-xs font-medium text-purple-100 mt-0.5">{item.label}</p>
                  <p className="text-[10px] text-purple-300 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Audience segments + Category distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Segment performance table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <SectionHeader icon={Layers} color="bg-violet-50 text-violet-600" title="סגמנטי קהל" subtitle="ביצועים לפי קטגוריה × פרופיל" />
              {segmentData.length > 0 ? (
                <div className="space-y-3">
                  {segmentData.map((seg, i) => {
                    const maxATC = segmentData[0]?.atc || 1;
                    const barPct = maxATC > 0 ? safeRate(seg.atc, maxATC) : 0;
                    const convColor = seg.convRate >= 20 ? 'text-emerald-700 bg-emerald-50' : seg.convRate >= 8 ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-50';
                    return (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl hover:bg-indigo-50/40 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                            <span className="text-sm font-semibold text-gray-800 truncate max-w-[130px]">{seg.name}</span>
                            <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-md border flex-shrink-0">
                              {seg.profiles} פרופ'
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-purple-600 font-bold">{seg.clicks} לח'</span>
                            <span className="text-xs text-emerald-600 font-bold">{seg.atc} עגלה</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${convColor}`}>
                              {seg.convRate}%
                            </span>
                          </div>
                        </div>
                        <RtlBar pct={barPct} color={CHART_COLORS[i % CHART_COLORS.length]} height="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Layers className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">אין נתוני קטגוריות בפרופילים</p>
                </div>
              )}
            </div>

            {/* Category distribution chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <SectionHeader icon={BarChart3} color="bg-indigo-50 text-indigo-600" title="פילוח קטגוריות קהל" subtitle="חלוקת פרופילים לפי קטגוריה" />
              {catDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={catDistribution} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <YAxis type="category" dataKey="name" orientation="right" width={120}
                        tick={{ fontSize: 10, fill: '#64748b', textAnchor: 'start' }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v, 'פרופילים']} />
                      <Bar dataKey="count" radius={[4, 0, 0, 4]}>
                        {catDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-1.5">
                    {catDistribution.slice(0, 4).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-gray-600">{cat.name}</span>
                        </div>
                        <span className="font-semibold text-gray-700">{cat.count} <span className="text-gray-400 font-normal">({cat.pct}%)</span></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <BarChart3 className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">לא נמצאו קטגוריות בפרופילים</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Affinity Tags + Recency + Top Profiles */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Product affinity tags */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <SectionHeader icon={Tag} color="bg-amber-50 text-amber-600" title="זיקת מוצרים" subtitle="מוצרים שנלחצו הכי הרבה בין כל הפרופילים" />
              {topProductTags.length > 0 ? (
                <div className="space-y-2.5">
                  {topProductTags.slice(0, 10).map((tag, i) => {
                    const pct = safeRate(tag.count, maxTagCount);
                    const heatColor = pct >= 75 ? '#ef4444' : pct >= 50 ? '#8b5cf6' : pct >= 25 ? '#6366f1' : '#06b6d4';
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-800 truncate max-w-[200px]">{tag.label}</span>
                            <span className="text-xs font-bold flex-shrink-0 mr-3" style={{ color: heatColor }}>{tag.count.toLocaleString()}</span>
                          </div>
                          <RtlBar pct={pct} color={heatColor} height="h-1.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Tag className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">אין נתוני תגיות בפרופילים</p>
                </div>
              )}
            </div>

            {/* Top engaged profiles + Recency */}
            <div className="space-y-6">
              {/* Profile recency */}
              {recencyData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <SectionHeader icon={Eye} color="bg-emerald-50 text-emerald-600" title="עדכניות קהל" />
                  <div className="space-y-2">
                    {recencyData.map((bucket, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bucket.fill }} />
                          <span className="text-xs text-gray-600">{bucket.label}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800">{bucket.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-1 h-3 rounded-full overflow-hidden">
                    {recencyData.map((bucket, i) => (
                      <div key={i} className="h-full" style={{ backgroundColor: bucket.fill, flex: bucket.value }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top engaged profiles */}
              {topEngagedProfiles.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <SectionHeader icon={Zap} color="bg-rose-50 text-rose-500" title="פרופילים מובילים" subtitle="לפי כמות לחיצות" />
                  <div className="space-y-2.5">
                    {topEngagedProfiles.map((prof, i) => {
                      const sid = prof.sessionId || prof.session_id;
                      const displayId = sid ? (sid.length > 10 ? '…' + sid.slice(-8) : sid) : String(prof._id || '?').slice(-8);
                      const cats = [
                        ...parseCats(prof.categories || prof.hardCategories || prof.category),
                        ...parseCats(prof.softCategories || prof.softCategory),
                      ].slice(0, 2);
                      return (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-700 font-mono truncate">{displayId}</p>
                            {cats.length > 0 && (
                              <p className="text-[10px] text-gray-400 truncate">{cats.join(' · ')}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <MousePointer2 className="h-3 w-3 text-purple-400" />
                            <span className="text-sm font-bold text-purple-700">{prof.tagClicks}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HOURLY + DAY-OF-WEEK                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-4 w-4 text-amber-600" /></div>
              <h3 className="text-sm font-bold text-gray-900">שעות שיא</h3>
            </div>
            {peakEntry?.searches > 0 && (
              <div className="bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
                שיא: {peakEntry.hour}
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyArr} margin={{ top: 0, right: 10, left: -24, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#94a3b8' }} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v, 'חיפושים']} />
              <Bar dataKey="searches" radius={[3, 3, 0, 0]}>
                {hourlyArr.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.hour === peakEntry?.hour ? '#f59e0b' : '#6366f1'}
                    opacity={peakEntry?.searches > 0 ? 0.35 + (entry.searches / (peakEntry.searches || 1)) * 0.65 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day of week */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={Calendar} color="bg-cyan-50 text-cyan-600" title="חיפושים לפי יום" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowArr} margin={{ top: 0, right: 10, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="searches" name="חיפושים" fill="#06b6d4" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Bar dataKey="atc" name="עגלה" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {[{ c: '#06b6d4', l: 'חיפושים' }, { c: '#10b981', l: 'עגלה' }].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.c }} />
                <span className="text-xs text-gray-500">{item.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEARCH PERFORMANCE TABLE                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg"><BarChart3 className="h-4 w-4 text-indigo-600" /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">ביצועי מילות חיפוש</h3>
              <p className="text-xs text-gray-400">חיפוש ← לחיצה ← עגלה לכל ביטוי</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border">Top {searchPerfList.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-100">
                {['#', 'ביטוי חיפוש', 'חיפושים', 'לחיצות', 'CTR', 'עגלה', 'המרה', 'ביצוע'].map((h, i) => (
                  <th key={i} className="text-right text-xs font-semibold text-gray-400 pb-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {searchPerfList.map((item, i) => {
                const convColor = item.zeroResults ? 'bg-orange-50 text-orange-600'
                  : item.conv >= 15 ? 'bg-emerald-50 text-emerald-700'
                  : item.conv >= 5  ? 'bg-amber-50 text-amber-700'
                  : 'bg-rose-50 text-rose-600';
                const badgeColor = item.conv >= 15 ? 'bg-emerald-50 text-emerald-700'
                  : item.conv >= 5  ? 'bg-amber-50 text-amber-700'
                  : 'bg-gray-100 text-gray-500';
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3 text-xs font-bold text-gray-300">{i + 1}</td>
                    <td className="py-3 font-semibold text-gray-800 text-sm max-w-[150px]">
                      <span className="block truncate">{item.query}</span>
                    </td>
                    <td className="py-3 text-xs font-mono text-gray-600">{item.searches}</td>
                    <td className="py-3 text-xs font-mono text-purple-600">{item.clicks}</td>
                    <td className="py-3 text-xs font-mono text-gray-500">{item.ctr}%</td>
                    <td className="py-3 text-xs font-mono text-emerald-600 font-semibold">{item.atc}</td>
                    <td className="py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${convColor}`}>
                        {item.zeroResults ? '⚠ ללא' : `${item.conv}%`}
                      </span>
                    </td>
                    <td className="py-3">
                      {!item.zeroResults && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {item.conv >= 15 ? 'גבוה' : item.conv >= 5 ? 'בינוני' : 'נמוך'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TOP PRODUCTS + ZERO RESULTS                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top clicked products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={MousePointer2} color="bg-purple-50 text-purple-600" title="מוצרים שנלחצו מחיפוש" subtitle="לחיצות ← הוספה לעגלה" />
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((prod, i) => {
                const maxClicks = topProducts[0]?.clicks || 1;
                const barW = safeRate(prod.clicks, maxClicks);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-gray-300 w-5 flex-shrink-0">{i + 1}</span>
                        <span className="text-xs font-semibold text-gray-800 truncate max-w-[160px]">{prod.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-purple-600 font-bold">{prod.clicks}</span>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-emerald-600 font-bold">{prod.atc}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${prod.convRate >= 30 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}>
                          {prod.convRate}%
                        </span>
                      </div>
                    </div>
                    <RtlBar pct={barW} color="#8b5cf6" height="h-1.5" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MousePointer2 className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">אין נתוני לחיצות עדיין</p>
            </div>
          )}
        </div>

        {/* Zero results */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={AlertTriangle} color="bg-orange-50 text-orange-600" title="חיפושים ללא תוצאות" subtitle="הזדמנויות לשיפור הקטלוג" />
          {topZeroResults.length > 0 ? (
            <div className="space-y-3">
              {topZeroResults.map(([kw, cnt], i) => {
                const pct = safeRate(cnt, topZeroResults[0][1]);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-300 w-5">{i + 1}</span>
                        <span className="text-sm font-semibold text-gray-800">"{kw}"</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600">
                        {cnt} <span className="text-xs font-normal text-gray-400">חיפושים</span>
                      </span>
                    </div>
                    <RtlBar pct={pct} color="#fb923c" height="h-1.5" />
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-50 text-center">
                הוספת מוצרים אלה יכולה להגדיל הכנסות מיידית
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-400 mb-3" />
              <p className="text-sm font-semibold text-emerald-700 mb-1">מצוין! אין חיפושים ללא תוצאות</p>
              <p className="text-xs text-gray-400">הקטלוג שלך מכסה את כל הדרישות</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ATC BY PRODUCT                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {atcBarData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={ShoppingCart} color="bg-emerald-50 text-emerald-600" title="מוצרים מובילים — הוספות לעגלה" />
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={atcBarData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="atcBarGrad" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <YAxis type="category" dataKey="name" orientation="right" width={145}
                tick={{ fontSize: 10, fill: '#64748b', textAnchor: 'start' }} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n === 'atc' ? 'הוספות לעגלה' : 'לחיצות']} />
              <Bar dataKey="atc" name="atc" fill="url(#atcBarGrad)" radius={[6, 0, 0, 6]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}
