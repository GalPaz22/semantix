'use client';

import { useEffect, useState } from 'react';

const NO_RESULTS_PRODUCTS = [
  { id: 'nr-1', name: 'Castello Reserve', price: '$32', imageSrc: '/wine1.png' },
  { id: 'nr-2', name: 'Rocca di Alba', price: '$41', imageSrc: '/wine2.png' },
  { id: 'nr-3', name: 'Villa Ponte', price: '$28', imageSrc: '/wine3.png' },
  { id: 'nr-4', name: 'Tenuta Nera', price: '$54', imageSrc: '/wine4.png' },
];

const RECOVERY_EXAMPLES = [
  {
    id: 'typo',
    eyebrow: 'דוגמה 01',
    title: 'טעות כתיב מחזירה ריק. Search Saver מחזיר.',
    body: 'כשהחיפוש של החנות נגמר בריק, Search Saver מחזיר מוצרים רלוונטיים באותו עמוד.',
    query: 'chianti clasico riserva',
    products: NO_RESULTS_PRODUCTS,
  },
  {
    id: 'natural-language',
    eyebrow: 'דוגמה 02',
    title: 'חיפוש בשפה חופשית מחזיר ריק. Search Saver מחזיר.',
    body: 'הלקוח מתאר מה הוא רוצה. אם המנוע לא מוצא — Search Saver מחזיר מהקטלוג.',
    query: 'red wine for steak under $40',
    products: [
      { id: 'nl-1', name: 'Primitivo Zin', price: '$38', imageSrc: '/wine1.png' },
      { id: 'nl-2', name: 'Malbec Reserve', price: '$31', imageSrc: '/wine4.png' },
      { id: 'nl-3', name: 'Syrah Hills', price: '$27', imageSrc: '/wine2.png' },
      { id: 'nl-4', name: 'Cabernet Estate', price: '$35', imageSrc: '/wine3.png' },
    ],
  },
];

function MiniCard({ product, fill = false }) {
  return (
    <div
      className={[
        'rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_8px_16px_rgba(15,23,42,0.04)]',
        fill ? 'h-full w-full' : '',
      ].join(' ')}
    >
      <div className="rounded-xl border border-gray-100 bg-[#f6f6f7] p-1.5">
        <div className="h-[64px] overflow-hidden rounded-[10px] bg-white sm:h-[72px]">
          <img
            src={product.imageSrc}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-1"
          />
        </div>
      </div>
      <p className="mt-2 truncate text-[10px] font-semibold text-gray-900">{product.name}</p>
      <p className="mt-1 text-[10px] font-semibold text-gray-800">{product.price}</p>
    </div>
  );
}

function RecoveryMiniDemo({ query, products }) {
  const [phase, setPhase] = useState('typing');
  const [typedLength, setTypedLength] = useState(0);
  const queryLength = query.length;

  useEffect(() => {
    let mounted = true;
    let typingId;
    let stepId;
    const timeoutIds = [];

    const run = () => {
      setPhase('typing');
      setTypedLength(0);
      const step = Math.max(Math.floor(1200 / queryLength), 45);
      typingId = window.setInterval(() => {
        setTypedLength((current) => {
          const next = current + 1;
          if (next >= queryLength) {
            window.clearInterval(typingId);
            return queryLength;
          }
          return next;
        });
      }, step);

      timeoutIds.push(window.setTimeout(() => mounted && setPhase('empty'), 1300));
      timeoutIds.push(window.setTimeout(() => mounted && setPhase('recovering'), 2550));
      timeoutIds.push(window.setTimeout(() => mounted && setPhase('results'), 3350));
    };

    run();
    stepId = window.setInterval(run, 5400);

    return () => {
      mounted = false;
      window.clearInterval(typingId);
      window.clearInterval(stepId);
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [queryLength]);

  const typedQuery = phase === 'typing' ? query.slice(0, typedLength) : query;

  return (
    <div className="rounded-[24px] border border-gray-200 bg-[#fbfbfc] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 truncate text-xs font-medium text-gray-700">
          <span className="truncate">{typedQuery}</span>
          {phase === 'typing' && <span className="inline-block h-4 w-px animate-pulse bg-purple-500" />}
        </div>
        <div className="rounded-xl border border-gray-200 bg-[#f8f8f9] px-2.5 py-1.5 text-[10px] font-medium text-gray-500">
          מיון: רלוונטיות
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[10px]">
        <span className="font-semibold text-gray-500">
          {phase === 'results' ? 'תוצאות שהוחזרו' : phase === 'typing' ? 'מחפש...' : 'בלי תוצאות'}
        </span>
        <span className="text-gray-400">
          {phase === 'results'
            ? 'בלי תוצאות — הוחזר'
            : phase === 'recovering'
              ? 'Search Saver הופעל'
              : 'החיפוש שלכם'}
        </span>
      </div>

      <div className="mt-4 min-h-[300px] sm:min-h-[328px]">
        {phase === 'typing' && (
          <div className="flex h-[276px] items-center justify-center rounded-[22px] border border-dashed border-gray-200 bg-white px-6 text-center">
            <div>
              <p className="text-sm font-semibold text-gray-800">מחפש בקטלוג...</p>
              <p className="mt-2 text-xs text-gray-500">הלקוח עדיין באותה שורת חיפוש.</p>
            </div>
          </div>
        )}

        {phase === 'empty' && (
          <div className="flex h-[276px] items-center justify-center rounded-[22px] border border-dashed border-gray-200 bg-white px-6 text-center">
            <div>
              <p className="text-sm font-semibold text-gray-800">לא נמצאו מוצרים</p>
              <p className="mt-2 text-xs text-gray-500">בלי Search Saver — כאן זה נגמר.</p>
            </div>
          </div>
        )}

        {phase === 'recovering' && (
          <div className="flex h-[276px] items-center justify-center rounded-[22px] border border-purple-200 bg-purple-50/50 px-6 text-center">
            <div>
              <p className="text-sm font-semibold text-purple-800">Search Saver הופעל</p>
              <p className="mt-2 text-xs text-gray-600">מחזיר מהקטלוג מוצרים שמתאימים לכוונה.</p>
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="h-full transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
                style={{ opacity: 1, transform: 'translateY(0)', transitionDelay: `${index * 65}ms` }}
              >
                <MiniCard product={product} fill />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeRow({ mode }) {
  return (
    <div className="grid gap-8 rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:p-8">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">{mode.eyebrow}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">{mode.title}</h3>
        <p className="mt-4 text-base leading-7 text-gray-600">{mode.body}</p>
      </div>
      <div className="overflow-hidden">
        <RecoveryMiniDemo query={mode.query} products={mode.products} />
      </div>
    </div>
  );
}

export default function SearchSaverModesShowcase({
  eyebrow = 'החזרת חיפושים בלי תוצאות',
  title = 'ל־Search Saver יש מטרה אחת: להחזיר חיפושים שלא מחזירים כלום.',
  intro = 'כשהחיפוש שלכם מחזיר ריק, Search Saver מחזיר מוצרים רלוונטיים באותו עמוד — בלי לערבב דירוג, בלי להזריק לתוצאות תקינות, ובלי לשנות את החנות.',
}) {
  return (
    <section dir="rtl" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">{eyebrow}</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">{title}</h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">{intro}</p>
        </div>

        <div className="mt-12 space-y-6">
          {RECOVERY_EXAMPLES.map((mode) => (
            <ModeRow key={mode.id} mode={mode} />
          ))}
        </div>
      </div>
    </section>
  );
}
