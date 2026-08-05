'use client';

import { useEffect, useMemo, useState } from 'react';

const FAIL_HOLD_MS = 2800;
const MATCHING_HOLD_MS = 1500;
const RECOVER_HOLD_MS = 4500;

const MATCHING_COPY = {
  title: 'מחזיר חיפוש בלי תוצאות…',
  sub: 'מתאים את הקטלוג למה שהלקוח התכוון',
};

const STEAK_WINE_PRODUCTS = [
  { id: 'steak-1', name: 'Primitivo di Puglia Zin', subtitle: 'Pasqua · bold red for grilled meat', price: '$38', compareAt: '$46', imageSrc: '/wine1.png' },
  { id: 'steak-2', name: 'Salento Primitivo Ti Amo', subtitle: 'Kosher · medium body', price: '$29', compareAt: '$36', imageSrc: '/wine2.png' },
  { id: 'steak-3', name: 'Barolo Classico Riserva', subtitle: 'Piedmont · structured tannin', price: '$34', compareAt: '$42', imageSrc: '/wine3.png' },
  { id: 'steak-4', name: 'Malbec Reserve Mendoza', subtitle: 'Grill-friendly · under $40', price: '$31', compareAt: '$39', imageSrc: '/wine4.png' },
  { id: 'steak-5', name: 'Syrah Hills Estate', subtitle: 'Peppery finish · steak pairing', price: '$27', compareAt: '$33', imageSrc: '/wine2.png' },
  { id: 'steak-6', name: 'Cabernet Sauvignon', subtitle: 'Classic steakhouse red', price: '$35', compareAt: '$44', imageSrc: '/wine1.png' },
];

const JACKET_PRODUCTS = [
  { id: 'jacket-1', name: "Winter Jacket — Men's", subtitle: 'Insulated · weather ready', price: '$128', compareAt: '$160', imageSrc: '/wine1.png', topMatch: true },
  { id: 'jacket-2', name: 'Alpine Parka', subtitle: 'Water-resistant shell', price: '$149', compareAt: '$185', imageSrc: '/wine2.png' },
  { id: 'jacket-3', name: 'City Down Coat', subtitle: 'Lightweight warmth', price: '$112', compareAt: '$140', imageSrc: '/wine3.png' },
  { id: 'jacket-4', name: 'Trail Softshell', subtitle: 'Everyday outdoor', price: '$98', compareAt: '$120', imageSrc: '/wine4.png' },
];

const CHIANTI_PRODUCTS = [
  { id: 'chianti-1', name: 'Chianti Classico Riserva', subtitle: 'Tuscany · aged reserve', price: '$42', compareAt: '$54', imageSrc: '/wine2.png', topMatch: true },
  { id: 'chianti-2', name: 'Castello Chianti DOCG', subtitle: 'Structured Sangiovese', price: '$36', compareAt: '$45', imageSrc: '/wine1.png' },
  { id: 'chianti-3', name: 'Rocca di Chianti', subtitle: 'Estate bottled', price: '$39', compareAt: '$48', imageSrc: '/wine3.png' },
  { id: 'chianti-4', name: 'Villa Chianti Riserva', subtitle: 'Gift-ready bottle', price: '$47', compareAt: '$58', imageSrc: '/wine4.png' },
];

/** Search Saver recovers only dead-end / zero-result searches. */
const SCENARIOS = [
  {
    id: 'no-results-intent',
    query: 'red wine for steak under $40',
    failCount: '0 מוצרים',
    recoverCount: '6 מוצרים',
    recoverProducts: STEAK_WINE_PRODUCTS,
  },
  {
    id: 'no-results-typo',
    query: 'wineter jacket',
    failCount: '0 מוצרים',
    recoverCount: '4 מוצרים',
    recoverProducts: JACKET_PRODUCTS,
  },
  {
    id: 'no-results-exact',
    query: 'chianti classico riserva',
    failCount: '0 מוצרים',
    recoverCount: '4 מוצרים',
    recoverProducts: CHIANTI_PRODUCTS,
  },
];

const SIDEBAR_FILTERS = [
  { group: 'קטגוריה', items: ['יין אדום', 'יין לבן', 'מארזי מתנה'] },
  { group: 'מחיר', items: ['עד ₪150', '₪150 – ₪300', '₪300+'] },
  { group: 'אירוע', items: ['לצמד עם סטייק', 'מתנה', 'יומיומי'] },
];

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

function StoreProductCard({ product, compact = false }) {
  const imageHeight = compact ? 'h-[76px]' : 'h-[108px] sm:h-[120px]';

  return (
    <article
      className={[
        'group flex flex-col overflow-hidden rounded-lg border bg-white transition-shadow duration-300',
        product.topMatch
          ? 'border-violet-300 shadow-[0_0_0_1px_rgba(124,58,237,0.15),0_4px_16px_rgba(124,58,237,0.08)]'
          : 'border-gray-200 shadow-sm',
      ].join(' ')}
    >
      <div
        className={[
          'relative w-full shrink-0 overflow-hidden bg-gradient-to-b from-gray-50 to-white',
          imageHeight,
        ].join(' ')}
      >
        {product.topMatch ? (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-violet-600 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white">
            הכי רלוונטי
          </span>
        ) : null}
        {product.compareAt ? (
          <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-gray-900 px-1.5 py-0.5 text-[8px] font-medium text-white">
            מבצע
          </span>
        ) : null}
        <img
          src={product.imageSrc}
          alt=""
          className="absolute inset-0 m-auto max-h-[88%] max-w-[88%] object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          loading="eager"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = product.imageSrc.endsWith('.svg') ? '/wine1.png' : '/whisky-bottle.svg';
          }}
        />
      </div>

      <div className={['flex flex-col text-left', compact ? 'px-2 pb-2 pt-1.5' : 'px-2.5 pb-2.5 pt-2'].join(' ')}>
        {!compact ? (
          <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">יין ומשקאות</p>
        ) : null}
        <h3
          className={[
            'line-clamp-2 font-semibold leading-snug text-gray-900',
            compact ? 'text-[10px]' : 'mt-0.5 text-[11px] sm:text-[12px]',
          ].join(' ')}
        >
          {product.name}
        </h3>
        {!compact ? (
          <p className="mt-0.5 line-clamp-1 text-[9px] text-gray-500 sm:text-[10px]">{product.subtitle}</p>
        ) : null}

        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={['font-semibold text-gray-900', compact ? 'text-[11px]' : 'text-[13px]'].join(' ')}>
            {product.price}
          </span>
          {product.compareAt ? (
            <span className="text-[9px] text-gray-400 line-through">{product.compareAt}</span>
          ) : null}
        </div>

        <button
          type="button"
          className={[
            'mt-1.5 w-full rounded-md border border-gray-900 bg-gray-900 font-semibold text-white',
            compact ? 'py-1 text-[9px]' : 'py-1.5 text-[10px]',
          ].join(' ')}
        >
          הוספה לעגלה
        </button>
      </div>
    </article>
  );
}

function IntentMatchingOverlay({ compact = false, visible = false }) {
  return (
    <div
      className={[
        'absolute inset-0 z-20 flex items-center justify-center rounded-lg transition-opacity duration-300',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <div className="absolute inset-0 bg-white/72 backdrop-blur-[2px]" />
      <div
        className={[
          'relative mx-3 flex flex-col items-center rounded-xl border border-violet-200/80 bg-white/95 px-4 py-3 text-center shadow-[0_8px_32px_rgba(124,58,237,0.12)]',
          compact ? 'max-w-[200px]' : 'max-w-[240px]',
        ].join(' ')}
      >
        <div className="mb-2 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" />
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-600">
            Search Saver
          </span>
        </div>
        <p className={['font-semibold text-gray-900', compact ? 'text-[11px]' : 'text-xs'].join(' ')}>
          {MATCHING_COPY.title}
        </p>
        <p className="mt-1 text-[9px] leading-snug text-gray-500 sm:text-[10px]">{MATCHING_COPY.sub}</p>
      </div>
    </div>
  );
}

function NoResultsPanel({ query, compact = false }) {
  return (
    <div
      className={[
        'flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 text-center',
        compact ? 'px-4 py-8' : 'px-6 py-10',
      ].join(' ')}
    >
      <div
        className={[
          'mb-3 flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200',
          compact ? 'h-10 w-10' : 'h-12 w-12',
        ].join(' ')}
      >
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>
      <p className={['font-semibold text-gray-900', compact ? 'text-xs' : 'text-sm'].join(' ')}>לא נמצאו מוצרים</p>
      <p className="mt-1.5 max-w-xs text-[10px] leading-relaxed text-gray-500 sm:text-xs">
        החיפוש שלכם עבור &ldquo;{query}&rdquo; לא התאים לאף מוצר.
      </p>
    </div>
  );
}

function StorefrontSearchDemo({ className = '', compact = false }) {
  const reducedMotion = useReducedMotion();
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [phase, setPhase] = useState('failed'); // failed | matching | recovered

  const scenario = SCENARIOS[scenarioIndex];
  const recovered = phase === 'recovered';
  const matching = phase === 'matching';
  const products = compact ? scenario.recoverProducts.slice(0, 4) : scenario.recoverProducts;
  const resultCount = recovered ? scenario.recoverCount : scenario.failCount;
  const showEmpty = phase === 'failed';
  const resultsHeight = compact ? 248 : 320;
  const shellMinHeight = compact ? 460 : 580;

  useEffect(() => {
    let timeouts = [];
    let active = true;

    const run = (index) => {
      if (!active) return;
      setScenarioIndex(index);
      const cycleMs = FAIL_HOLD_MS + MATCHING_HOLD_MS + RECOVER_HOLD_MS;

      if (reducedMotion) {
        setPhase('recovered');
        timeouts.push(window.setTimeout(() => run((index + 1) % SCENARIOS.length), cycleMs));
        return;
      }

      setPhase('failed');
      timeouts.push(window.setTimeout(() => setPhase('matching'), FAIL_HOLD_MS));
      timeouts.push(window.setTimeout(() => setPhase('recovered'), FAIL_HOLD_MS + MATCHING_HOLD_MS));
      timeouts.push(window.setTimeout(() => run((index + 1) % SCENARIOS.length), cycleMs));
    };

    run(0);

    return () => {
      active = false;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [reducedMotion]);

  return (
    <div
      dir="rtl"
      className={[
        'w-full shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_12px_40px_rgba(17,24,39,0.07)] ring-1 ring-black/[0.03]',
        compact ? 'max-w-[560px] text-[13px]' : 'max-w-[820px]',
        className,
      ].join(' ')}
      style={{ minHeight: shellMinHeight }}
    >
      {!compact ? (
        <div className="bg-gray-900 px-3 py-1 text-center text-[10px] font-medium tracking-wide text-white">
          משלוח חינם בהזמנות מעל ₪250
        </div>
      ) : null}

      <div className={['border-b border-gray-100 bg-gray-50/80', compact ? 'px-3 py-2' : 'px-4 py-2.5 sm:px-5'].join(' ')}>
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <span className="pl-2.5 text-gray-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            readOnly
            value={scenario.query}
            className={[
              'min-w-0 flex-1 truncate bg-transparent text-gray-900 outline-none',
              compact ? 'px-2 py-2 text-xs' : 'px-2.5 py-2 text-sm',
            ].join(' ')}
            aria-label="חיפוש"
          />
          <button
            type="button"
            className={[
              'm-0.5 rounded-md bg-gray-900 font-semibold text-white',
              compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]',
            ].join(' ')}
          >
            חיפוש
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400">
          <span className="text-violet-600">בית</span>
          <span className="mx-1 text-gray-300">/</span>
          תוצאות חיפוש
        </p>
      </div>

      <div className="flex" style={{ minHeight: compact ? 300 : 360 }}>
        <aside
          className={[
            'hidden shrink-0 border-r border-gray-100 bg-white sm:block',
            compact ? 'w-[108px] p-2.5' : 'w-[132px] p-3 lg:w-[148px]',
          ].join(' ')}
        >
          {SIDEBAR_FILTERS.map((section) => (
            <div key={section.group} className={compact ? 'mb-2.5' : 'mb-3'}>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">{section.group}</p>
              <ul className="mt-1 space-y-1">
                {section.items.map((item) => (
                  <li key={item}>
                    <span className="flex items-center gap-1.5 text-[9px] text-gray-500">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm border border-gray-300 bg-white" />
                      <span className="truncate">{item}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <div className={['flex min-w-0 flex-1 flex-col', compact ? 'p-2.5' : 'p-3 sm:p-3.5'].join(' ')}>
          <div className="flex flex-wrap items-end justify-between gap-1.5 border-b border-gray-100 pb-2">
            <div>
              <h2 className={['font-semibold tracking-tight text-gray-900', compact ? 'text-xs' : 'text-sm'].join(' ')}>
                תוצאות חיפוש
              </h2>
              <p className="mt-0.5 font-mono text-[9px] text-gray-500 sm:text-[10px]">
                {resultCount} עבור &ldquo;{scenario.query}&rdquo;
              </p>
            </div>
          </div>

          <div className="relative mt-2" style={{ height: resultsHeight }}>
            <div
              className={[
                'absolute inset-0 transition-opacity duration-500',
                showEmpty ? 'opacity-100' : 'pointer-events-none opacity-0',
              ].join(' ')}
            >
              <NoResultsPanel query={scenario.query} compact={compact} />
            </div>
            <div
              className={[
                'absolute inset-0 transition-opacity duration-500',
                showEmpty ? 'pointer-events-none opacity-0' : 'opacity-100',
              ].join(' ')}
            >
              <div
                className={[
                  'grid auto-rows-min gap-2',
                  compact ? 'grid-cols-2' : 'grid-cols-2 gap-2.5 sm:grid-cols-3',
                ].join(' ')}
              >
                {products.map((product) => (
                  <StoreProductCard key={product.id} product={product} compact={compact} />
                ))}
              </div>
            </div>
            <IntentMatchingOverlay compact={compact} visible={matching} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 bg-violet-50/40 px-3 py-1.5">
        <span className="text-[9px] text-gray-400">חנות לדוגמה</span>
        <span className="flex items-center gap-1 text-[9px] font-medium text-violet-700">
          <span className="inline-block h-1 w-1 rounded-full bg-violet-500" />
          החזרת חיפושים בלי תוצאות פעילה
        </span>
      </div>
    </div>
  );
}

export default function SearchSaverAgentDemo({ variant = 'home', className = '' }) {
  const compact = useMemo(() => variant === 'home', [variant]);
  return <StorefrontSearchDemo className={className} compact={compact} />;
}
