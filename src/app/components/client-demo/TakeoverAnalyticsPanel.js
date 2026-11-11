'use client'
import React from 'react';
import { LockKeyhole, RefreshCw, ShoppingBag, TrendingUp } from 'lucide-react';
import { Card, CardHeader, PageHeader } from './ui';
import { useOptimizer, useOptimizerResource } from './OptimizerContext';

const number = n => Number.isFinite(n) ? n.toLocaleString('he-IL', { maximumFractionDigits: 0 }) : '—';
const decimal = n => Number.isFinite(n) ? n.toLocaleString('he-IL', { maximumFractionDigits: 1 }) : '—';
const percent = n => Number.isFinite(n) ? `${decimal(n * 100)}%` : '—';
const money = n => Number.isFinite(n) ? n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }) : '—';
const dateTime = value => new Date(value).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const variants = [['semantix', 'Semantix'], ['native', 'החיפוש הקיים']];

export default function TakeoverAnalyticsPanel() {
  const { refresh } = useOptimizer();
  const { data: report, loading, error } = useOptimizerResource('dashboard/ab-test');
  const frozen = report?.snapshot?.mode === 'frozen';
  const search = report?.searchConversion, complete = report?.measurement.complete && search?.complete;
  const comparison = search?.comparison, impact = search?.financialImpact, monthly = impact?.monthlyProjection;
  const projected = complete && monthly?.status === 'available';
  const positive = comparison?.relativeLift > 0;
  const sourceRows = [
    ['חיפושים רגילים שהבשילו', key => search.groups[key].searches, number],
    ['חיפושים שהובילו להוספה מאושרת לסל', key => search.groups[key].cartedSearches, number],
    ['שיעור חיפוש לסל', key => search.groups[key].searchCartRate, percent],
    ['חיפושים עם מוצר תואם בהזמנה מדווחת', key => search.groups[key].productOrderedSearches, number],
    ['שווי מוצרים תואמים בהזמנות מדווחות', key => impact.observed[key].matchedProductValue, money],
  ];
  return <div dir="rtl" className="space-y-6" data-testid="takeover-analytics">
    <PageHeader eyebrow="STEIMATZKY × SEMANTIX" title="יותר חיפושים שמגיעים לסל"
      subtitle="ביצועי החיפוש והפוטנציאל העסקי בפריסה מלאה."
      right={frozen ? <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600" data-testid="snapshot-lock"><LockKeyhole className="h-4 w-4" />תמונת מצב נעולה</span> : <button aria-label="רענון נתוני הניסוי" onClick={refresh} disabled={loading} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>} />
    {loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">מעדכנים את תוצאות הניסוי…</div>}
    {error && <Card className="p-8 text-center"><p role="alert">הנתונים אינם זמינים כרגע</p><button onClick={refresh} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">ניסיון נוסף</button></Card>}
    {report && !loading && !error && <>
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white md:p-9" data-testid="search-cart-difference">
        <div className="flex items-center gap-2 text-sm font-medium text-indigo-200"><TrendingUp className="h-4 w-4" />השוואת החיפוש · שבעת הימים האחרונים</div>
        {frozen && <p className="mt-3 text-xs leading-6 text-slate-300" data-testid="snapshot-notice">תמונת מצב ל־{dateTime(report.generatedAt)} · התוצאות ואחוז ההבדל נעולים ואינם מתעדכנים.</p>}
        <strong dir="ltr" className="mt-5 block text-right text-7xl font-semibold tracking-tight tabular-nums md:text-8xl">{complete && Number.isFinite(comparison?.relativeLift) ? `${comparison.relativeLift >= 0 ? '+' : ''}${percent(comparison.relativeLift)}` : '—'}</strong>
        <h2 className="mt-3 text-xl font-medium md:text-2xl">{positive ? 'עלייה נצפית בשיעור החיפושים שהגיעו לסל' : 'הפער הנצפה בשיעור החיפושים שהגיעו לסל'}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">פער יחסי לעומת החיפוש הקיים. כל חיפוש נספר פעם אחת, לפי הוספה מאושרת לסל.</p>
        <div className="mt-7 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2" data-testid="search-conversion-summary">
          {variants.map(([key, label]) => <div key={key} data-variant={key} className="rounded-2xl bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-300"><ShoppingBag className="h-4 w-4" />{label}</div>
            <strong className="mt-2 block text-3xl font-semibold tabular-nums">{complete ? percent(search.groups[key].searchCartRate) : '—'}</strong>
            <p className="mt-2 text-xs leading-6 text-slate-400">{complete ? `${number(search.groups[key].cartedSearches)} מתוך ${number(search.groups[key].searches)} חיפושים הגיעו לסל` : 'הנתונים בעדכון'}</p>
          </div>)}
        </div>
        {complete && comparison.interval95PP && <p className="mt-4 text-xs leading-6 text-slate-400">פער של {decimal(comparison.differencePP)} נקודות אחוז · טווח תיאורי של 95%: {comparison.interval95PP.map(decimal).join(' עד ')} נקודות אחוז.</p>}
      </section>

      <Card className="overflow-hidden border-indigo-100" data-testid="search-financial-impact">
        <CardHeader title="פוטנציאל תוספת מחזור חודשי" subtitle="תחזית ל־30 יום · פריסה מלאה בתנועת החיפוש שנמדדה בניסוי" />
        <div className="mt-6 rounded-2xl bg-indigo-50 p-6 md:p-8">
          <strong className="block text-5xl font-semibold tracking-tight tabular-nums text-indigo-950 md:text-6xl" data-testid="monthly-revenue-projection">{projected ? `כ־${money(Math.round(monthly.fullOrderValueEstimate / 1000) * 1000)}` : 'טרם ניתן לאמוד'}</strong>
          <p className="mt-3 text-sm font-medium text-indigo-900">{projected ? `פער צפוי של כ־${number(monthly.extraCartedSearches)} חיפושים שיגיעו לסל בחודש, לעומת קו הבסיס של החיפוש הקיים.` : 'התחזית תופיע לאחר השלמת כיסוי החיפושים והערכים הכספיים.'}</p>
          <p className="mt-3 text-xs leading-6 text-indigo-800">תרחיש מותנה: היתרון הנצפה נשמר ונובע מהחיפוש, והסלים הנוספים הופכים להזמנות חדשות שלמות לפי שיעור הרכישה ושווי ההזמנות במקורי. זו תחזית למחזור הזמנות, לא הכנסה נוספת שכבר נמדדה.</p>
        </div>
        {projected && <>
          <h3 className="mt-6 text-sm font-semibold text-slate-800">החישוב מאחורי התחזית</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [number(monthly.volume.projectedSearches), 'חיפושים בחודש', 'ממוצע יומי מאז תחילת המדידה × 30'],
              [`${decimal(comparison.differencePP)} נק׳ אחוז`, 'פער בשיעור חיפוש לסל', 'הפער המוחלט שנמדד בשבוע האחרון'],
              [percent(monthly.baselineCartToProductOrderRate), 'מסל לרכישה תואמת', 'שיעור ההבשלה שנמדד בחיפוש הקיים'],
              [money(monthly.baselineOrderValuePerPurchasedSearch), 'שווי הזמנה לחיפוש שנרכש', 'ערך ההזמנות המלאות בקבוצת המקורי'],
            ].map(([value, label, note]) => <div key={label} className="rounded-xl border border-slate-100 p-4"><strong className="block text-xl tabular-nums text-slate-950">{value}</strong><p className="mt-2 text-xs font-medium text-slate-700">{label}</p><p className="mt-1 text-xs leading-5 text-slate-400">{note}</p></div>)}
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">מכפילים את ארבעת הגורמים המוצגים. {number(monthly.volume.regularSearches)} חיפושים נמדדו לאורך {decimal(monthly.volume.observedDays)} ימים בשתי קבוצות הניסוי יחד. התחזית מניחה שקצב זה מייצג גם את החודש הבא.</p>
          <p className="mt-2 text-xs leading-6 text-slate-600">בחישוב המצומצם למוצרים שתאמו לחיפוש בלבד, הפוטנציאל הוא {money(monthly.matchedProductValueEstimate)} בחודש. התחזית הגדולה כוללת גם פריטים אחרים באותן הזמנות, ומניחה שכל ההזמנה היא תוספת מחזור.</p>
        </>}
      </Card>

      <p className="px-1 text-xs leading-6 text-slate-500" data-testid="search-conversion-period">{search ? `חיפושים מ־${dateTime(search.window.from)} עד ${dateTime(search.window.to)} · פעילות נצפתה עד ${dateTime(search.window.observedUntil)} · חלון מעקב זהה של שעתיים לכל חיפוש · ללא השלמה אוטומטית · שעון ישראל.` : 'נתוני המדידה בעדכון.'}</p>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 text-sm" data-testid="measurement-details">
        <summary className="cursor-pointer font-medium text-slate-700">נתוני המקור, הנחות החישוב ומידת הוודאות</summary>
        {search && <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">מדד</th><th className="p-3">Semantix</th><th className="p-3">החיפוש הקיים</th></tr></thead><tbody>{sourceRows.map(([label, get, format]) => <tr key={label} className="border-t border-slate-100"><td className="p-3 text-slate-600">{label}</td>{variants.map(([key]) => <td key={key} className="p-3 font-semibold tabular-nums">{complete ? format(get(key)) : '—'}</td>)}</tr>)}</tbody></table></div>}
        <div className="mt-5 space-y-3 text-xs leading-6 text-slate-500">
          {projected && monthly.fullOrderValueInterval95 && <p>טווח המודל החודשי הנגזר מאי־הוודאות בפער הסלים: {monthly.fullOrderValueInterval95.map(money).join(' עד ')}. הטווח מתחשב בחיפושים חוזרים של אותו דפדפן, אך אינו כולל אי־ודאות נוספת בנפח התנועה, בהבשלה לרכישה או בשווי ההזמנה. אינו מתקן הבדלי שיוך בין הקבוצות.</p>}
          <p>אין הנחה שעלייה יחסית בסלים היא עלייה זהה בהכנסות האתר כולו. התחזית משתמשת רק בתנועת החיפוש שנמדדה, בפער המוחלט בשיעור ההוספה לסל ובנתוני הרכישה בקבוצת המקורי. תוספת הכנסה סיבתית טרם נקבעה.</p>
          <p>שווי המוצרים התואמים כולל רק פריטים שהגיעו מאותו חיפוש וביקור, לאחר הקצאה יחסית של הנחת הזמנה וללא הגדלה בגלל משלוח. תרחיש ההזמנות השלמות משתמש בערך ההזמנות המדווחות המלא, הכולל גם פריטים אחרים ועשוי לכלול משלוח. מקור הסכומים הוא עמוד הצלחת ההזמנה; סליקה, ביטולים והחזרים אינם מאומתים כאן.</p>
          {impact && <p>בהיקף התנועה הנוכחי של Semantix בתקופה: {money(impact.observed.semantix.matchedProductValue)} במוצרים תואמים מתוך {number(impact.observed.semantix.valuedOrders)} הזמנות עם ערך כספי מלא; {number(impact.observed.semantix.missingValueOrders)} הזמנות נוספות ללא ערך כספי מלא. הנתון הוא קישור להזמנות מדווחות, ואינו תוספת מחזור מוכחת.</p>}
          <p>ברישומים חדשים זמן החיפוש הוא תחילת הבקשה בשרת, כדי שהשהיית רישום ברקע לא תפסול לחיצה מוקדמת. ברישומים ישנים נשמר זמן הרישום המקורי, ללא השלמה משוערת. לכל חיפוש נמדדות הוספות לסל והזמנות במשך שעתיים בדיוק.</p>
          <p>נכללים חיפושים עם שיוך עקבי לקבוצת הניסוי. כל חיפוש נספר פעם אחת, גם אם הוביל לכמה מוצרים. ההוספה לסל דורשת אישור מהחנות וקישור למוצר מאותו חיפוש. מזהי הקטלוג ומזהי Magento מחוברים במיפוי המוצר.</p>
          <p data-testid="measurement-period">המדידה המקורית מתחילה ב־{dateTime(report.window.from)} ונשמרת ללא איפוס. החישובים מבוססים על {report.measurement.complete ? 'מקורות נתונים מלאים' : 'מקורות נתונים שעדיין בעדכון'}. עודכן {dateTime(report.generatedAt)}.</p>
        </div>
      </details>
    </>}
  </div>;
}
