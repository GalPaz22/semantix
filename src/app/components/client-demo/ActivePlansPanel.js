'use client'
import React, { useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { ChevronDown, Sparkles, FlaskConical, ListChecks, Clock3 } from 'lucide-react';
import { Card, PageHeader, Segmented, Delta, fmt } from './ui';
import { useOptimizer, useOptimizerResource, ResourceState } from './OptimizerContext';

const KIND = { rule: 'כלל חיפוש', experiment: 'בדיקת A/B', productBoost: 'קידום מוצרים', productVisibility: 'הסתרת מוצרים', catalogFilter: 'תיוג קטלוג', catalogRepair: 'תיקון קטלוג', reprocess: 'עיבוד מוצרים מחדש' };
const STATUS = { active: ['פעיל', 'bg-emerald-50 text-emerald-700'], scheduled: ['ממתין להתחלה', 'bg-sky-50 text-sky-700'], applying: ['בתהליך', 'bg-amber-50 text-amber-700'], paused: ['מושהה', 'bg-slate-100 text-slate-600'], failed: ['נכשל', 'bg-rose-50 text-rose-700'], ended: ['הסתיים', 'bg-slate-100 text-slate-500'] };
const LIVE = new Set(['active', 'scheduled', 'applying', 'paused']);
const MIN_SESSIONS = 5;
const pct = v => v == null ? '—' : `${Math.round(v * 1000) / 10}%`;
const date = v => v ? new Date(v).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) : '';
const dateTime = v => v ? new Date(v).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const points = (after, before) => after == null || before == null ? null : Math.round((after - before) * 1000) / 10;

export default function ActivePlansPanel({ visible }) {
  const { data, error, loading } = useOptimizerResource('optimization/plans', { enabled: visible });
  const [filter, setFilter] = useState('live');
  const plans = useMemo(() => (data?.plans || []).filter(p => filter === 'all' || LIVE.has(p.status)), [data, filter]);
  const all = data?.plans || [];
  const counts = [
    ['פעילות', all.filter(p => p.status === 'active').length, ListChecks],
    ['בדיקות A/B רצות', all.filter(p => p.control?.type === 'experiment' && p.control.status === 'running').length, FlaskConical],
    ['בתהליך או מושהות', all.filter(p => ['applying', 'paused', 'scheduled'].includes(p.status)).length, Clock3],
  ];
  return <div dir="rtl">
    <PageHeader title="תכניות פעילות" subtitle="כל השינויים שהסוכן הציע ואישרתם: מה כל שינוי עושה, מה קרה ומתי, ואיך מתפקדים החיפושים שהוא נוגע בהם מאז."
      right={<Segmented size="sm" value={filter} onChange={setFilter} options={[{ id: 'live', label: 'פעילות' }, { id: 'all', label: 'הכל' }]} />} />
    <ResourceState loading={loading && !data} error={error} empty={data && !plans.length ? (filter === 'live' ? 'אין כרגע תכניות פעילות. שינויים שתאשרו בסוכן או בהצעות לשיפור יופיעו כאן.' : 'עדיין לא אושרו שינויים.') : null} />
    {data && <>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">{counts.map(([label, n, Icon]) => <Card key={label} className="p-4 flex items-center gap-3"><Icon className="h-5 w-5 text-indigo-500" /><div><div className="text-2xl font-bold">{n}</div><div className="text-xs text-slate-500">{label}</div></div></Card>)}</div>
      <div className="space-y-3">{plans.map(p => <PlanCard key={p.id} plan={p} windowDays={data.windowDays} purchaseTracking={data.purchaseTracking} />)}</div>
    </>}
  </div>;
}

function PlanCard({ plan: p, windowDays, purchaseTracking }) {
  const [open, setOpen] = useState(false);
  const [label, tone] = STATUS[p.status] || [p.status, 'bg-slate-100 text-slate-600'];
  const m = p.metrics, enough = m && m.before.sessions >= MIN_SESSIONS && m.after.sessions >= MIN_SESSIONS;
  const click = enough ? points(m.after.clickRate, m.before.clickRate) : null;
  return <Card className="overflow-hidden">
    <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-right px-5 py-4 flex items-start gap-4 hover:bg-slate-50/60">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-[11px] font-medium rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5">{KIND[p.kind] || p.kind}</span>
          <span className={`text-[11px] font-medium rounded-md px-2 py-0.5 ${tone}`}>{p.control?.status === 'promoted' ? 'פעיל לכל הגולשים' : label}</span>
          {p.approvedAt && <span className="text-[11px] text-slate-400">אושר ב־{date(p.approvedAt)}</span>}
        </div>
        <h3 className="text-sm font-semibold text-slate-900 truncate">{p.title}</h3>
        {p.patterns?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{p.patterns.map(x => <span key={`${x.exact}${x.text}`} className="text-[11px] rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">״{x.text}״</span>)}</div>}
      </div>
      {m && <div className="shrink-0 text-left">
        <div className="text-[11px] text-slate-400 mb-1">הקלקות על תוצאות</div>
        <div className="flex items-center gap-2 justify-end text-sm"><span className="text-slate-400">{enough ? pct(m.before.clickRate) : ''}</span>{enough && <span className="text-slate-300">←</span>}<strong>{pct(m.after.clickRate)}</strong>{click != null && click !== 0 && <Delta value={click} suffix=" נק׳" />}</div>
        {!enough && <div className="text-[11px] text-slate-400 mt-0.5">מעט נתונים להשוואה</div>}
      </div>}
      <ChevronDown className={`h-4 w-4 mt-1 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <PlanDetails p={p} windowDays={windowDays} purchaseTracking={purchaseTracking} />}
  </Card>;
}

function PlanDetails({ p, windowDays, purchaseTracking }) {
  const { mutate } = useOptimizer();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const control = p.control;
  const act = async path => { setBusy(true); setError(''); try { await mutate(path); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const buttons = control?.type === 'rule' ? [[control.status === 'active' ? 'השבת את הכלל' : 'הפעל מחדש', `rules/${control.id}/${control.status === 'active' ? 'disable' : 'enable'}`]]
    : control?.type === 'experiment' ? ({ running: [['השהה בדיקה', 'pause']], paused: [['המשך בדיקה', 'resume']] }[control.status] || []).map(([l, a]) => [l, `experiments/${control.id}/${a}`]) : [];
  return <div className="border-t border-slate-100 px-5 py-5 grid lg:grid-cols-[1fr_300px] gap-6 bg-slate-50/30">
    <div className="min-w-0 space-y-5">
      {p.request && <p className="text-sm text-slate-600 flex gap-2"><Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />נוצר מהבקשה: ״{p.request}״</p>}
      {p.description && p.description !== p.title && <p className="text-sm text-slate-600 leading-6">{p.description}</p>}
      {p.metrics && <Metrics m={p.metrics} windowDays={windowDays} purchaseTracking={purchaseTracking} />}
      {p.experiment?.arms?.length > 0 && <Experiment e={p.experiment} />}
      {p.products?.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-slate-600">{p.products.length} מוצרים{p.level != null ? ` · רמת קידום ${p.level}` : ''}</summary><ul className="mt-2 space-y-0.5 max-h-48 overflow-auto text-xs text-slate-600">{p.products.map(x => <li key={x._id}>{x.name}</li>)}</ul></details>}
      {(p.filter || p.categories?.length) && <p className="text-xs text-slate-500">{p.filter ? `תגית: ${p.filter}` : ''}{p.categories?.length ? ` · קטגוריות: ${p.categories.join(', ')}` : ''}</p>}
      {p.error && <p className="text-xs text-rose-600">{p.error}</p>}
      {buttons.length > 0 && <div className="flex gap-2">{buttons.map(([l, path]) => <button key={path} disabled={busy} onClick={() => act(path)} className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">{l}</button>)}</div>}
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    </div>
    <Timeline events={p.timeline} />
  </div>;
}

function Metrics({ m, windowDays, purchaseTracking }) {
  const rows = [['חיפושים', m.before.searches, m.after.searches, fmt], ['סשנים עם חיפוש', m.before.sessions, m.after.sessions, fmt], ['הקליקו על מוצר', m.before.clickRate, m.after.clickRate, pct], ['הוסיפו לסל', m.before.cartRate, m.after.cartRate, pct], ...(purchaseTracking ? [['רכשו', m.before.purchaseRate, m.after.purchaseRate, pct]] : [])];
  const data = m.series.map(d => ({ ...d, label: d.day.slice(5).split('-').reverse().join('/'), click: d.clickRate == null ? null : Math.round(d.clickRate * 100) }));
  const marker = data.find(d => d.day >= m.approvedDay)?.label;
  return <div>
    <h4 className="text-xs font-semibold text-slate-500 mb-2">החיפושים שהשינוי נוגע בהם</h4>
    <div className="h-44 rounded-xl border border-slate-200 bg-white p-2" dir="ltr">
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data}>
        <CartesianGrid stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} />
        <YAxis yAxisId="n" tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={34} domain={[0, 100]} unit="%" />
        <Tooltip formatter={(v, name) => name === 'הקלקות' ? `${v}%` : v} />
        <Bar yAxisId="n" dataKey="searches" name="חיפושים" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
        <Line yAxisId="r" dataKey="click" name="הקלקות" stroke="#4f46e5" strokeWidth={2} dot={false} connectNulls />
        {marker && <ReferenceLine yAxisId="n" x={marker} stroke="#10b981" strokeDasharray="4 3" label={{ value: 'הופעל', fontSize: 10, fill: '#059669', position: 'insideTopRight' }} />}
      </ComposedChart></ResponsiveContainer>
    </div>
    <table className="w-full text-xs mt-3"><thead className="text-slate-400"><tr><th className="text-right font-normal pb-1"></th><th className="text-right font-normal pb-1">{m.before.days ? `${windowDays} ימים לפני` : 'לפני'}</th><th className="text-right font-normal pb-1">מאז ({m.after.days} ימים)</th></tr></thead>
      <tbody>{rows.map(([label, b, a, f]) => <tr key={label} className="border-t border-slate-100"><td className="py-1.5 text-slate-500">{label}</td><td className="py-1.5">{m.before.days ? (b == null ? '—' : f(b)) : 'לא זמין'}</td><td className="py-1.5 font-medium">{a == null ? '—' : f(a)}</td></tr>)}</tbody></table>
    {m.before.sessions < MIN_SESSIONS || m.after.sessions < MIN_SESSIONS ? <p className="text-[11px] text-slate-400 mt-2">מעט סשנים בחיפושים האלה, ולכן ההשוואה עדיין לא מעידה על מגמה.</p> : null}
  </div>;
}

function Experiment({ e }) {
  const best = e.probBestClick ?? e.probBestConv;
  return <div>
    <h4 className="text-xs font-semibold text-slate-500 mb-2">תוצאות הבדיקה · עודכן {dateTime(e.asOf)}</h4>
    <table className="w-full text-xs"><thead className="text-slate-400"><tr>{['גרסה', 'סשנים', 'הקלקה', 'הוספה לסל'].map(h => <th key={h} className="text-right font-normal pb-1">{h}</th>)}</tr></thead>
      <tbody>{e.arms.map(a => <tr key={a.arm} className="border-t border-slate-100"><td className="py-1.5">{a.arm === 'control' ? 'מקור (ללא שינוי)' : 'עם השינוי'}</td><td className="py-1.5">{fmt(a.sessions)}</td><td className="py-1.5">{pct(a.clickRate)}</td><td className="py-1.5">{pct(a.atcRate)}</td></tr>)}</tbody></table>
    {best != null && <p className="text-xs text-slate-600 mt-2">הסיכוי שהגרסה עם השינוי טובה יותר{e.probBestClick != null ? ' בהקלקות' : ' בהמרה'}: <strong>{Math.round(best * 100)}%</strong></p>}
  </div>;
}

function Timeline({ events }) {
  return <div>
    <h4 className="text-xs font-semibold text-slate-500 mb-3">ציר זמן</h4>
    <ol className="relative border-r border-slate-200 mr-1.5 space-y-4">{events.map((e, i) => <li key={i} className="pr-4 relative">
      <span className={`absolute -right-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${i === events.length - 1 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
      <div className="text-xs font-medium text-slate-800">{e.label}</div>
      <div className="text-[11px] text-slate-400">{dateTime(e.at)}</div>
      {e.detail && <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{e.detail}</div>}
    </li>)}</ol>
  </div>;
}
