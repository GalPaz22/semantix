'use client'
import React from 'react';
import { Wallet } from 'lucide-react';
import { Card } from './ui';

const date = value => new Date(value).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });

export default function SearchRecoveryMetric({ snapshot }) {
  if (!snapshot) return null;
  const money = value => value.toLocaleString('he-IL', { style: 'currency', currency: snapshot.currency, maximumFractionDigits: 0 });
  const productVisibility = snapshot.comparison === 'current-native-purchased-product-visibility';
  const title = productVisibility ? 'שווי רכישות כשהמוצר לא בעמוד הראשון במקורי' : 'שווי רכישות מחיפושים ללא תוצאות במקורי';
  return <Card className="p-5 border-emerald-200 bg-emerald-50/40">
    <div data-testid="search-recovery-metric">
      <div className="flex gap-2 text-sm font-bold text-slate-900"><Wallet className="h-4 w-4 shrink-0" />{title}</div>
      <strong className="mt-3 block text-3xl font-extrabold text-slate-900 tabular-nums" data-testid="search-recovery-amount">{money(snapshot.amount)}</strong>
      <p className="mt-2 text-xs font-semibold text-slate-600">{snapshot.orders} הזמנות · {snapshot.queryCount} ביטויי חיפוש</p>
      {productVisibility && <div className="mt-3 space-y-1 text-xs leading-5 text-slate-600" data-testid="search-recovery-breakdown">
        <p>מוצר שלא נמצא במקורי: <strong>{money(snapshot.breakdown.missingProduct)}</strong></p>
        <p>מוצרים בעמודים מאוחרים: <strong>{money(snapshot.breakdown.belowFirstPage)}</strong></p>
      </div>}
      <p className="mt-2 text-xs leading-5 text-slate-500">תמונת מצב ל־{date(snapshot.generatedAt)} · קבועה גם כשמשנים את טווח התאריכים</p>
      <details className="mt-3 text-xs leading-6 text-slate-600">
        <summary className="cursor-pointer font-medium">תקופת המדידה ומשמעות הסכום</summary>
        <p className="mt-2">{productVisibility
          ? `פריטים שנבחרו מתוצאות Semantix ונרכשו. בבדיקת המקורי ב־${date(snapshot.nativeCheck.checkedAt)} המוצר שנרכש היה חסר או נמצא בעמוד מאוחר. זו השוואת נגישות למוצר, ולא ספירת חיפושי אפס.`
          : `פריטים שנבחרו מתוצאות Semantix ונרכשו. אותם ביטויים החזירו אפס תוצאות בחיפוש המקורי בבדיקה ב־${date(snapshot.generatedAt)}.`}</p>
        {productVisibility && <ul className="mt-3 space-y-2" data-testid="search-recovery-evidence">
          {snapshot.evidence.map(item => <li key={item.query}>״{item.query}״ · {item.product} · {money(item.amount)}<br />במקורי: {item.nativeRank === null ? 'המוצר חסר; הוצגו אביזרי צמחים' : `מקום ${item.nativeRank}`} · אצלנו ברישום החיפוש: מקום {item.semantixRank}</li>)}
        </ul>}
        <p className="mt-2">נכללו סשנים שהחיפוש הראשון שלהם היה בין {date(snapshot.window.from)} ל־{date(snapshot.window.cohortThrough)}, עם {snapshot.window.followUpHours} שעות מעקב. פעילות הרכישה נצפתה עד {date(snapshot.window.observedUntil)}. השעות לפי שעון ישראל.</p>
        <p className="mt-2">זהו שווי הפריטים המשויכים בלבד, ללא משלוח או פריטים אחרים בסל. הבדיקה משקפת את החיפוש המקורי כיום; תוספת הכנסה לעומת העבר לא הוכחה.</p>
      </details>
    </div>
  </Card>;
}
