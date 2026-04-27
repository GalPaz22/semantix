'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, RefreshCw, AlertCircle, Activity, Wifi,
  Clock, Tag, ChevronDown, ChevronUp, Calendar, Eye,
  MousePointerClick, Layers, Filter, X
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return null;
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'עכשיו';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `לפני ${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs} שע'`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'אתמול';
  if (days < 30) return `לפני ${days} ימים`;
  const months = Math.floor(days / 30);
  return `לפני ${months} חודשים`;
}

function fmtDate(ts) {
  if (!ts) return null;
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Parse tags — handles {key:count}, [{name,count}], [{tag,clicks}], string[]
function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(item => {
        if (typeof item === 'string') return { label: item, count: 1 };
        const label = item.name || item.tag || item.label || item.key || String(item);
        const count = item.count || item.clicks || item.clickCount || item.value || 1;
        return { label, count: Number(count) };
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

// Parse string[] or comma-separated string categories
function parseCats(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// Heat colour for click count (low→blue, mid→indigo, high→purple/rose)
function tagHeat(count, max) {
  if (!max || max === 0) return { bg: 'bg-gray-100', text: 'text-gray-600' };
  const ratio = count / max;
  if (ratio >= 0.75) return { bg: 'bg-rose-100', text: 'text-rose-700' };
  if (ratio >= 0.5) return { bg: 'bg-purple-100', text: 'text-purple-700' };
  if (ratio >= 0.25) return { bg: 'bg-indigo-100', text: 'text-indigo-700' };
  return { bg: 'bg-blue-50', text: 'text-blue-600' };
}

const ID_COLORS = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-fuchsia-500 to-purple-600',
];
function colorForId(id) {
  if (!id) return ID_COLORS[0];
  const n = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return ID_COLORS[n % ID_COLORS.length];
}

function shortId(id) {
  const s = String(id);
  return s.length > 12 ? '…' + s.slice(-8) : s;
}

// ── ProfileCard ───────────────────────────────────────────────────────────────

function ProfileCard({ profile, isConnected }) {
  const [expanded, setExpanded] = useState(false);

  // ── field extraction (resilient to naming variations) ──
  const id = profile._id || profile.id || profile.sessionId || '?';
  const sessionId = profile.sessionId || profile.session_id || null;

  // timestamps
  const firstVisit = profile.firstVisit || profile.first_visit || profile.firstSeen || profile.createdAt;
  const lastVisit  = profile.newestVisit || profile.newest_visit || profile.lastVisit || profile.last_visit || profile.lastSeen || profile.updatedAt;
  const ts         = profile.timestamp || lastVisit || firstVisit;

  // categories
  const softCats = parseCats(profile.softCategories || profile.softCategory || profile.soft_categories);
  const hardCats = parseCats(profile.categories || profile.hardCategories || profile.category || profile.hard_categories);

  // tags with click counts
  const tags = parseTags(profile.tags);
  const maxTagCount = tags[0]?.count || 1;

  // derived
  const totalClicks = tags.reduce((s, t) => s + t.count, 0);
  const topTag = tags[0]?.label || null;
  const grad = colorForId(String(id));
  const initials = sessionId ? sessionId.slice(0, 2).toUpperCase() : shortId(id).slice(-2).toUpperCase();

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all duration-200
      ${isConnected ? 'border-indigo-400 ring-2 ring-indigo-100/70' : 'border-gray-100 hover:border-gray-200'}`}>

      {/* connected badge */}
      {isConnected && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 rounded-t-2xl">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-bold text-white">מחובר כעת</span>
        </div>
      )}

      <div className="p-4">
        {/* ── header row ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <span className="text-white font-bold text-xs tracking-wider">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate"
               title={sessionId || String(id)}>
              {sessionId ? sessionId : shortId(String(id))}
            </p>
            {/* last visit */}
            {lastVisit && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Eye className="h-3 w-3" />
                {timeAgo(lastVisit)}
              </p>
            )}
          </div>
          {/* total clicks badge */}
          {totalClicks > 0 && (
            <div className="flex flex-col items-center bg-indigo-50 rounded-xl px-2 py-1.5 flex-shrink-0">
              <MousePointerClick className="h-3 w-3 text-indigo-500 mb-0.5" />
              <span className="text-xs font-bold text-indigo-700">{totalClicks}</span>
            </div>
          )}
        </div>

        {/* ── visit timeline ── */}
        {(firstVisit || lastVisit) && (
          <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-gray-50 rounded-xl text-xs">
            {firstVisit && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span>{fmtDate(firstVisit)}</span>
              </div>
            )}
            {firstVisit && lastVisit && (
              <div className="flex-1 h-px bg-gray-200 relative">
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
                  <span className="text-gray-300 text-[9px] bg-gray-50 px-1">→</span>
                </div>
              </div>
            )}
            {lastVisit && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                <span className="font-medium text-indigo-600">{timeAgo(lastVisit)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── hard categories ── */}
        {hardCats.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {hardCats.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-medium">
                  <Layers className="h-2.5 w-2.5 opacity-60" />
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── soft categories ── */}
        {softCats.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {softCats.map((c, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 font-medium">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── top tags (always show top 4, expand for rest) ── */}
        {tags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">תגיות לחיצות</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(expanded ? tags : tags.slice(0, 5)).map((t, i) => {
                const heat = tagHeat(t.count, maxTagCount);
                return (
                  <span key={i}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium ${heat.bg} ${heat.text}`}
                    title={`${t.count} לחיצות`}>
                    {t.label}
                    {t.count > 1 && (
                      <span className="font-bold opacity-70">×{t.count}</span>
                    )}
                  </span>
                );
              })}
            </div>
            {tags.length > 5 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              >
                {expanded
                  ? <><ChevronUp className="h-3 w-3" />פחות</>
                  : <><ChevronDown className="h-3 w-3" />+{tags.length - 5} עוד</>}
              </button>
            )}
          </div>
        )}

        {/* ── no data placeholder ── */}
        {!firstVisit && !lastVisit && hardCats.length === 0 && softCats.length === 0 && tags.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-2">אין מידע נוסף</p>
        )}
      </div>
    </div>
  );
}

// ── Summary row at top ────────────────────────────────────────────────────────

function SummaryBar({ profiles, connectedId }) {
  const total = profiles.length;
  const thirtyAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const active = profiles.filter(p => {
    const ts = p.newestVisit || p.lastVisit || p.lastSeen || p.updatedAt;
    if (!ts) return false;
    return new Date(ts).getTime() >= thirtyAgo;
  }).length;

  const totalClicks = profiles.reduce((sum, p) => {
    const tags = parseTags(p.tags);
    return sum + tags.reduce((s, t) => s + t.count, 0);
  }, 0);

  const items = [
    { icon: Users,           label: 'פרופילים', value: total.toLocaleString(),         color: 'text-indigo-600 bg-indigo-50' },
    { icon: Activity,        label: 'פעילים (30י)', value: active.toLocaleString(),     color: 'text-emerald-600 bg-emerald-50' },
    { icon: MousePointerClick, label: 'לחיצות',  value: totalClicks.toLocaleString(),  color: 'text-purple-600 bg-purple-50' },
    { icon: Wifi,            label: 'מחובר',      value: connectedId ? '1' : '0',       color: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className={`p-2 rounded-xl ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function UserProfilesPanel({ session, onboarding }) {
  const dbName = onboarding?.credentials?.dbName || onboarding?.dbName;
  const [profiles, setProfiles] = useState([]);
  const [meta, setMeta]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [sortBy, setSortBy]     = useState('newest'); // newest | oldest | clicks
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfiles = async () => {
    if (!dbName) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName })
      });
      if (!res.ok) throw new Error(`שגיאה ${res.status}`);
      const data = await res.json();
      setProfiles(data.profiles || []);
      setMeta(data.meta || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, [dbName]);

  // All unique categories across all profiles (for filter chips)
  const allCats = useMemo(() => {
    const set = new Set();
    profiles.forEach(p => {
      parseCats(p.softCategories || p.softCategory).forEach(c => set.add(c));
      parseCats(p.categories || p.hardCategories || p.category).forEach(c => set.add(c));
    });
    return [...set].slice(0, 12);
  }, [profiles]);

  // Sort + filter
  const displayed = useMemo(() => {
    let list = [...profiles];

    // text search
    if (search) {
      const t = search.toLowerCase();
      list = list.filter(p => {
        const id = String(p._id || p.id || p.sessionId || '').toLowerCase();
        const cats = [
          ...parseCats(p.softCategories || p.softCategory),
          ...parseCats(p.categories || p.hardCategories || p.category),
        ].join(' ').toLowerCase();
        const tags = parseTags(p.tags).map(t => t.label).join(' ').toLowerCase();
        return id.includes(t) || cats.includes(t) || tags.includes(t);
      });
    }

    // category filter
    if (filterCat) {
      list = list.filter(p => {
        const all = [
          ...parseCats(p.softCategories || p.softCategory),
          ...parseCats(p.categories || p.hardCategories || p.category),
        ];
        return all.some(c => c.toLowerCase() === filterCat.toLowerCase());
      });
    }

    // sort
    list.sort((a, b) => {
      if (sortBy === 'clicks') {
        const ca = parseTags(a.tags).reduce((s, t) => s + t.count, 0);
        const cb = parseTags(b.tags).reduce((s, t) => s + t.count, 0);
        return cb - ca;
      }
      const ta = new Date(a.newestVisit || a.lastVisit || a.lastSeen || a.updatedAt || 0).getTime();
      const tb = new Date(b.newestVisit || b.lastVisit || b.lastSeen || b.updatedAt || 0).getTime();
      return sortBy === 'newest' ? tb - ta : ta - tb;
    });

    return list;
  }, [profiles, search, filterCat, sortBy]);

  const connectedId = meta?.lastActiveId;
  // Put connected profile first
  const connected = displayed.filter(p =>
    p.isActive || p._id === connectedId || p.sessionId === connectedId
  );
  const rest = displayed.filter(p =>
    !p.isActive && p._id !== connectedId && p.sessionId !== connectedId
  );

  if (!dbName) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-indigo-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">אין חיבור לחנות</h3>
        <p className="text-gray-500 text-sm">השלם את תהליך ה-Onboarding כדי לראות פרופילים</p>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">

      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl shadow-xl mb-8">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">פרופילי משתמשים</h1>
              <p className="text-indigo-200 text-sm">{dbName} · אוסף profiles</p>
            </div>
          </div>
          <button
            onClick={() => { setRefreshing(true); fetchProfiles(); }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            רענן
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4" />
          <p className="text-gray-500 text-sm">טוען פרופילים...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">שגיאה בטעינת פרופילים</h3>
          <p className="text-gray-500 text-sm mb-1">{error}</p>
          <p className="text-xs text-gray-400 mb-4">ייתכן שאוסף "profiles" לא קיים עדיין</p>
          <button onClick={fetchProfiles}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            נסה שוב
          </button>
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">אין פרופילים עדיין</h3>
          <p className="text-gray-500 text-sm">פרופילים נוצרים אוטומטית כשמשתמשים מחפשים בחנות</p>
        </div>
      ) : (
        <>
          <SummaryBar profiles={profiles} connectedId={connectedId} />

          {/* ── Controls ── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            {/* search */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="חפש לפי ID, קטגוריה, תגית..."
                className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                dir="rtl"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            {/* sort */}
            <select
              value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="newest">ביקור אחרון</option>
              <option value="oldest">ביקור ראשון</option>
              <option value="clicks">הכי הרבה לחיצות</option>
            </select>
          </div>

          {/* ── Category filter chips ── */}
          {allCats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              <button
                onClick={() => setFilterCat('')}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors
                  ${!filterCat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                הכל
              </button>
              {allCats.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors
                    ${filterCat === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* ── Connected now ── */}
          {connected.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h2 className="text-sm font-bold text-gray-700">מחובר כעת</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {connected.map((p, i) => (
                  <ProfileCard key={p._id || i} profile={p} isConnected={true} />
                ))}
              </div>
            </div>
          )}

          {/* ── All other profiles ── */}
          {rest.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-700">כל הפרופילים</h2>
                <span className="text-xs text-gray-400">{displayed.length} תוצאות</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rest.map((p, i) => (
                  <ProfileCard key={p._id || i} profile={p} isConnected={false} />
                ))}
              </div>
            </div>
          )}

          {displayed.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              לא נמצאו פרופילים התואמים את החיפוש
            </div>
          )}
        </>
      )}
    </div>
  );
}
