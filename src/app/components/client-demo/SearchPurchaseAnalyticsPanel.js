'use client'
import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, ShoppingBag, ShieldCheck, Clock3 } from 'lucide-react';
import { Card, CardHeader, PageHeader } from './ui';

const count = n => Number.isFinite(n) ? n.toLocaleString('he-IL') : '—';
const percent = n => Number.isFinite(n) ? `${(n * 100).toLocaleString('he-IL', { maximumFractionDigits: 2 })}%` : '—';
const decimal = n => Number.isFinite(n) ? n.toLocaleString('he-IL', { maximumFractionDigits: 2 }) : '—';
const cash = (n, currency) => Number.isFinite(n) ? n.toLocaleString('he-IL', { style: 'currency', currency, maximumFractionDigits: 2 }) : '—';
const values = rows => rows === null ? '—' : rows?.length ? rows.map(r => cash(r.amount, r.currency)).join(' · ') : '0';
const stamp = v => new Date(v).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });
const variants = [['semantix', 'Semantix'], ['native', 'החיפוש המקורי']];

export default function SearchPurchaseAnalyticsPanel({ report, loading, error, refresh }) {
  const [filter, setFilter] = useState(''), [sort, setSort] = useState('searches');
  const p = report?.purchases, complete = p?.complete === true;
  const rows = useMemo(() => (p?.queries || []).filter(r => r.query.includes(filter.trim().toLowerCase())).slice().sort((a, b) =>
    sort === 'purchases' ? b.semantix.purchasedSearches - a.semantix.purchasedSearches : b.semantix.searches + b.native.searches - a.semantix.searches - a.native.searches), [p, filter, sort]);
  const lift = p?.comparison.relativeLift;
  const lessThanTwenty = complete && p.comparison.convertedSearches < 20;
  return <div dir="rtl" className="space-y-5" data-testid="search-purchase-analytics">
    <PageHeader eyebrow={report?.store?.eyebrow || 'RIKUSHET × SEMANTIX'} title="רכישת מוצר שהגיע מחיפוש"
      subtitle="נתונים חיים מהחיפושים, פעולות המוצר ופריטי ההזמנה שנרשמו בחנות."
      right={<button aria-label="רענון נתוני הרכישות מהחיפוש" onClick={refresh} disabled={loading} className="rounded-lg border bg-white p-2 text-slate-600 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>} />
    {loading && <Card className="p-10 text-center text-sm text-slate-500"><p role="status">מעדכנים את נתוני החיפושים וההזמנות…</p></Card>}
    {error && <Card className="p-8"><p role="alert" className="font-medium">הנתונים אינם זמינים כרגע</p><p className="mt-2 text-sm text-slate-500">לא מוצגת הערכה במקום מדידה חסרה. אפשר לנסות לרענן.</p></Card>}
    {!loading && !error && report && !p && <Card className="p-8 text-sm text-slate-600">נתוני השיוך למוצר עדיין אינם זמינים. שיעורי ההמרה יופיעו לאחר השלמת המדידה.</Card>}
    {!loading && !error && p && <>
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-sm text-indigo-950" data-testid="purchase-measurement-period">
        <p className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4" />24 שעות מעקב לכל חיפוש</p>
        <p className="mt-2 text-xs leading-6">חיפושים מ־{stamp(p.window.from)} עד {stamp(p.window.to)} · הזמנות נצפו עד {stamp(p.window.observedUntil)} · שעון ישראל.</p>
        <p className="mt-1 text-xs leading-6">{count(p.recent.semantix.pendingSearches + p.recent.native.pendingSearches)} חיפושים טריים ממתינים להשלמת חלון המעקב ואינם נכללים בהשוואה.</p>
      </section>
      {!complete && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">המדידה חלקית. מוצגות רק שרשראות מוצר שנמצאו; שיעורי ההמרה מוסתרים עד שיהיה כיסוי מספיק של מזהי חיפוש, מוצרים ופריטי הזמנה.</div>}
      <div className="grid gap-4 md:grid-cols-2" data-testid="purchase-conversion-groups">
        {variants.map(([key, label]) => { const a = p.groups[key], featured = key === 'semantix'; return <section key={key} data-variant={key} className={`rounded-3xl border p-6 md:p-8 ${featured ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-950'}`}>
          <p className={`flex items-center gap-2 text-sm ${featured ? 'text-indigo-200' : 'text-slate-500'}`}><ShoppingBag className="h-4 w-4" />{label}</p>
          <h2 className="mt-4 text-base">חיפושים שהסתיימו בקניית מוצר תואם</h2>
          <strong className="mt-3 block text-5xl font-semibold tabular-nums" data-testid={`${key}-purchase-rate`}>{complete ? percent(a.purchaseRate) : '—'}</strong>
          <p className={`mt-4 text-sm leading-7 ${featured ? 'text-slate-300' : 'text-slate-600'}`}><strong>{count(a.purchasedSearches)}</strong> חיפושים עם מוצר תואם בהזמנה, מתוך <strong>{count(a.searches)}</strong> חיפושים ייחודיים בדף התוצאות.</p>
          <p className={`mt-2 text-xs leading-6 ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{count(a.orders)} הזמנות שונות · ב־{count(a.confirmedCartOrders)} מהן אומתה גם הוספה מוצלחת לסל.</p>
        </section>; })}
      </div>
      <Card className="p-5 md:p-6" data-testid="observed-product-money">
        <CardHeader title="ההבדל בכסף שנקשר לחיפוש" subtitle="שווי המוצרים התואמים בהזמנות מדווחות · דף תוצאות בלבד · אותו חלון מעקב של 24 שעות" />
        {!p.financialComparison?.rows?.length && <p className="mt-4 text-sm text-slate-500">אין עדיין די נתונים כספיים להצגת שווי המוצרים והפער בין הקבוצות.</p>}
        {p.financialComparison?.rows?.map(row => <section key={row.currency} className="mt-5 space-y-4" data-currency={row.currency}>
          <div className="grid gap-4 sm:grid-cols-2">{variants.map(([key, label]) => <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm text-slate-600">{label} · שווי מוצרים משויכים</p><strong className="mt-3 block text-3xl font-semibold tabular-nums" data-testid={`${key}-product-value`}>{cash(row[key].amount, row.currency)}</strong>
            <p className="mt-2 text-xs leading-6 text-slate-500">{count(row[key].searches)} חיפושים · {cash(row[key].per100Searches, row.currency)} לכל 100 חיפושים.</p>
          </div>)}</div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
            <h3 className="text-sm font-semibold text-indigo-950">הפער הכספי הנצפה באותה כמות חיפושים</h3>
            <strong className="mt-3 block text-4xl font-semibold tabular-nums text-indigo-950" data-testid="normalized-product-value-difference">{row.complete ? cash(row.normalizedDifference, row.currency) : 'לא ניתן לחשב'}</strong>
            <p className="mt-3 text-sm leading-7 text-indigo-900">{row.complete ? <>נמדדו אצלנו {cash(row.semantix.amount, row.currency)}. לפי השווי הממוצע לחיפוש במקורי, אותו מספר חיפושים היה משקף {cash(row.expectedNativeAtSemantixVolume, row.currency)}.</> : 'חסר סכום, מטבע, פירוט פריטים או מכנה תקין באחת הקבוצות. אין השלמה אוטומטית של ערכים חסרים.'}</p>
            {row.complete && <p className="mt-2 text-xs leading-6 text-indigo-900">פער בין הסכומים שנרשמו בפועל: {cash(row.rawDifference, row.currency)}.{Number.isFinite(row.relativeLift) && <> שינוי בשווי לחיפוש: <bdi>{row.relativeLift >= 0 ? '+' : ''}{percent(row.relativeLift)}</bdi>.</>}</p>}
          </div>
        </section>)}
        <p className="mt-4 text-xs leading-6 text-slate-500">ההשוואה מתאימה את השווי למספר החיפושים בפועל, כי חלוקת דפדפנים של 50/50 אינה מבטיחה מספר חיפושים זהה. השווי מחושב לפי מחיר וכמות הפריטים שדווחו, בתקרה יחסית לסכום ההזמנה. משלוח ושאר הסל אינם מקבלים תוספת קרדיט; אין ברישום פירוט נפרד לאימות הנחות, מס ומשלוח.</p>
        <p className="mt-2 text-xs leading-6 text-slate-600">{lessThanTwenty ? 'המדגם עדיין קטן. ' : ''}זהו פער כספי שנצפה במדגם, ולא הכנסה נוספת מוכחת או רווח. הסכומים הם כפי שדווחו בחנות, ללא אימות סליקה והחזרים מאוחרים.</p>
      </Card>
      <Card className="p-5 md:p-6" data-testid="observed-purchase-difference">
        <h3 className="text-sm font-semibold">הפער הנצפה ברכישת מוצר מהחיפוש</h3>
        <p dir={complete && Number.isFinite(lift) ? 'ltr' : 'rtl'} className="mt-3 text-right text-3xl font-semibold tabular-nums">{complete && Number.isFinite(lift) ? `${lift >= 0 ? '+' : ''}${percent(lift)}` : 'טרם ניתן לחשב פער יחסי'}</p>
        <p className="mt-2 text-sm text-slate-600">{complete && Number.isFinite(p.comparison.differencePP) ? `הפרש של ${decimal(p.comparison.differencePP)} נקודות אחוז, לעומת החיפוש המקורי.` : 'נדרשת מדידה מלאה ומכנה שאינו אפס.'}</p>
        <p className="mt-2 text-xs leading-6 text-slate-500">{lessThanTwenty ? `המדגם קטן: ${count(p.comparison.convertedSearches)} חיפושים ממירים בשתי הקבוצות יחד. ` : ''}זהו הבדל שנצפה במדידה; הוא אינו הוכחה לתוספת מכירות או לתוצאה מובהקת.</p>
      </Card>
      <Card className="overflow-hidden"><CardHeader title="החיפושים והמוצרים שנקנו" subtitle={`דף תוצאות בלבד · ${count(p.queries.length)} מתוך ${count(p.distinctQueries)} שאילתות: נפח גבוה או רכישה משויכת · אותו חלון מעקב לכל חיפוש`} />
        <div className="flex flex-wrap gap-3 p-4"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3"><Search className="h-4 w-4 text-slate-400" /><input aria-label="סינון חיפושים עם שיוך למוצר" value={filter} onChange={e => setFilter(e.target.value)} placeholder="חיפוש בטבלה" className="min-w-0 flex-1 py-2 text-sm outline-none" /></label><select aria-label="מיון חיפושים לפי מוצר" value={sort} onChange={e => setSort(e.target.value)} className="rounded-lg border bg-white p-2 text-sm"><option value="searches">לפי נפח חיפוש</option><option value="purchases">לפי רכישות משויכות שלנו</option></select></div>
        <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['חיפוש', 'שלנו · חיפושים', 'שלנו · קנו מוצר', 'שלנו · שיעור', 'מקורי · חיפושים', 'מקורי · קנו מוצר', 'מקורי · שיעור', 'מוצרים שנמצאו בהזמנה'].map(t => <th key={t} className="whitespace-nowrap px-4 py-3">{t}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.query} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{r.query}</td>{variants.map(([key]) => <React.Fragment key={key}><td className="px-4 py-3 tabular-nums">{count(r[key].searches)}</td><td className="px-4 py-3 tabular-nums">{count(r[key].purchasedSearches)}</td><td className="px-4 py-3 tabular-nums">{complete ? percent(r[key].purchaseRate) : '—'}</td></React.Fragment>)}<td className="min-w-64 px-4 py-3 text-xs leading-6 text-slate-600">{[...new Set([...r.semantix.products, ...r.native.products])].join(' · ') || 'לא נמצאה רכישה משויכת'}</td></tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-sm text-slate-400">אין חיפושים תואמים בטווח שנמדד</p>}</div>
      </Card>
      <Card className="p-5"><CardHeader title="בחירות בזמן הקלדה — בנפרד" subtitle="הרישום נוצר בבחירת מוצר; אין ספירה מלאה של כל מי שראה הצעות, ולכן לא מוצג שיעור המרה." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{variants.map(([key, label]) => <div key={key} className="rounded-xl bg-slate-50 p-4 text-sm leading-7"><strong>{label}</strong><p>{count(p.typed[key].orders)} הזמנות עם מוצר שנבחר בזמן הקלדה · שווי משויך: {values(p.typed[key].value)}.</p><p className="text-xs text-slate-500">מכל המסלולים יחד: {count(p.totals[key].orders)} הזמנות שונות עם מוצר משויך, בשווי {values(p.totals[key].value)}. הזמנה הכוללת מוצרים מכמה מסלולים נספרת פעם אחת.</p></div>)}</div>
      </Card>
      <details className="rounded-2xl border border-slate-200 bg-white p-5 text-sm"><summary className="cursor-pointer font-semibold">חלוקת הניסוי ואיכות המדידה</summary>
        <div className="mt-4 space-y-2 text-xs leading-7 text-slate-600">{variants.map(([key, label]) => <p key={key}>{label} · חלוקה מוגדרת: {percent(report.experiment.configuredSplit[key])} · {count(p.groups[key].browsers)} מזהי דפדפן עם חיפוש שנכלל בהשוואה.</p>)}
          <p>כיסוי מזהי חיפוש וביקור: {percent(p.coverage.searchContexts)} · זיהוי מוצר בקליקים מחיפוש: {percent(p.coverage.productIdentity)} · הזמנות עם פריטים וביקור: {percent(p.coverage.orderItemsAndVisit)}.</p>
          <p>נוכו {count(p.diagnostics.duplicateClicks)} קליקים כפולים ו־{count(p.diagnostics.duplicateOrders)} אירועי הזמנה חוזרים. אירועי fallback, דפדפני בדיקה וקישור לא עקבי אינם מקבלים קרדיט.</p>
          <p>מספר החיפושים אינו מספר הגולשים. מזהה דפדפן עשוי להישמר בין ביקורים; חיפוש נספר פעם אחת לפי מזהה חיפוש, ביקור ודפדפן.</p>
          <p className="flex items-start gap-2"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" /><span>השיוך דורש קליק או הוספה מאושרת למוצר מחיפוש מסוים, ו־SKU תואם בפריטי ההזמנה באותו ביקור. לא די בכך שהדפדפן חיפש ואז רכש, ומזהה החיפוש האחרון בהזמנה אינו מחליף קישור למוצר.</span></p>
          <p>ההזמנות דווחו מדף ההצלחה בחנות; אין כאן אימות סליקה, ביטולים או החזרים מאוחרים. רכישה שלא ניתן לשייך אינה הוכחה שלא נעשתה רכישה. לא מוצגת תחזית מחזור או הכנסה מכל הסל כתרומה מוכחת של החיפוש.</p>
          <p>עודכן {stamp(report.generatedAt)} · גרסת חיפוש פעילה: {count(report.experiment.revision)}.</p>
        </div>
      </details>
    </>}
  </div>;
}
