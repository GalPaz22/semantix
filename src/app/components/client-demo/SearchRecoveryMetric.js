'use client'
import React from 'react';
import { Wallet } from 'lucide-react';
import { Card } from './ui';

const date = value => new Date(value).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });

export default function SearchRecoveryMetric({ snapshot }) {
  if (!snapshot) return null;
  const amount = snapshot.amount.toLocaleString('he-IL', { style: 'currency', currency: snapshot.currency, maximumFractionDigits: 0 });
  return <Card className="p-5 border-emerald-200 bg-emerald-50/40">
    <div data-testid="search-recovery-metric">
      <div className="flex gap-2 text-sm font-bold text-slate-900"><Wallet className="h-4 w-4 shrink-0" />שווי רכישות מחיפושים ללא תוצאות במקורי</div>
      <strong className="mt-3 block text-3xl font-extrabold text-slate-900 tabular-nums" data-testid="search-recovery-amount">{amount}</strong>
      <p className="mt-2 text-xs font-semibold text-slate-600">{snapshot.orders} הזמנות · {snapshot.queryCount} ביטויי חיפוש</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">תמונת מצב ל־{date(snapshot.generatedAt)} · קבועה גם כשמשנים את טווח התאריכים</p>
      <details className="mt-3 text-xs leading-6 text-slate-600">
        <summary className="cursor-pointer font-medium">תקופת המדידה ומשמעות הסכום</summary>
        <p className="mt-2">פריטים שנבחרו מתוצאות Semantix ונרכשו. אותם ביטויים החזירו אפס תוצאות בחיפוש המקורי בבדיקה ב־{date(snapshot.generatedAt)}.</p>
        <p className="mt-2">נכללו סשנים שהחיפוש הראשון שלהם היה בין {date(snapshot.window.from)} ל־{date(snapshot.window.cohortThrough)}, עם {snapshot.window.followUpHours} שעות מעקב. פעילות הרכישה נצפתה עד {date(snapshot.window.observedUntil)}. השעות לפי שעון ישראל.</p>
        <p className="mt-2">זהו שווי הפריטים המשויכים בלבד, ללא משלוח או פריטים אחרים בסל. הבדיקה משקפת את החיפוש המקורי כיום; תוספת הכנסה לעומת העבר לא הוכחה.</p>
      </details>
    </div>
  </Card>;
}
