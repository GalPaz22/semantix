'use client'
import React from 'react';
import { Clock3, FlaskConical, MousePointer2, RefreshCw, ShoppingBag } from 'lucide-react';
import { Card, CardHeader, PageHeader } from './ui';
import { useOptimizer, useOptimizerResource } from './OptimizerContext';

const number = n => Number.isFinite(n) ? n.toLocaleString('he-IL') : '—';
const percent = n => Number.isFinite(n) ? `${(n * 100).toLocaleString('he-IL', { maximumFractionDigits: 1 })}%` : '—';
const dateTime = value => new Date(value).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const variants = [['semantix', 'Semantix'], ['native', 'החיפוש הקיים']];

export default function TakeoverAnalyticsPanel() {
  const { refresh } = useOptimizer();
  const { data: report, loading, error } = useOptimizerResource('dashboard/ab-test');
  const complete = report?.measurement.complete;
  const orders = report?.orders;
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
    <PageHeader eyebrow="STEIMATZKY × SEMANTIX" title="המרה של מוצר מהחיפוש לסל"
      subtitle="עוקבים אחר המוצר שהוקלק או נוסף ישירות מתוצאות החיפוש ונוסף לסל באישור החנות, לפי מזהים תואמים."
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

      <div className="grid gap-4 md:grid-cols-2" data-testid="product-conversion-summary">
        {variants.map(([key, label]) => {
          const arm = report.groups[key], featured = key === 'semantix';
          return <section key={key} data-variant={key} className={`rounded-3xl border p-6 md:p-8 ${featured ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
            <div className={`flex items-center gap-2 text-sm font-medium ${featured ? 'text-indigo-200' : 'text-slate-500'}`}><ShoppingBag className="h-4 w-4" />{label}</div>
            <h2 className="mt-4 text-base font-medium">המרת מוצר מהחיפוש לסל</h2>
            <strong className="mt-4 block text-5xl font-semibold tabular-nums md:text-6xl">{complete ? percent(arm.productCartRate) : '—'}</strong>
            <p className={`mt-4 text-sm leading-7 ${featured ? 'text-slate-300' : 'text-slate-600'}`}>
              <strong className={featured ? 'text-white' : 'text-slate-900'}>{complete ? number(arm.addedProducts) : '—'}</strong> מוצרים נוספו לסל באישור החנות, מתוך <strong className={featured ? 'text-white' : 'text-slate-900'}>{complete ? number(arm.clickedProducts) : '—'}</strong> מוצרים שהוקלקו או נוספו ישירות מהחיפוש.
            </p>
            {complete && !arm.clickedProducts && <p className={`mt-2 text-xs ${featured ? 'text-indigo-200' : 'text-slate-500'}`}>השיעור יופיע כשייקלטו הקלקות חדשות שניתן לקשר לחיפוש.</p>}
            <div className={`mt-5 flex items-start gap-2 border-t pt-4 text-xs leading-6 ${featured ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'}`}><MousePointer2 className="mt-1 h-3.5 w-3.5 shrink-0" /><span>אותו מוצר, אותו חיפוש ואותו מבקר. כל צירוף נספר פעם אחת, גם אם הוקלק או נוסף לסל שוב.</span></div>
          </section>;
        })}
      </div>

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
