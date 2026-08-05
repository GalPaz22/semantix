'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const FIELDS = [
  {
    key: 'sessions',
    label: 'חיפושים חודשיים',
    placeholder: 'לדוגמה: 8000',
    hint: 'כמה פעמים קונים משתמשים בשורת החיפוש שלכם בחודש.',
  },
  {
    key: 'zeroRate',
    label: 'שיעור חיפושים ללא תוצאות (%)',
    placeholder: 'לדוגמה: 15',
    hint: 'אחוז החיפושים שלא מחזירים מוצרים. Wine House מדד 39% לפני הוספת התאוששות — ראו את הפרויקט למטה אם אינכם יודעים את השיעור שלכם.',
  },
  {
    key: 'conversionRate',
    label: 'שיעור המרה טיפוסי מחיפוש (%)',
    placeholder: 'לדוגמה: 3',
    hint: 'שיעור ההמרה מחיפוש לרכישה בחנות שלכם הוא נקודת התחלה סבירה.',
  },
  {
    key: 'aov',
    label: 'ערך הזמנה ממוצע ($)',
    placeholder: 'לדוגמה: 65',
    hint: 'ערך ההזמנה הממוצע בחנות.',
  },
];

function toNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export default function ZeroResultCalculator() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [values, setValues] = useState({
    sessions: searchParams.get('sessions') || '',
    zeroRate: searchParams.get('zeroRate') || '',
    conversionRate: searchParams.get('conversionRate') || '',
    aov: searchParams.get('aov') || '',
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [values]);

  const handleChange = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const result = useMemo(() => {
    const sessions = toNumber(values.sessions);
    const zeroRate = toNumber(values.zeroRate);
    const conversionRate = toNumber(values.conversionRate);
    const aov = toNumber(values.aov);

    if (sessions === null || zeroRate === null || conversionRate === null || aov === null) {
      return null;
    }

    const zeroResultSearches = sessions * (zeroRate / 100);
    const monthlyRevenueAtRisk = zeroResultSearches * (conversionRate / 100) * aov;

    return {
      zeroResultSearches,
      monthlyRevenueAtRisk,
      annualRevenueAtRisk: monthlyRevenueAtRisk * 12,
    };
  }, [values]);

  const handleShare = () => {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== '') params.set(key, value);
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    router.replace(`?${params.toString()}`, { scroll: false });
    navigator.clipboard?.writeText(url).then(() => setCopied(true));
  };

  const formatCurrency = (value) =>
    value.toLocaleString('he-IL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="grid gap-8 lg:grid-cols-2" dir="rtl">
      <div className="space-y-5">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="block text-sm font-semibold text-gray-900">
              {field.label}
            </label>
            <input
              id={field.key}
              type="number"
              min="0"
              inputMode="decimal"
              placeholder={field.placeholder}
              value={values[field.key]}
              onChange={handleChange(field.key)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">{field.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">הערכה</h2>

        {result ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-3xl font-semibold text-gray-950">
                {Math.round(result.zeroResultSearches).toLocaleString('he-IL')}
              </p>
              <p className="text-sm text-gray-600">חיפושים ללא תוצאות בחודש</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-gray-950">
                {formatCurrency(result.monthlyRevenueAtRisk)}
              </p>
              <p className="text-sm text-gray-600">הכנסה חודשית משוערת בסיכון</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-gray-950">
                {formatCurrency(result.annualRevenueAtRisk)}
              </p>
              <p className="text-sm text-gray-600">הכנסה שנתית משוערת בסיכון</p>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="mt-2 inline-flex items-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {copied ? 'הקישור הועתק' : 'העתקת קישור לשיתוף'}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            מלאו את כל ארבעת השדות כדי לראות הערכה.
          </p>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">איך זה מחושב</p>
          <p className="mt-2 text-xs leading-5 text-gray-600">
            חיפושים ללא תוצאות = חיפושים × שיעור חיפושים ללא תוצאות. הכנסה בסיכון = חיפושים ללא תוצאות
            × שיעור ההמרה מחיפוש × ערך הזמנה ממוצע. כל מספר מגיע מהנתונים שהזנתם למעלה — אין ממוצע תעשייה מובנה בחישוב.
          </p>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          לא יודעים את שיעור החיפושים ללא תוצאות?{' '}
          <Link href="/case-studies/wine-house" className="font-medium text-purple-700 hover:text-purple-800">
            לראות איך Wine House מדד את שלהם
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
