'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const searchQuery = {
  text: '"the old man and the sea"',
  hint: 'הקונה הקליד את שם הספר המדויק',
};

const matchedBook = {
  title: 'The Old Man and the Sea',
  author: 'Ernest Hemingway',
  price: '$17 hardcover',
  badge: 'התאמה מדויקת',
  cover: 'https://covers.openlibrary.org/b/id/8231996-L.jpg',
  meta: 'ספרות קלאסית · 128 עמודים',
  signal: 'התאמה מדויקת',
  segment: 'שורש ישות • קלאסיקת Hemingway • נושא ימי',
};

const relatedBooks = [
  {
    title: 'For Whom the Bell Tolls',
    description: 'אפוס מלחמתי בקצב ובקשת רגשית דומים.',
    price: '$21 hardcover',
    signal: 'הקשר: מעריצי Hemingway',
    cover: 'https://covers.openlibrary.org/b/id/8228691-L.jpg',
    meta: 'קוראים קונים לעיתים יחד',
    segment: 'אותו מחבר • קשת אומץ • כריכה קשה במחיר בינוני',
  },
  {
    title: 'The Sun Also Rises',
    description: 'מומלץ לקוראים שאהבו את ההתבוננות פנימה.',
    price: '$19 paperback',
    signal: 'התנהגות: נרכשים לעיתים יחד',
    cover: 'https://covers.openlibrary.org/b/id/8319256-L.jpg',
    meta: 'משתלב עם נסיעות + לייף סטייל',
    segment: 'טון משותף • פיקשן ספרותי • דרגת כריכה רכה',
  },
  {
    title: 'A Moveable Feast',
    description: 'בחירת זיכרונות למטיילים ספרותיים.',
    price: '$16 hardcover',
    signal: 'כוונה: מארז מוכן למתנה',
    cover: 'https://covers.openlibrary.org/b/id/8235116-L.jpg',
    meta: 'משלים את מארז המתנה',
    segment: 'זיכרונות המחבר • כוונת מתנה • כריכה קשה + אקססוריז',
  },
];

const timeline = [
  { label: 'כוונה: כותרת מדויקת', detail: '"the old man and the sea"' },
  { label: 'הקשר: קטלוג ספרותי', detail: 'גרף ישויות: קלאסיקות Hemingway' },
  { label: 'פעולה: המלצות קשורות בתוך התוצאות', detail: 'הצגת מוצרים שחולקים סגמנטים' },
];

const entitySignals = [
  'מחבר: Ernest Hemingway',
  'נושא: חוסן ובדידות',
  'רקע: קובה באמצע המאה',
  'טון: ספרותי, רפלקטיבי',
  'פורמט: כריכה קשה במחיר בינוני',
];

export default function BooksUpsellAnimation() {
  const results = [matchedBook, ...relatedBooks];
  const [activeResult, setActiveResult] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveResult((prev) => (prev + 1) % results.length);
      setActiveStep((prev) => (prev + 1) % timeline.length);
    }, 2600);

    return () => clearInterval(intervalId);
  }, [results.length]);

  return (
    <div className="w-full" dir="rtl">
      <div className="rounded-[28px] border border-gray-200 bg-white/80 backdrop-blur-lg p-6 shadow-xl shadow-gray-200/50">
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-xs uppercase tracking-[0.35em] text-gray-500">תוצאות חיפוש</p>
              </div>
              <span className="text-[11px] font-semibold text-gray-500">קטגוריית ספרים</span>
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{searchQuery.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{searchQuery.hint}</p>
                </div>
                <span className="text-[11px] uppercase tracking-[0.3em] text-gray-400">חי</span>
              </div>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-4 min-w-full">
                {results.map((book, index) => (
                  <motion.div
                    key={book.title}
                    className="w-48 flex-shrink-0 border rounded-2xl bg-white"
                    animate={{
                      borderColor: activeResult === index ? '#10B981' : '#E5E7EB',
                      opacity: activeResult === index ? 1 : 0.7,
                      y: activeResult === index ? 0 : 6,
                    }}
                    transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  >
                    <div className="relative">
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-full h-56 object-cover rounded-2xl rounded-b-none"
                        loading="lazy"
                      />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          התאמה מדויקת
                        </span>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{book.title}</p>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {book.description || book.author}
                      </p>
                      <p className="text-[11px] text-gray-400 uppercase tracking-[0.3em]">
                        {book.meta}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{book.price}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-gray-400">
                          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {book.signal}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
                        {book.segment}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500 mb-3">אותות ישות של Semantix</p>
            <div className="flex flex-wrap gap-2">
              {entitySignals.map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1"
                >
                  <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {signal}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">מה Semantix עושה</p>
            <div className="grid grid-cols-3 gap-3">
              {timeline.map((step, index) => (
                <motion.div
                  key={step.label}
                  className="border border-gray-200 rounded-xl p-3 bg-gray-50"
                  animate={{ opacity: activeStep === index ? 1 : 0.5, y: activeStep === index ? 0 : 4 }}
                  transition={{ duration: 0.4 }}
                >
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">{step.detail}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            className="bg-emerald-600 text-white rounded-2xl p-4"
            animate={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0.85, scale: 0.97 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">רשימת קריאה מוכנה</p>
                <p className="text-xs text-emerald-100">נמסרה לפני שלב העגלה</p>
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold">$57 סה״כ</p>
                <p className="text-xs text-emerald-100">+29% לערך ההזמנה</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
