'use client'
import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Clock3, FlaskConical, MousePointer2, RefreshCw, Search, ShoppingBag, Users } from 'lucide-react';
import { Card, CardHeader, PageHeader, Segmented } from './ui';
import { useOptimizer, useOptimizerResource } from './OptimizerContext';

const number = n => Number.isFinite(n) ? n.toLocaleString('he-IL') : '—';
const percent = n => Number.isFinite(n) ? `${(n * 100).toLocaleString('he-IL', { maximumFractionDigits: 1 })}%` : '—';
const date = value => new Date(value).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'short' });
const ranges = [{ id: 1, label: '24 שעות' }, { id: 3, label: '3 ימים' }, { id: 7, label: '7 ימים' }, { id: 14, label: '14 ימים' }];

export default function TakeoverAnalyticsPanel() {
  const { days, setDays, refresh } = useOptimizer();
  const selectedDays = ranges.some(r => r.id === days) ? days : 7;
  const { data: report, loading, error } = useOptimizerResource(`dashboard/ab-test?days=${selectedDays}`);
  const [query, setQuery] = useState('');
  const semantix = report?.groups.semantix, native = report?.groups.native;
  const complete = report?.measurement.complete;
  const rows = (report?.topQueries || []).filter(r => r.query.includes(query.trim().toLowerCase()));
  const cumulativeActivity = useMemo(() => {
    let searches = 0;
    return (report?.daily || []).map(row => ({ ...row, cumulativeSearches: searches += row.semantixSearches }));
  }, [report]);
  const comparisons = report ? [
    ['מבקרים שנחשפו', semantix.exposedVisitors, native.exposedVisitors, number],
    ['מבקרים שחיפשו', semantix.searchers, native.searchers, number],
    ['חיפושים שנמדדו', semantix.searches, native.searches, number],
    ['מוצרים שהוקלקו מהחיפוש', semantix.clickedProducts, native.clickedProducts, number],
    ['מוצרים שנוספו לסל לאחר ההקלקה', semantix.addedProducts, native.addedProducts, number],
    ['שיעור הוספה לסל מתוך המוצרים שהוקלקו', semantix.productCartRate, native.productCartRate, percent],
  ] : [];

  return <div dir="rtl" className="space-y-6" data-testid="takeover-analytics">
    <PageHeader eyebrow="STEIMATZKY × SEMANTIX" title="החיפוש החכם, בתמונה אחת" subtitle="עוקבים אחר החוויה החדשה ומשווים את הפעילות לחיפוש הקיים, במסגרת ניסוי מבוקר."
      right={<div className="flex flex-wrap items-center gap-2"><Segmented options={ranges} value={selectedDays} onChange={setDays} /><button aria-label="רענון נתוני הניסוי" onClick={refresh} disabled={loading} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-indigo-600 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>} />

    {loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">אוספים את נתוני הניסוי…</div>}
    {error && <Card className="p-8 text-center"><p role="alert" className="font-medium text-slate-800">הנתונים אינם זמינים כרגע</p><p className="mt-2 text-sm text-slate-500">אפשר לרענן בעוד רגע כדי לקבל את העדכון האחרון.</p><button onClick={refresh} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">ניסיון נוסף</button></Card>}

    {report && !loading && !error && <>
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white md:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-28 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-indigo-100"><span className={`h-1.5 w-1.5 rounded-full ${report.experiment.active ? 'bg-emerald-400' : 'bg-slate-400'}`} />{report.experiment.active ? 'ניסוי פעיל' : 'הניסוי מושהה'}<span className="text-white/30">/</span> A/B TEST</span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">חוויה חדשה. נתונים שמספרים את הדרך.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">Semantix נבחנת לצד החיפוש הקיים של סטימצקי. כאן אפשר לעקוב אחר היקף החשיפה, החיפושים והפעולות שנמדדו בכל קבוצה.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"><div className="flex items-center gap-2 text-slate-300"><FlaskConical className="h-4 w-4" />חלוקת תנועה מוגדרת</div><div className="mt-3 flex items-end gap-6"><div><strong className="text-3xl font-semibold tabular-nums">{percent(report.experiment.configuredSplit.semantix)}</strong><p className="mt-1 text-xs text-indigo-200">Semantix</p></div><span className="pb-4 text-white/20">/</span><div><strong className="text-3xl font-semibold tabular-nums">{percent(report.experiment.configuredSplit.native)}</strong><p className="mt-1 text-xs text-slate-400">החיפוש הקיים</p></div></div></div>
        </div>
        <div className="relative mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-400"><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{date(report.window.from)} — {date(report.window.to)}</span><span>נתוני המהדורה הנוכחית{report.experiment.revision ? ` · גרסה ${report.experiment.revision}` : ''}</span><span>עודכן {new Date(report.generatedAt).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}</span></div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">הפעילות ב־Semantix</h2><p className="mt-1 text-xs text-slate-500">תמונה מצטברת של הפעילות שנמדדה בחיפוש החכם בטווח המוצג.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{complete ? 'תוצאות ראשוניות' : 'הנתונים בעדכון'}</span></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[[Users, 'מבקרים שנחשפו', semantix.exposedVisitors, 'מזהי מבקר ייחודיים'], [Search, 'חיפושים בחיפוש החכם', semantix.searches, 'אירועי חיפוש שנמדדו'], [MousePointer2, 'מוצרים שהוקלקו מהחיפוש', semantix.clickedProducts, 'מוצר ייחודי לכל חיפוש ומבקר'], [ShoppingBag, 'מוצרים שנוספו לסל', semantix.addedProducts, 'אותו מוצר, לאחר הקלקה מהחיפוש']].map(([Icon, label, value, foot]) => <Card className="p-4 md:p-5" key={label}><span className="inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-600"><Icon className="h-4 w-4" /></span><p className="mt-4 text-xs text-slate-500 md:text-sm">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{complete ? number(value) : '—'}</p><p className="mt-2 text-[11px] text-slate-400">{foot}</p></Card>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="min-w-0 xl:col-span-7"><CardHeader title="פעילות מצטברת של החיפוש החכם" subtitle="סך החיפושים מתחילת הטווח · נקודות לפי יום בשעון ישראל" right={<BarChart3 className="h-4 w-4 text-slate-400" />} />
          {complete && report.daily.length ? <div className="mt-5 h-64 pr-2" dir="ltr"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cumulativeActivity} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}><defs><linearGradient id="takeover-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={.25} /><stop offset="100%" stopColor="#6366f1" stopOpacity={.02} /></linearGradient></defs><CartesianGrid stroke="#f1f5f9" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5).replace('-', '/')} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip labelFormatter={v => v} /><Area type="monotone" dataKey="cumulativeSearches" name="חיפושי Semantix במצטבר" stroke="#6366f1" strokeWidth={2.5} fill="url(#takeover-area)" /></AreaChart></ResponsiveContainer></div> : <div className="p-12 text-center text-sm text-slate-400">{complete ? 'הפעילות תופיע עם קליטת הנתונים הראשונים' : 'הגרף יוצג לאחר השלמת העדכון'}</div>}
        </Card>
        <Card className="p-5 xl:col-span-5"><h3 className="text-[15px] font-semibold">איך התנועה מתחלקת?</h3><p className="mt-1 text-xs leading-6 text-slate-500">החלוקה המוגדרת קובעת מי נכנס לכל קבוצה. החלוקה שנמדדה מציגה מזהי מבקר שנחשפו ושויכו בעקביות בטווח שנבחר.</p>
          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`חלוקה מוגדרת: Semantix ${percent(report.experiment.configuredSplit.semantix)}, חיפוש קיים ${percent(report.experiment.configuredSplit.native)}`}><div className="bg-indigo-500" style={{ width: percent(report.experiment.configuredSplit.semantix) }} /><div className="bg-slate-300" style={{ width: percent(report.experiment.configuredSplit.native) }} /></div>
          <div className="mt-5 space-y-4">{[['Semantix', 'semantix', 'bg-indigo-500'], ['החיפוש הקיים', 'native', 'bg-slate-300']].map(([label, key, color]) => <div key={key} className="flex items-center gap-2 text-sm"><span className={`h-2 w-2 rounded-full ${color}`} /><span className="flex-1">{label}</span><span className="text-xs text-slate-400">מוגדר</span><strong className="w-12 text-left tabular-nums">{percent(report.experiment.configuredSplit[key])}</strong><span className="mr-3 text-xs text-slate-400">נמדד</span><strong className="w-12 text-left tabular-nums">{complete ? percent(report.observedSplit[key]) : '—'}</strong></div>)}</div>
          <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">{number(report.observedSplit.visitors)} מזהי מבקר נכללו בחלוקה שנמדדה. זמני חזרה לאתר ופעילות חוזרת יכולים להשפיע על ההתפלגות בפועל.</p>
        </Card>
      </div>

      <Card className="overflow-hidden"><CardHeader title="ביצועים בשתי קבוצות הניסוי" subtitle="אותו טווח זמן ואותה הגדרת מדד לכל קבוצה. גודל הקבוצות שונה, ולכן כדאי לבחון גם את השיעורים." />
        <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">מדד</th><th className="px-5 py-3 text-indigo-700">Semantix</th><th className="px-5 py-3">החיפוש הקיים</th></tr></thead><tbody>{comparisons.map(([label, s, n, format]) => <tr key={label} className="border-t border-slate-100"><td className="px-5 py-3.5 text-slate-600">{label}</td><td className="px-5 py-3.5 font-semibold tabular-nums">{complete ? format(s) : '—'}</td><td className="px-5 py-3.5 font-semibold tabular-nums">{complete ? format(n) : '—'}</td></tr>)}</tbody></table></div>
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-xs leading-6 text-slate-500"><p>{report.measurement.note}</p><p>המדידה מחברת חיפוש, הקלקה והוספה לסל לפי מזהה החיפוש ומזהה המוצר אצל אותו מבקר, ובסדר הזמנים הזה. מוצר נספר פעם אחת בכל חיפוש של אותו מבקר; הקלקות והוספות חוזרות לא מגדילות את המדד. רכישות והכנסות אינן חלק מהמדדים המוצגים כרגע.</p></div>
      </Card>

      <Card className="p-5"><h3 className="text-[15px] font-semibold">כיסוי הקישור בין חיפוש למוצר</h3><p className="mt-2 text-xs leading-6 text-slate-500">מוצגים אירועי ההקלקה וההוספה לסל שנמדדו בקבוצה בכל האתר, ומתוכם האירועים שקושרו לחיפוש. אירועים ללא מזהים תואמים או ללא הקלקה מוכחת מתוך החיפוש אינם נכללים במדד המוצרים. שיעור ההוספה לסל מתייחס למוצרים שניתן לקשר בלבד.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['Semantix', semantix], ['החיפוש הקיים', native]].map(([label, arm]) => <div key={label} className="rounded-xl bg-slate-50 p-4 text-xs leading-7"><strong className="text-sm text-slate-800">{label}</strong><p>הקלקות שקושרו לחיפוש: {number(arm.linkedClickEvents)} מתוך {number(arm.clickEvents)} · {percent(arm.clickLinkCoverage)}</p><p>הוספות שקושרו למוצר שהוקלק: {number(arm.linkedCartEvents)} מתוך {number(arm.cartEvents)} · {percent(arm.cartLinkCoverage)}</p></div>)}</div></Card>

      <Card className="overflow-hidden"><CardHeader title="מוצרים מהחיפוש לסל" subtitle="לפי מזהה מוצר · מספר צירופי מוצר–חיפוש–מבקר ייחודיים בכל קבוצה" /><div className="mt-4 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">מזהה מוצר</th><th className="px-5 py-3">Semantix · הוקלקו</th><th className="px-5 py-3">Semantix · נוספו</th><th className="px-5 py-3">חיפוש קיים · הוקלקו</th><th className="px-5 py-3">חיפוש קיים · נוספו</th></tr></thead><tbody>{(report.topProducts || []).map(row => <tr key={row.productId} className="border-t border-slate-100"><td className="px-5 py-3 font-medium tabular-nums">{row.productId}</td>{[row.semantix.clicked, row.semantix.added, row.native.clicked, row.native.added].map((value, index) => <td key={index} className="px-5 py-3 tabular-nums">{complete ? number(value) : '—'}</td>)}</tr>)}</tbody></table>{!report.topProducts?.length && <p className="p-8 text-center text-sm text-slate-400">עדיין אין מוצרים עם הקלקה שניתן לקשר לחיפוש בטווח הזה</p>}</div></Card>

      <Card className="overflow-hidden"><CardHeader title="מה מחפשים בחנות?" subtitle="שאילתות מובילות בתנועה שנכללה בניסוי · מספר אירועי חיפוש בכל קבוצה" right={<Search className="h-4 w-4 text-slate-400" />} /><div className="px-5 pt-4"><input aria-label="סינון שאילתות הניסוי" value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש ברשימה…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 sm:w-72" /></div><div className="mt-4 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">שאילתה</th><th className="px-5 py-3">Semantix</th><th className="px-5 py-3">החיפוש הקיים</th></tr></thead><tbody>{rows.map(r => <tr key={r.query} className="border-t border-slate-100"><td className="max-w-md break-words px-5 py-3 font-medium">{r.query}</td><td className="px-5 py-3 tabular-nums">{complete ? number(r.semantix) : '—'}</td><td className="px-5 py-3 tabular-nums">{complete ? number(r.native) : '—'}</td></tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-sm text-slate-400">אין שאילתות להצגה בטווח הזה</p>}</div></Card>

      <details className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500"><summary className="cursor-pointer font-medium text-slate-700">איך קוראים את הנתונים?</summary><div className="mt-3 space-y-2 leading-6"><p>ההשוואה מוגבלת למהדורת החיפוש ולהגדרת חלוקת התנועה הנוכחיות, גם אם נבחר טווח ארוך יותר. מזהה מבקר מייצג דפדפן ואינו בהכרח אדם או ביקור יחיד.</p><p>נכללים רק מבקרים עם שיוך עקבי. פעילות במצב גיבוי או ללא שיוך מספק אינה חלק מההשוואה. כיסוי החשיפות שנכללו: {percent(report.measurement.exposureCoverage)}.</p><p>הקליק חייב להגיע מתוצאת חיפוש עם מזהי חיפוש ומוצר ולהתאים לחיפוש שנרשם. הוספה לסל נספרת רק אם אותו מוצר הוקלק קודם באותו חיפוש ובאותו דפדפן; אם נשמר מזהה הקלקה, גם הוא חייב להתאים. אין שיוך לפי שם מוצר, כתובת מוצר או עצם קיומו של חיפוש קודם. אלו נתוני הוספה לסל, ולא הוכחה לרכישה או לתוספת המרה סיבתית.</p><p>תצוגה זו מיועדת למעקב. חלוקת התנועה והכלים הנוספים נעולים לעריכה.</p></div></details>
    </>}
  </div>;
}
