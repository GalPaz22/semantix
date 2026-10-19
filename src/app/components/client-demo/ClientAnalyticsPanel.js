'use client'
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Search, SearchX, Wallet, ShoppingCart, Percent, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, Segmented, PageHeader } from './ui';
import { ResourceState, useOptimizer, buttonClass } from './OptimizerContext';
import { analyticsMeasurement, headlineConversion } from '../../../../lib/dashboard-analytics';
const number = n => n == null ? '—' : n.toLocaleString('he-IL');
const rate = n => n == null ? '—' : `${(n * 100).toFixed(1)}%`;
const money = rows => rows?.length ? rows.map(r => `${number(r.amount)} ${r.currency || '(מטבע לא דווח)'}`).join(' · ') : '—';
const ranges = [{ id: 7, label: '7 ימים' }, { id: 30, label: '30 ימים' }, { id: 90, label: '90 ימים' }];
const metrics = [{ id: 'searches', label: 'חיפושים', source: 'queries' }, { id: 'clicks', label: 'הקלקות', source: 'product_clicks' }, { id: 'carts', label: 'הוספות לסל', source: 'cart' }, { id: 'purchases', label: 'רכישות', source: 'checkout_events' }];
export default function ClientAnalyticsPanel({ onNavigate }) {
  const { dashboard, days, setDays, loading, error, refresh } = useOptimizer();
  const [metric, setMetric] = useState('searches'), [filter, setFilter] = useState(''), [sort, setSort] = useState('searches');
  const r = dashboard?.report, f = r?.funnel;
  const m = analyticsMeasurement(r);
  const conversion = headlineConversion(r);
  const purchaseTracked = m.revenue;
  const rows = useMemo(() => [...(r?.queries?.top || [])].filter(t => t.query.toLowerCase().includes(filter.trim().toLowerCase())).sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1)), [r, filter, sort]);
  const issues = r?.tracking?.filter(t => t.severity !== 'info') || [];
  const metricDefinition = metrics.find(x => x.id === metric);
  const metricMeasured = r?.sources?.[metricDefinition.source]?.status === 'ok' && (metric !== 'purchases' || purchaseTracked);
  const date = value => new Date(value).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
  return <div dir="rtl">
    <PageHeader eyebrow="ביצועי חיפוש" title="סקירה כללית" subtitle="אירועים שנקלטו בחנות. שיעורי המרה מוצגים רק כשהכיסוי מאפשר לקשר חיפושים לפעולות."
      right={<div className="flex flex-wrap gap-2"><Segmented options={ranges} value={days} onChange={setDays} /><button className={buttonClass} onClick={refresh} disabled={loading}>רענון</button></div>} />
    <ResourceState loading={loading} error={error} />
    {r && <>
      <div className={`rounded-xl border p-4 mb-5 ${issues.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
        <div className="flex gap-2 items-center text-sm font-semibold">{issues.length ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}{issues.length ? `המדידה חלקית · ${issues.length} נושאים לבדיקה` : 'הנתונים נקלטו · לא זוהו פערי מדידה'}</div>
        <p className="text-xs mt-2 leading-relaxed">כיסוי מזהי סשן בחיפושים: {rate(m.sessionCoverage)} · כיסוי מספר תוצאות: {rate(m.resultCoverage)}. {(!m.cartRates || !m.purchaseRates) && 'שיעור שתלוי במדידה חסרה מסומן בקו, גם אם נקלטו אירועים בודדים.'}</p>
        {r.window && <p className="text-xs mt-1">{date(r.window.from)} עד {date(r.window.to)} · ימים לפי שעון ישראל · עודכן {new Date(r.generatedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' })}</p>}
        {r.excludedQueries?.length > 0 && <p className="text-xs mt-1">{r.excludedQueries.length} חיפושים שזוהו כאוטומטיים הוצאו מספירת החיפושים והגרף.</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          conversion
            ? [Percent, conversion.label, rate(conversion.rate), `${number(conversion.count)} סשנים ${conversion.action} מתוך ${number(f.sessions.searched)} סשנים עם חיפוש`]
            : [Search, 'סשנים עם חיפוש', m.searchCounts ? number(f.sessions.searched) : '—', 'סשנים מזוהים בטווח שנבחר'],
          purchaseTracked
            ? [Wallet, 'הכנסה שנקשרה לחיפוש', money(f.revenue.searchAssisted), `${number(f.orders.explicit)} הזמנות בייחוס ישיר · ${number(f.orders.inferred)} לפי סשן`]
            : [ShoppingCart, 'סשנים שהגיעו לעגלה מחיפוש', r.sources.cart?.status === 'ok' ? number(f.sessions.carted) : '—', 'סשנים עם הוספה לסל אחרי חיפוש בטווח שנבחר'],
          [Search, 'חיפושים שנמדדו', m.searchCounts ? number(f.coverage.queries) : '—', `${number(f.sessions.searched)} סשנים מזוהים עם חיפוש`],
          [SearchX, 'חיפושים ללא תוצאות', m.resultCounts ? number(r.zeroResultSearches) : '—', m.resultCounts ? `מתוך ${number(f.coverage.queriesWithResultCount)} חיפושים עם מספר תוצאות מדווח` : 'מספר התוצאות לחיפוש טרם נמדד'],
        ].map(([Icon, label, value, foot]) => <Card key={label} className="p-5"><div className="flex gap-2 text-sm text-slate-500"><Icon className="h-4 w-4" />{label}</div><div className="mt-3 text-3xl font-bold text-slate-900 break-words">{value}</div><div className="mt-2 text-xs text-slate-500">{foot}</div></Card>)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mt-4">
        <Card className="xl:col-span-8 min-w-0"><CardHeader title="פעילות לפי יום" subtitle="אירועים שנקלטו · רכישות ללא כפילויות" right={<Segmented size="sm" options={metrics} value={metric} onChange={setMetric} />} />
          {!metricMeasured ? <p className="p-8 text-center text-sm text-slate-500">אין מדידה זמינה למדד הזה בטווח שנבחר</p> : r.activity.perDay.length ? <div className="h-72 p-4" dir="ltr"><ResponsiveContainer width="100%" height="100%"><AreaChart data={r.activity.perDay}><CartesianGrid stroke="#eef2f6" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={30} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey={metric} name={metricDefinition.label} stroke="#4f46e5" fill="#eef2ff" strokeWidth={2} /></AreaChart></ResponsiveContainer></div> : <p className="p-8 text-center text-sm text-slate-400">אין אירועים בטווח שנבחר</p>}
        </Card>
        <Card className="xl:col-span-4 p-5"><h3 className="font-semibold mb-5">משפך החיפוש</h3>
          {[
            ['סשנים עם חיפוש', m.searchCounts ? f.sessions.searched : null],
            ['הקליקו על מוצר', r.sources.product_clicks?.status === 'ok' ? f.sessions.clicked : null],
            ['הוסיפו לסל', r.sources.cart?.status === 'ok' ? f.sessions.carted : null],
            ['התחילו תשלום', f.coverage.checkoutTracking ? f.sessions.checkout : null],
            ['רכשו', purchaseTracked ? f.sessions.purchased : null],
          ].map(([label, value]) => <div key={label} className="mb-4"><div className="flex justify-between text-sm mb-2"><span>{label}</span><strong>{number(value)}</strong></div><div className="h-2 bg-slate-100 rounded"><div className="h-2 bg-indigo-500 rounded" style={{ width: `${Math.min(100, f.sessions.searched ? (value || 0) / f.sessions.searched * 100 : 0)}%` }} /></div></div>)}
          <p className="text-xs text-slate-500">סשנים מזוהים בלבד, עם חיפוש שקדם לאירוע. כל שלב נמדד ביחס לחיפוש; שלבי ביניים עשויים להיות חסרים.</p>
        </Card>
      </div>
      <Card className="mt-4 overflow-hidden"><CardHeader title="חיפושים מובילים" subtitle={`${days} הימים האחרונים · עד 40 חיפושים לפי נפח`} />
        <div className="p-4 flex flex-wrap gap-3"><input aria-label="סינון חיפושים באנליטיקות" className="border border-slate-200 rounded-lg p-2 text-sm min-w-0 flex-1" placeholder="סינון לפי חיפוש" value={filter} onChange={e => setFilter(e.target.value)} /><select aria-label="מיון חיפושים" className="rounded-lg border border-slate-200 p-2 text-xs bg-white" value={sort} onChange={e => setSort(e.target.value)}><option value="searches">הכי מחופשים</option><option value="searchSessions">הכי הרבה סשנים</option>{m.cartRates && <option value="cartRate">המרה לעגלה</option>}{m.purchaseRates && <option value="purchaseRate">המרה לרכישה</option>}</select></div>
        <div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['חיפוש', 'חיפושים', 'סשנים', 'הקלקה', 'הוספה לסל', 'רכישה', 'הכנסה', 'פעולות'].map(x => <th key={x} className="p-3 whitespace-nowrap">{x}</th>)}</tr></thead><tbody>{rows.map(t => <tr key={t.query} className="border-t border-slate-100"><td className="p-3 font-medium">{t.query}</td><td className="p-3">{number(t.searches)}</td><td className="p-3">{number(t.searchSessions)}</td><td className="p-3">{m.clickRates ? rate(t.clickRate) : '—'}</td><td className="p-3">{m.cartRates ? rate(t.cartRate) : '—'}</td><td className="p-3">{m.purchaseRates ? rate(t.purchaseRate) : '—'}</td><td className="p-3">{purchaseTracked ? money(t.attributedRevenue) : '—'}</td><td className="p-3 whitespace-nowrap"><button className="text-xs text-indigo-600 ml-3" onClick={() => onNavigate('agent', null, { query: t.query })}>בדיקה בצ׳אט</button><button className="text-xs text-slate-600" onClick={() => onNavigate('results', null, { query: t.query })}>עריכת דירוג</button></td></tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-slate-400">אין חיפושים תואמים בטווח שנבחר</p>}</div>
      </Card>
      <Card className="mt-4 p-5"><h3 className="font-semibold mb-3">חיפושים שכדאי לבדוק</h3>{r.queries.opportunity.map(t => <div key={t.query} className="flex justify-between items-center gap-3 py-3 border-b border-slate-100"><div className="min-w-0"><strong className="text-sm break-words">{t.query}</strong><p className="text-xs text-slate-500">{number(t.searchSessions)} סשנים מזוהים · הוספה לסל {m.cartRates ? rate(t.cartRate) : '—'}</p></div><button className={`${buttonClass} shrink-0`} onClick={() => onNavigate('agent', `הסבר מה אפשר להסיק מהנתונים ומה חסר במדידה לפני שמציעים שינוי.`, { query: t.query })}>בדיקה בצ׳אט</button></div>)}{!r.queries.opportunity.length && <p className="text-sm text-slate-500">אין כרגע חיפושים עם מספיק נתונים להצגת הזדמנות לשיפור.</p>}</Card>
      {r.tracking.length > 0 && <Card className="mt-4 p-5"><h3 className="font-semibold mb-3">איכות המדידה</h3>{r.tracking.map((t, i) => <div key={`${t.code}-${i}`} className="mb-4"><strong className="text-sm">{t.title}</strong><p className="text-xs text-slate-500 mt-1">{t.detail}</p><details className="text-xs text-slate-600 mt-1"><summary className="cursor-pointer">איך משלימים את המדידה</summary><p className="mt-2">{t.fix}</p></details></div>)}</Card>}
      <p className="text-xs text-slate-500 mt-4 leading-relaxed">המדד הראשי מציג המרה לצ׳קאאוט, ובהיעדר נתונים מספקים מציג המרה לעגלה: לפחות 100 סשנים עם חיפוש ו־10 סשנים שהגיעו לשלב. שיעורי המרה דורשים כיסוי מזהי סשן של לפחות 70% ומקורות שלא נחתכו. הכנסה שנקשרה לחיפוש כוללת ייחוס ישיר ומשוער לפי סשן ואינה מודדת תוספת הכנסה.</p>
    </>}
  </div>;
}
