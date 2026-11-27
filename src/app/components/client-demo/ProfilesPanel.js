'use client'
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, Mail, Phone, Search, ShoppingBag, MessageSquare, MousePointerClick, ShoppingCart, PackageCheck, Clock } from 'lucide-react';
import { useOptimizer, useOptimizerResource, ResourceState } from './OptimizerContext';
import { Card, CardHeader, fmt } from './ui';

// The store's customers tied to their search sessions: who they are (from an order or a signed-in account) and
// what they did. Details only exist from the plugin version that sends them; older sessions stay anonymous.
const dateTime = (value) => value ? new Date(value).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const shekel = (n) => `₪${fmt(Math.round(n))}`;
const SOURCE = { order: 'הזמנה', account: 'חשבון רשום' };
// The sold-out products a customer searched for: back on sale, or still waited for.
const STOCK_FILTERS = [
  { id: 'back', label: 'מוצר שחיפשו חזר למלאי', icon: PackageCheck, empty: 'אין כרגע לקוחות שמוצר שחיפשו חזר למלאי',
    on: 'border-emerald-600 bg-emerald-600 text-white', off: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300' },
  { id: 'waiting', label: 'מחכים למלאי', icon: Clock, empty: 'אין כרגע לקוחות שמחכים למוצר',
    on: 'border-amber-600 bg-amber-600 text-white', off: 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300' },
];

function Stat({ icon: Icon, value, label }) {
  return <span className="inline-flex items-center gap-1 text-xs text-slate-500" title={label}><Icon className="h-3.5 w-3.5 text-slate-400" /><span className="tabular-nums text-slate-700">{fmt(value)}</span><span className="hidden xl:inline">{label}</span></span>;
}

function StockProducts({ title, items, box, heading, underline }) {
  return <section className={`rounded-lg border p-3 md:col-span-3 ${box}`}>
    <h4 className={`mb-2 text-xs font-semibold ${heading}`}>{title}</h4>
    <ul className="space-y-2">{items.map((item) => <li key={item.id} className="text-[13px]">
      {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className={`font-semibold text-slate-900 underline underline-offset-2 ${underline}`}>{item.name}</a> : <span className="font-semibold text-slate-900">{item.name}</span>}
      <div className="text-xs text-slate-500">{item.query && <>חיפוש: ״{item.query}״ · </>}{dateTime(item.searchedAt)}{item.restockedAt && <> · חזר למלאי {dateTime(item.restockedAt)}</>}</div>
    </li>)}</ul>
  </section>;
}

function Conversation({ id }) {
  const { request } = useOptimizer();
  const [detail, setDetail] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    request(`concierge/conversations/${encodeURIComponent(id)}`, { signal: controller.signal }).then(setDetail).catch((e) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [id, request]);
  if (error) return <p className="text-xs text-rose-600">{error}</p>;
  if (!detail) return <p className="text-xs text-slate-400">טוען שיחה…</p>;
  const turns = detail.transcript?.length ? detail.transcript : (detail.legacy || []).map((m) => (m.role === 'user' ? { message: m.text } : { reply: m.text }));
  return <div className="space-y-2 rounded-lg bg-slate-50 p-3">
    {turns.map((t, i) => <div key={i} className="space-y-1 text-[13px] leading-relaxed">
      {(t.message || t.query) && <p><span className="font-semibold text-slate-900">לקוח: </span>{t.message || t.query}</p>}
      {t.reply && <p className="text-slate-600"><span className="font-semibold text-indigo-700">קונסיירז׳: </span>{t.reply}</p>}
      {!!t.products?.length && <p className="text-xs text-slate-400">הוצגו: {t.products.map((p) => p.name).filter(Boolean).join(' · ')}</p>}
    </div>)}
    {!turns.length && <p className="text-xs text-slate-400">אין תמליל לשיחה הזו</p>}
  </div>;
}

function ProfileRow({ profile }) {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState(null);
  const name = profile.firstName || profile.email || profile.phone;
  return <li className="border-t border-slate-100 first:border-t-0">
    <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
      className="grid w-full grid-cols-1 gap-2 px-5 py-3 text-right hover:bg-slate-50 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1.5fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />}
          <span className="truncate text-[14px] font-semibold text-slate-900">{name}</span>
        </div>
        <div className="mr-6 mt-0.5 flex flex-wrap gap-1">{profile.sources.map((s) => <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{SOURCE[s] || s}</span>)}
          {profile.backInStock?.length > 0 && <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700"><PackageCheck className="h-3 w-3" />{profile.backInStock.length === 1 ? 'מוצר שחיפשו חזר למלאי' : `${fmt(profile.backInStock.length)} מוצרים שחיפשו חזרו למלאי`}</span>}
          {profile.waiting?.length > 0 && <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700"><Clock className="h-3 w-3" />{profile.waiting.length === 1 ? 'מחכה למוצר' : `מחכה ל-${fmt(profile.waiting.length)} מוצרים`}</span>}
        </div>
      </div>
      <div className="min-w-0 space-y-0.5 text-[13px] text-slate-600">
        {profile.email && <div className="flex items-center gap-1.5 truncate" dir="ltr" style={{ justifyContent: 'flex-end' }}><span className="truncate">{profile.email}</span><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" /></div>}
        {profile.phone && <div className="flex items-center gap-1.5" dir="ltr" style={{ justifyContent: 'flex-end' }}><span>{profile.phone}</span><Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /></div>}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <Stat icon={Search} value={profile.activity.searches} label="חיפושים" />
        <Stat icon={MousePointerClick} value={profile.activity.clicks} label="קליקים" />
        <Stat icon={ShoppingCart} value={profile.activity.cart} label="הוספות לסל" />
        <Stat icon={MessageSquare} value={profile.activity.conversations} label="שיחות קונסיירז׳" />
        <Stat icon={ShoppingBag} value={profile.activity.orders} label="הזמנות" />
      </div>
      <div className="text-xs text-slate-400 md:text-left">
        {profile.revenue > 0 && <div className="text-[13px] font-semibold text-slate-900">{shekel(profile.revenue)}</div>}
        {dateTime(profile.lastSeen)}
      </div>
    </button>
    {open && <div className="grid gap-5 bg-white px-5 pb-5 md:grid-cols-3">
      {profile.backInStock?.length > 0 && <StockProducts title="חזרו למלאי" items={profile.backInStock} box="border-emerald-200 bg-emerald-50" heading="text-emerald-800" underline="decoration-emerald-300" />}
      {profile.waiting?.length > 0 && <StockProducts title="מחכים לחזרה למלאי" items={profile.waiting} box="border-amber-200 bg-amber-50" heading="text-amber-800" underline="decoration-amber-300" />}
      <section>
        <h4 className="mb-2 text-xs font-semibold text-slate-500">חיפושים אחרונים</h4>
        {profile.lastSearches.length ? <div className="flex flex-wrap gap-1.5">{profile.lastSearches.map((q) => <span key={q} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700">{q}</span>)}</div> : <p className="text-xs text-slate-400">אין חיפושים</p>}
        <p className="mt-3 text-xs text-slate-400">{fmt(profile.sessions)} {profile.sessions === 1 ? 'סשן' : 'סשנים'} · נראה לראשונה {dateTime(profile.firstSeen)}</p>
      </section>
      <section>
        <h4 className="mb-2 text-xs font-semibold text-slate-500">הזמנות</h4>
        {profile.orders.length ? <ul className="space-y-2">{profile.orders.map((o) => <li key={o.id} className="text-[13px]">
          <div className="flex justify-between gap-2"><span className="text-slate-700">#{o.id}</span><span className="font-semibold tabular-nums">{o.total != null ? shekel(o.total) : '—'}</span></div>
          {o.items.length > 0 && <ul className="text-xs text-slate-500">{o.items.map((item, i) => <li key={i}>{item}</li>)}</ul>}
          <div className="text-xs text-slate-400">{dateTime(o.at)}</div>
        </li>)}</ul> : <p className="text-xs text-slate-400">אין הזמנות מהסשנים האלה</p>}
      </section>
      <section>
        <h4 className="mb-2 text-xs font-semibold text-slate-500">שיחות קונסיירז׳</h4>
        {profile.conversations.length ? <ul className="space-y-1.5">{profile.conversations.map((c) => <li key={c.id}>
          <button type="button" onClick={() => setChat(chat === c.id ? null : c.id)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-right text-[13px] hover:border-slate-300">
            <span className="line-clamp-2 text-slate-700">{c.preview || 'שיחה שנפתחה מהחיפוש'}</span>
            <span className="text-xs text-slate-400">{dateTime(c.at)} · {c.turns === 1 ? "תור אחד" : `${fmt(c.turns)} תורות`}</span>
          </button>
          {chat === c.id && <div className="mt-1.5"><Conversation id={c.id} /></div>}
        </li>)}</ul> : <p className="text-xs text-slate-400">אין שיחות</p>}
      </section>
    </div>}
  </li>;
}

export default function ProfilesPanel({ visible }) {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [stock, setStock] = useState('');
  const params = new URLSearchParams({ page: String(page), ...(query ? { query } : {}), ...(stock ? { restock: stock } : {}) });
  const { data, error, loading } = useOptimizerResource(`dashboard/profiles?${params}`, { enabled: visible });
  const submit = (e) => { e.preventDefault(); setPage(1); setQuery(draft.trim()); };
  return <div className="space-y-4">
    <Card>
      <CardHeader title="פרופילי לקוחות"
        subtitle="לקוחות שזוהו לפי הזמנה או חשבון רשום, עם החיפושים, השיחות וההזמנות שלהם. נאסף מהתקנת גרסה 1.4.0 של התוסף ואילך."
        right={<form onSubmit={submit} className="flex items-center gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="חיפוש לפי שם, אימייל או טלפון"
            className="w-48 sm:w-64 max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" aria-label="חיפוש לקוח" />
          <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">חפש</button>
        </form>} />
      <div className="mt-4">
        {(data ? data.restockCounts : stock) && <div className="flex flex-wrap gap-2 px-5 pb-3">
          {STOCK_FILTERS.map(({ id, label, icon: Icon, on, off }) => <button key={id} type="button" aria-pressed={stock === id} onClick={() => { setPage(1); setStock((v) => (v === id ? '' : id)); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${stock === id ? on : off}`}>
            <Icon className="h-3.5 w-3.5" />{label}{data?.restockCounts && <span className="tabular-nums">({fmt(data.restockCounts[id])})</span>}
          </button>)}
        </div>}
        <ResourceState loading={loading && !data} error={error} empty={data && !data.profiles.length ? (query ? 'לא נמצא לקוח תואם' : STOCK_FILTERS.find((f) => f.id === stock)?.empty || 'עדיין אין לקוחות מזוהים. פרופילים נוצרים בכל הזמנה ובכל ביקור של לקוח מחובר.') : ''} />
        {data?.profiles?.length > 0 && <>
          <div className="px-5 pb-2 text-xs text-slate-400">{fmt(data.total)} לקוחות</div>
          <ul>{data.profiles.map((p) => <ProfileRow key={p.key} profile={p} />)}</ul>
          {data.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">הקודם</button>
            <span>עמוד {page} מתוך {data.totalPages}</span>
            <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">הבא</button>
          </div>}
        </>}
      </div>
    </Card>
  </div>;
}
