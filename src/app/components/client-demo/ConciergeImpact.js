'use client'
import { MessagesSquare, Users, ShoppingCart, ShoppingBag, Wallet } from 'lucide-react';
import { Card } from './ui';

const number = value => value == null ? '—' : value.toLocaleString('he-IL');
const percent = value => value == null ? '—' : `${(value * 100).toLocaleString('he-IL', { maximumFractionDigits: 1 })}%`;
const money = revenue => !revenue ? '—' : revenue.orders === 0 ? '0' : revenue.totals.length
  ? revenue.totals.map(total => new Intl.NumberFormat('he-IL', { style: 'currency', currency: total.currency, maximumFractionDigits: 2 }).format(total.amount)).join(' · ')
  : '—';

export default function ConciergeImpact({ data }) {
  if (!data) return null;
  if (data.status !== 'ok') return <Card className="mb-5 p-5"><h2 className="font-semibold">ביצועי הקונסיירז׳</h2><p role="status" className="mt-2 text-sm text-slate-500">נתוני הקונסיירז׳ אינם זמינים כרגע. נסו לרענן.</p></Card>;
  const coverage = data.coverage;
  const revenue = data.revenue;
  const metrics = [
    [Wallet, 'סכום הזמנות אחרי קונסיירז׳', money(revenue), !revenue ? 'סכומי ההזמנות אינם זמינים בטווח שנבחר' : !revenue.orders ? 'לא נקלטו רכישות ששולמו אחרי ההפעלה באותם ביקורים' : `${number(revenue.measuredOrders)} מתוך ${number(revenue.orders)} הזמנות עם סכום ומטבע${revenue.missingOrders ? ' · סכום חלקי' : ''}`],
    [Users, 'ביקורים עם קונסיירז׳', number(data.visits), `${number(coverage.identifiedConversations)} הפעלות עם מזהה דפדפן · כמה הפעלות באותו ביקור נספרות פעם אחת`],
    [ShoppingCart, 'המשיכו להוספה לסל', percent(data.cartRate), `${number(data.cartVisits)} מתוך ${number(data.visits)} ביקורים · הוספה מוצלחת שנקלטה אחרי ההפעלה`],
    [ShoppingBag, 'המשיכו לרכישה', percent(data.purchaseRate), data.purchaseRate == null ? 'לא נקלטו הזמנות ששולמו בטווח שנבחר' : `${number(data.purchaseVisits)} מתוך ${number(data.visits)} ביקורים · רכישה ששולמה אחרי ההפעלה`],
    [MessagesSquare, 'ביקורים עם דיאלוג', number(data.engagedVisits), 'נרשמה הודעת לקוח או יותר מסבב אחד בשיחה'],
  ];
  return <section aria-label="ביצועי הקונסיירז׳" className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div><div className="flex items-center gap-2"><MessagesSquare className="h-5 w-5 text-indigo-600" /><h2 className="font-semibold text-slate-900">ביצועי הקונסיירז׳</h2><span className="rounded-full bg-white px-2 py-1 text-[11px] text-indigo-700">שיוך לפי ביקור</span></div><p className="mt-2 text-sm text-slate-600">מה קרה בחנות אחרי הפעלת הקונסיירז׳, באותו ביקור ובטווח התאריכים שנבחר.</p></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">{metrics.map(([Icon, label, value, foot]) => <Card key={label} className="p-4"><div className="flex gap-2 items-center text-sm text-slate-600"><Icon className="h-4 w-4 shrink-0" />{label}</div><div className="mt-3 text-3xl xl:text-2xl 2xl:text-3xl font-bold text-indigo-950 tabular-nums break-words">{value}</div><p className="mt-2 text-xs text-slate-500 leading-5">{foot}</p></Card>)}</div>
    <p className="mt-4 text-xs text-slate-600 leading-6">אין עדיין מדידת קליקים ישירה מתוך השיחה. הפעולות כאן משויכות לביקור ויכולות להגיע גם ממוצרים מחוץ לשיחה; הנתונים אינם מודדים תוספת מכירות שנגרמה מהקונסיירז׳.</p>
    <details className="mt-2 text-xs text-slate-500 leading-6"><summary className="cursor-pointer">איך נספרים הביקורים</summary><p className="mt-2">ביקור משוחזר לפי מזהה דפדפן ומסתיים אחרי יותר מ־30 דקות ללא פעילות שנמדדה. נספרות רק פעולות לאחר ההפעלה הראשונה, וכל שלב נספר בנפרד. הפעלה יכולה להיות אוטומטית ואינה מעידה שהתשובה נקראה. רשומות ללא מזהה דפדפן תקין אינן משתתפות בשיוך.</p><p>סכום ההזמנות הוא מלוא סכום ההזמנה ברוטו כפי שנקלט, כולל מוצרים מחוץ לשיחה וללא התאמה להחזרים. כל הזמנה נספרת פעם אחת; מטבעות שונים מוצגים בנפרד. הזמנות ללא סכום או מטבע אינן נכללות בסכום ומסומנות בכיסוי המדידה.</p><p>זוהו מזהים ב־{number(coverage.identifiedConversations)} מתוך {number(coverage.conversations)} הפעלות וב־{number(coverage.identifiedPaidOrders)} מתוך {number(coverage.paidOrders)} הזמנות ששולמו בטווח. רשומות ללא מזהה אינן ניתנות לשיוך, ולכן המדידה עשויה להיות חלקית.</p></details>
  </section>;
}
