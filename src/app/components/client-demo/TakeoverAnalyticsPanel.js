'use client'
import React from 'react';
import { Clock3, FlaskConical, MousePointer2, RefreshCw, ShoppingBag } from 'lucide-react';
import { Card, CardHeader, PageHeader } from './ui';
import { useOptimizer, useOptimizerResource } from './OptimizerContext';

const number = n => Number.isFinite(n) ? n.toLocaleString('he-IL') : '—';
const percent = n => Number.isFinite(n) ? `${(n * 100).toLocaleString('he-IL', { maximumFractionDigits: 1 })}%` : '—';
const money = n => Number.isFinite(n) ? n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }) : '—';
const dateTime = value => new Date(value).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const variants = [['semantix', 'Semantix'], ['native', 'החיפוש הקיים']];

export default function TakeoverAnalyticsPanel() {
  const { refresh } = useOptimizer();
  const { data: report, loading, error } = useOptimizerResource('dashboard/ab-test');
  const complete = report?.measurement.complete;
  const orders = report?.orders;
  const search = report?.searchConversion;
  const searchComplete = complete && search?.complete;
  const impact = search?.financialImpact;
  const comparison = search?.comparison;
  const searchComparisons = [
    ['חיפושים רגילים שהבשילו', 'searches', number],
    ['חיפושים שהובילו להוספה מאושרת לסל', 'cartedSearches', number],
    ['חיפוש → סל', 'searchCartRate', percent],
    ['חיפושים עם מוצר תואם בהזמנה מדווחת', 'productOrderedSearches', number],
  ];
  const orderComparisons = [
    ['מבקרים מדודים בקבוצה', 'measuredVisitors', number],
    ['מבקרים עם לפחות הזמנה מדווחת אחת', 'orderingVisitors', number],
    ['שיעור מבקרים עם הזמנה מדווחת', 'visitorOrderRate', percent],
    ['הזמנות מדווחות עם שיוך עקבי לקבוצה', 'reportedOrders', number],
    ['מהן קושרו לחיפוש באותו ביקור', 'searchLinkedOrders', number],
    ['מהן כוללות מוצר שהגיע מהחיפוש', 'productLinkedOrders', number],
    ['צירופי מוצר–חיפוש שהופיעו בהזמנה', 'purchasedProducts', number],
    ['מוצר מהחיפוש → הזמנה מדווחת', 'productPurchaseRate', percent],
    ['כיסוי הקישור להזמנות בקבוצה', 'searchLinkCoverage', percent],
  ];
  const comparisons = report ? [
    ['מוצרים שהוקלקו או נוספו ישירות מהחיפוש', 'clickedProducts', number],
    ['אותם מוצרים שנוספו לסל באישור החנות', 'addedProducts', number],
    ['מתוכם נוספו ישירות מכרטיס התוצאה, בלי קליק', 'directAddedProducts', number],
    ['שיעור הוספה מאושרת לסל מתוך המוצרים האלה', 'productCartRate', percent],
  ] : [];

  return <div dir="rtl" className="space-y-6" data-testid="takeover-analytics">
    <PageHeader eyebrow="STEIMATZKY × SEMANTIX" title="מחיפוש לסל — ההשפעה העסקית"
      subtitle="כמה חיפושים הובילו להוספה מאושרת לסל, בהשוואה לחיפוש הקיים."
      right={<button aria-label="רענון נתוני הניסוי" onClick={refresh} disabled={loading} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-indigo-600 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>} />

    {loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">אוספים את נתוני המדידה החדשה…</div>}
    {error && <Card className="p-8 text-center"><p role="alert" className="font-medium text-slate-800">הנתונים אינם זמינים כרגע</p><p className="mt-2 text-sm text-slate-500">אפשר לרענן בעוד רגע כדי לקבל את העדכון האחרון.</p><button onClick={refresh} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">ניסיון נוסף</button></Card>}

    {report && !loading && !error && <>
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-5 py-4 text-sm" data-testid="measurement-period">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold text-indigo-950"><Clock3 className="h-4 w-4" />מדידה חדשה החל מ־{dateTime(report.window.from)}</div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700">{report.experiment.active ? 'ניסוי פעיל' : 'הניסוי מושהה'} · {complete ? 'תוצאות ראשוניות' : 'הנתונים בעדכון'}</span>
        </div>
        <p className="mt-2 text-xs leading-6 text-indigo-800">כל שלבי ההמרה חייבים להתרחש מתחילת המדידה. התקופה קבועה ואין אפשרות להציג נתונים מוקדמים יותר. שעון ישראל.</p>
      </section>

      {search && <section className="px-1 text-sm text-slate-600" data-testid="search-conversion-period">
        <h2 className="font-semibold text-slate-900">ההשוואה המרכזית · 24 השעות האחרונות</h2>
        <p className="mt-1 text-xs leading-6">חיפושים מ־{dateTime(search.window.from)} עד {dateTime(search.window.to)} · לכל חיפוש ניתנו לפחות שעתיים להבשיל · פעילות נצפתה עד {dateTime(search.window.observedUntil)}</p>
      </section>}

      <div className="grid gap-4 md:grid-cols-2" data-testid="search-conversion-summary">
        {variants.map(([key, label]) => {
          const arm = search?.groups[key], featured = key === 'semantix';
          return <section key={key} data-variant={key} className={`rounded-3xl border p-6 md:p-8 ${featured ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
            <div className={`flex items-center gap-2 text-sm font-medium ${featured ? 'text-indigo-200' : 'text-slate-500'}`}><ShoppingBag className="h-4 w-4" />{label}</div>
            <h2 className="mt-4 text-base font-medium">חיפושים שהגיעו לסל</h2>
            <strong className="mt-4 block text-5xl font-semibold tabular-nums md:text-6xl">{searchComplete ? percent(arm.searchCartRate) : '—'}</strong>
            <p className={`mt-4 text-sm leading-7 ${featured ? 'text-slate-300' : 'text-slate-600'}`}>
              <strong className={featured ? 'text-white' : 'text-slate-900'}>{searchComplete ? number(arm.cartedSearches) : '—'}</strong> חיפושים הובילו להוספה מאושרת לסל, מתוך <strong className={featured ? 'text-white' : 'text-slate-900'}>{searchComplete ? number(arm.searches) : '—'}</strong> חיפושים רגילים שהבשילו.
            </p>
            {searchComplete && !arm.searches && <p className={`mt-2 text-xs ${featured ? 'text-indigo-200' : 'text-slate-500'}`}>השיעור יופיע כשייקלטו חיפושים עם זמן מספיק להבשלה.</p>}
            <div className={`mt-5 flex items-start gap-2 border-t pt-4 text-xs leading-6 ${featured ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'}`}><MousePointer2 className="mt-1 h-3.5 w-3.5 shrink-0" /><span>כל חיפוש נספר פעם אחת, גם אם נוספו ממנו כמה מוצרים. השלמה אוטומטית נמדדת בנפרד.</span></div>
          </section>;
        })}
      </div>

      {searchComplete && Number.isFinite(comparison?.relativeLift) && <section className={`rounded-2xl border px-6 py-5 ${comparison.relativeLift > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`} data-testid="search-cart-difference">
        <div className="text-sm font-medium text-slate-800">הפער הנצפה מול החיפוש הקיים</div>
        <strong className="mt-2 block text-3xl font-semibold tabular-nums text-slate-950">{comparison.relativeLift >= 0 ? '+' : ''}{percent(comparison.relativeLift)} בשיעור חיפוש→סל</strong>
        <p className="mt-2 text-sm leading-7 text-slate-800">פער של {number(Number(comparison.differencePP.toFixed(1)))} נקודות אחוז · כ־{number(Math.round(comparison.extraCartedSearches))} חיפושים שהגיעו לסל מעל קו ההשוואה המחושב לנפח החיפוש של Semantix.</p>
        <p className="mt-2 text-xs leading-6 text-slate-600">זהו פער נצפה בניסוי. מידת הוודאות והבדלי השיוך נבחנים בנפרד; תוספת הכנסה סיבתית טרם נקבעה.</p>
      </section>}

      {searchComplete && impact && <Card className="overflow-hidden" data-testid="search-financial-impact">
        <CardHeader title="המשמעות הכספית" subtitle="אותו חלון מדידה · סכומים בשקלים · היקף החיפוש של Semantix" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-medium text-slate-600">שווי מוצרים מהחיפוש בהזמנות מדווחות</h3>
            <strong className="mt-3 block text-3xl font-semibold tabular-nums text-slate-950">{orders?.complete ? money(impact.observed.semantix.matchedProductValue) : '—'}</strong>
            <p className="mt-3 text-xs leading-6 text-slate-600">מוצרים תואמים מתוך {number(impact.observed.semantix.valuedOrders)} הזמנות עם סכום מזוהה. נכלל ערך המוצרים שהגיעו מאותו חיפוש, לאחר הקצאת הנחת הזמנה וללא הגדלה בגלל משלוח.</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">סכום שנקשר לחיפוש בדיווח ההזמנה; אינו סכום הכנסה נוספת שהניסוי הוכיח.</p>
            {!!impact.observed.semantix.missingValueOrders && <p className="mt-2 text-xs text-slate-500">{number(impact.observed.semantix.missingValueOrders)} הזמנות נוספות ללא ערך כספי מלא אינן נכללות בסכום.</p>}
          </section>
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
            <h3 className="text-sm font-medium text-indigo-800">אומדן פוטנציאל ההכנסה מהפער בסלים</h3>
            <strong className="mt-3 block text-3xl font-semibold tabular-nums text-indigo-950">{impact.model.status === 'available' ? money(impact.model.estimate) : 'טרם ניתן לאמוד'}</strong>
            <p className="mt-3 text-xs leading-6 text-indigo-900">תרחיש מותנה: אם הפער בסלים נובע מהחיפוש, והסלים הנוספים יבשילו לערך רכישה בשיעור שנמדד בחיפוש הקיים.</p>
            <p className="mt-2 text-xs font-medium leading-6 text-indigo-900">זהו אומדן לתקופה ולהיקף התנועה המוצגים, ולא כסף נוסף שכבר הוכח שנכנס.</p>
          </section>
        </div>
        <details className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-800">איך מחושב האומדן ומה מידת הוודאות?</summary>
          <p className="mt-3">מספר החיפושים אצלנו × הפער בשיעור חיפוש→סל × שיעור ההבשלה מסל לרכישה תואמת במקורי × שווי מוצרים ממוצע לחיפוש שנרכש במקורי.</p>
          {impact.model.status === 'available' && <p>שיעור ההבשלה בבסיס המודל: {percent(impact.model.baselineCartToProductOrderRate)} · שווי מוצרים ממוצע: {money(impact.model.baselineValuePerPurchasedSearch)}. לא בוצעה הכפלה לכל תנועת האתר או תחזית חודשית.</p>}
          {comparison.interval95PP && <p>טווח תיאורי של 95% לפער בשיעור ההוספה לסל: {comparison.interval95PP.map(v => v.toFixed(1)).join(' עד ')} נקודות אחוז. החישוב מתחשב בחיפושים חוזרים מאותו מבקר; אינו מתקן הבדלי שיוך.</p>}
          {impact.model.interval95 && <p>טווח המודל הכספי הנגזר מפער הסלים: {impact.model.interval95.map(money).join(' עד ')}. אינו כולל אי־ודאות נוספת בשיעור ההבשלה או בשווי הרכישה.</p>}
          <p>מקור הסכומים הוא דיווח מעמוד הצלחת ההזמנה. סליקה, ביטולים והחזרים אינם מאומתים כאן. תוספת הכנסה מוכחת עדיין לא נקבעה.</p>
        </details>
      </Card>}

      {search && <Card className="overflow-hidden"><CardHeader title="ביצועי חיפוש→סל" subtitle="חיפושים רגילים באותו חלון ובאותה הגדרה בשתי הקבוצות" />
        <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">מדד</th><th className="px-5 py-3">Semantix</th><th className="px-5 py-3">החיפוש הקיים</th></tr></thead><tbody>{searchComparisons.map(([label, field, format]) => <tr key={field} className="border-t border-slate-100"><td className="px-5 py-3.5 text-slate-600">{label}</td>{variants.map(([key]) => <td key={key} className="px-5 py-3.5 font-semibold tabular-nums">{searchComplete ? format(search.groups[key][field]) : '—'}</td>)}</tr>)}</tbody></table></div>
      </Card>}

      <h2 className="pt-3 text-lg font-semibold text-slate-900">מדדים משלימים · מצטבר מתחילת המדידה</h2>
      <Card className="overflow-hidden"><CardHeader title="ביצועי המוצר שהוקלק בחיפוש" subtitle="המכנה הוא מספר המוצרים שהוקלקו בחיפוש או נוספו ישירות מהתוצאות; המונה הוא אותם מוצרים עם הוספה מאושרת לסל." />
        <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">מדד</th><th className="px-5 py-3 text-indigo-700">Semantix</th><th className="px-5 py-3">החיפוש הקיים</th></tr></thead><tbody>{comparisons.map(([label, field, format]) => <tr key={field} className="border-t border-slate-100"><td className="px-5 py-3.5 text-slate-600">{label}</td>{variants.map(([key]) => <td key={key} className="px-5 py-3.5 font-semibold tabular-nums">{complete ? format(report.groups[key][field]) : '—'}</td>)}</tr>)}</tbody></table></div>
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-xs leading-6 text-slate-500"><p>{report.measurement.note}</p><p>הזמנות מדווחות מוצגות בנפרד בהמשך. לחיצה על כפתור ההוספה בלבד אינה הוספה מאושרת לסל.</p></div>
      </Card>

      <div data-testid="order-conversion-summary"><Card className="overflow-hidden">
        <CardHeader title="הזמנות מדווחות וקישור לחיפוש" subtitle="דיווח מעמוד הצלחת ההזמנה · כל מספר הזמנה נספר פעם אחת · קישור לחיפוש נבדק בנפרד" />
        {!orders?.complete ? <p className="px-5 py-6 text-sm text-slate-500">מדידת ההזמנות אינה זמינה כרגע. נתוני ההוספה לסל מוצגים בנפרד.</p> : <>
          <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">מדד</th><th className="px-5 py-3 text-indigo-700">Semantix</th><th className="px-5 py-3">החיפוש הקיים</th></tr></thead><tbody>{orderComparisons.map(([label, field, format]) => <tr key={field} className="border-t border-slate-100"><td className="px-5 py-3.5 text-slate-600">{label}</td>{variants.map(([key]) => <td key={key} className="px-5 py-3.5 font-semibold tabular-nums">{format(orders.groups[key][field])}</td>)}</tr>)}</tbody></table></div>
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-xs leading-6 text-slate-500"><p>בתקופה נקלטו {number(orders.coverage.uniqueCompletedOrders)} הזמנות מדווחות ייחודיות. הטבלה כוללת רק הזמנות שאפשר לשייך בעקביות לאחת מקבוצות הניסוי.</p><p>שיעור המבקרים עם הזמנה מחושב מכל המבקרים עם חשיפה או חיפוש משויך בתקופה, גם כשההזמנה לא קושרה לחיפוש. כל מזהה דפדפן נספר פעם אחת; מבקר עם כמה הזמנות נספר פעם אחת במונה.</p><p>{orders.note}</p><p>שיעור רכישת המוצר: צירופי מוצר–חיפוש שנמצאו בפריטי הזמנה, מתוך המוצרים שהוקלקו או נוספו ישירות מהחיפוש. כל צירוף נספר פעם אחת, ללא תלות בכמות היחידות.</p><p>הזמנה שקושרה לחיפוש אינה בהכרח כוללת את המוצר שנלחץ. מוצר נחשב נרכש מהחיפוש רק כשמזהה פריט ההזמנה תואם. הזמנות ללא קישור נותרות בספירה הכללית של הקבוצה. בהזמנה יש מזהה חיפוש אחד; רכישות מחיפושים אחרים באותו סל עשויות לא להיכלל בקישור.</p></div>
        </>}
      </Card></div>

      <Card className="overflow-hidden"><CardHeader title="מוצרים מהחיפוש לסל" subtitle="פעילות לפי מוצר · כל מוצר נספר פעם אחת לכל חיפוש ומבקר" />
        <div className="mt-4 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">שם המוצר</th><th className="px-5 py-3">Semantix · הוקלקו</th><th className="px-5 py-3">Semantix · נוספו</th><th className="px-5 py-3">חיפוש קיים · הוקלקו</th><th className="px-5 py-3">חיפוש קיים · נוספו</th></tr></thead><tbody>{report.topProducts.map(row => <tr key={row.productId} className="border-t border-slate-100"><td className="min-w-48 max-w-sm break-words px-5 py-3 font-medium">{row.productName || 'שם המוצר אינו זמין'}</td>{[row.semantix.clicked, row.semantix.added, row.native.clicked, row.native.added].map((value, index) => <td key={index} className="px-5 py-3 tabular-nums">{complete ? number(value) : '—'}</td>)}</tr>)}</tbody></table>{!report.topProducts.length && <p className="p-8 text-center text-sm text-slate-400">המוצרים יופיעו עם קליטת הקלקות מהחיפוש במדידה החדשה</p>}</div>
      </Card>

      <details className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700">חלוקת התנועה בניסוי</summary>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><FlaskConical className="h-4 w-4" />החלוקה המוגדרת הנוכחית מול החשיפות שנמדדו בתקופה החדשה</div>
        <div className="mt-4 space-y-3">{variants.map(([key, label]) => <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><strong className="min-w-24">{label}</strong><span>מוגדר: {percent(report.experiment.configuredSplit[key])}</span><span>נמדד: {complete ? percent(report.observedSplit[key]) : '—'}</span></div>)}</div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">כיסוי הקישור ואופן המדידה</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{variants.map(([key, label]) => {
          const arm = report.groups[key];
          return <div key={key} className="rounded-xl bg-slate-50 p-4 leading-7"><strong className="text-sm text-slate-800">{label}</strong><p>הקלקות שקושרו לחיפוש: {number(arm.linkedClickEvents)} מתוך {number(arm.clickEvents)} · {percent(arm.clickLinkCoverage)}</p><p>הוספות מאושרות שקושרו למוצר שהוקלק: {number(arm.linkedCartEvents)} מתוך {number(arm.cartEvents)} · {percent(arm.cartLinkCoverage)}</p></div>;
        })}</div>
        <div className="mt-4 space-y-2 leading-6"><p>הכיסוי מציג אירועי מוצר שנמדדו בקבוצה בכל האתר, ומתוכם את אלה שקושרו לחיפוש. אירועים ללא קישור מוכח אינם נכללים בהמרת המוצר.</p><p>מזהי הקטלוג ומזהי Magento מחוברים באמצעות מיפוי המוצר שנשמר בקטלוג. מזהה הקלקה ומזהה ביקור, כאשר נשמרו, חייבים להתאים. אין שיוך לפי שם מוצר או לפי חיפוש קודם של המבקר.</p><p>גם הקלקה ברשימת תוצאות בזמן הקלדה נכללת כאשר נרשם עבורה חיפוש תואם. פעילות ללא שיוך עקבי לקבוצת ניסוי אינה נכללת בהשוואה.</p><p>זמן ההתחלה קבוע לכל האירועים, החשיפות והחיפושים. אין שימוש באירועים שקדמו לו, גם לצורך קישור להוספה מאוחרת לסל. אלו נתוני הוספה לסל, ואינם מוכיחים תוספת המרה סיבתית.</p><p>עודכן {dateTime(report.generatedAt)} · שאר הכלים נעולים לעריכה.</p></div>
      </details>
    </>}
  </div>;
}
