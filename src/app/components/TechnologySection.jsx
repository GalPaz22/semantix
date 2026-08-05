'use client';

// The technology, explained business-wise: hybrid search, personalization,
// and boosting — each concept paired with a small looping animation that
// shows the mechanic instead of claiming numbers. No fabricated stats.

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold,
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

function useTicker(stepCount, intervalMs, active) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setStep((s) => (s + 1) % stepCount), intervalMs);
    return () => clearInterval(id);
  }, [active, stepCount, intervalMs]);

  return step;
}

function DemoShell({ children, footer }) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_12px_40px_rgba(17,24,39,0.06)] ring-1 ring-black/[0.03]">
      {children}
      {footer ? (
        <div className="flex min-w-0 items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-1.5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function MiniSearchBar({ query, pulse = false }) {
  return (
    <div className="min-w-0 border-b border-gray-100 bg-gray-50/80 px-2 py-2 sm:px-3 sm:py-2.5">
      <div
        className={[
          'flex min-w-0 items-center gap-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm',
          pulse ? 'ring-2 ring-violet-200' : '',
        ].join(' ')}
      >
        <span className="shrink-0 pl-2 text-gray-400 sm:pl-2.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </span>
        <span
          className="min-w-0 flex-1 truncate px-1.5 py-2 text-[11px] leading-snug text-gray-900 sm:px-2 sm:text-xs"
          title={query}
        >
          {query}
        </span>
        <span className="m-0.5 shrink-0 rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white sm:px-2.5">
          <span className="sm:hidden">חפש</span>
          <span className="hidden sm:inline">חיפוש</span>
        </span>
      </div>
    </div>
  );
}

const VERTICAL_STYLES = {
  fashion: { bg: 'from-rose-50 to-orange-50', text: 'text-rose-700', label: 'אופנה' },
  electronics: { bg: 'from-slate-50 to-blue-50', text: 'text-blue-700', label: 'אלקטרוניקה' },
  beauty: { bg: 'from-fuchsia-50 to-purple-50', text: 'text-fuchsia-700', label: 'יופי' },
  home: { bg: 'from-amber-50 to-yellow-50', text: 'text-amber-800', label: 'בית' },
  sports: { bg: 'from-emerald-50 to-green-50', text: 'text-emerald-700', label: 'ספורט' },
  grocery: { bg: 'from-lime-50 to-green-50', text: 'text-lime-800', label: 'מכולת' },
};

function VerticalIcon({ vertical, className = 'h-7 w-7' }) {
  const iconClass = [className, VERTICAL_STYLES[vertical]?.text ?? 'text-gray-500'].join(' ');

  switch (vertical) {
    case 'fashion':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v1.5m6-1.5v1.5M4.5 9h15M6 9l1.5 10.5h9L18 9M8.25 9 9 4.5h6L15.75 9" />
        </svg>
      );
    case 'electronics':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 14v3a2 2 0 0 0 2 2h1M20 14v3a2 2 0 0 1-2 2h-1M4 14a8 8 0 0 1 16 0" />
        </svg>
      );
    case 'beauty':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v4a3 3 0 0 1-6 0V3Zm0 7h6v11H9V10Z" />
        </svg>
      );
    case 'home':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case 'sports':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
        </svg>
      );
    case 'grocery':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 10h12l-1.2 8H7.2L6 10Zm2-4h8l1 4H7l1-4Z" />
        </svg>
      );
    default:
      return null;
  }
}

function ProductThumbnail({ vertical, size = 'card' }) {
  const style = VERTICAL_STYLES[vertical] ?? VERTICAL_STYLES.home;
  const dimensions = size === 'row' ? 'h-full w-full' : 'h-full w-full';
  const iconSize = size === 'row' ? 'h-6 w-6' : 'h-7 w-7';

  return (
    <div
      className={[
        'flex items-center justify-center bg-gradient-to-b',
        style.bg,
        dimensions,
      ].join(' ')}
    >
      <VerticalIcon vertical={vertical} className={iconSize} />
    </div>
  );
}

function ProductImage({ src, alt = '' }) {
  return (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover object-center"
      loading="lazy"
    />
  );
}

function MiniProductCard({ product, compact = false }) {
  return (
    <article
      className={[
        'flex flex-col overflow-hidden rounded-lg border bg-white transition-all duration-300',
        product.topMatch
          ? 'border-violet-300 shadow-[0_0_0_1px_rgba(124,58,237,0.12),0_4px_12px_rgba(124,58,237,0.08)]'
          : 'border-gray-200 shadow-sm',
        product.muted ? 'opacity-45' : 'opacity-100',
        product.featured ? 'border-amber-300 bg-amber-50/30' : '',
      ].join(' ')}
    >
      <div className="relative h-[72px] shrink-0 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        {product.topMatch ? (
          <span className="absolute left-1 top-1 z-10 rounded-full bg-violet-600 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-white">
            התאמה מובילה
          </span>
        ) : null}
        {product.featured ? (
          <span className="absolute left-1 top-1 z-10 rounded-full bg-amber-500 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-white">
            מומלץ
          </span>
        ) : null}
        {product.personalized ? (
          <span className="absolute left-1 top-1 z-10 rounded-full bg-violet-600 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-white">
            בשבילך
          </span>
        ) : null}
        {product.miss ? (
          <span className="absolute left-1 top-1 z-10 rounded-full bg-amber-500 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-white">
            התאמה חלשה
          </span>
        ) : null}
        {product.image ? (
          <ProductImage src={product.image} alt={product.name} />
        ) : product.vertical ? (
          <ProductThumbnail vertical={product.vertical} />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-1.5">
        {product.vertical ? (
          <p className="text-[7px] font-semibold uppercase tracking-wide text-gray-400">
            {VERTICAL_STYLES[product.vertical]?.label}
          </p>
        ) : null}
        <h4 className="line-clamp-2 text-[10px] font-semibold leading-snug text-gray-900">{product.name}</h4>
        {product.subtitle ? (
          <p className="mt-0.5 line-clamp-1 text-[8px] text-gray-500">{product.subtitle}</p>
        ) : null}
        <div className="mt-auto flex items-baseline gap-1 pt-1">
          <span className="text-[11px] font-semibold text-gray-900">{product.price}</span>
          {product.compareAt ? (
            <span className="text-[8px] text-gray-400 line-through">{product.compareAt}</span>
          ) : null}
        </div>
        {!compact ? (
          <button
            type="button"
            className="mt-1.5 w-full rounded-md border border-gray-900 bg-gray-900 py-1 text-[8px] font-semibold text-white"
          >
            הוסף לסל
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ResultsHeader({ count, query }) {
  return (
    <div className="min-w-0 border-b border-gray-100 px-3 py-2">
      <p className="text-[11px] font-semibold text-gray-900">תוצאות חיפוש</p>
      <p className="mt-0.5 truncate font-mono text-[9px] text-gray-500" title={`${count} עבור "${query}"`}>
        {count} עבור &ldquo;{query}&rdquo;
      </p>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="h-[72px] animate-pulse bg-gray-100" />
      <div className="space-y-1.5 p-2">
        <div className="h-2 w-3/4 animate-pulse rounded bg-gray-100" />
        <div className="h-2 w-1/2 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}

/* --- 1. Hybrid search: fashion / outdoor apparel --- */

const HYBRID_QUERY = 'מעיל טיולים עמיד למים לנשים מידה M עד $120';

const HYBRID_RESULTS = [
  {
    id: 'hf1',
    name: 'TrailShell Rain Jacket',
    subtitle: 'Waterproof · hiking · M',
    price: '$109',
    compareAt: '$129',
    vertical: 'fashion',
    image: '/demo-products/tech-demo-trailshell-jacket.png',
    topMatch: true,
  },
  {
    id: 'hf2',
    name: 'Alpine Packable Shell',
    subtitle: 'Breathable · 2.5L layer',
    price: '$98',
    compareAt: '$115',
    vertical: 'sports',
    image: '/demo-products/tech-demo-alpine-shell.png',
  },
  {
    id: 'hf3',
    name: 'Summit Hike Jacket',
    subtitle: "Women's medium · under $120",
    price: '$112',
    compareAt: '$135',
    vertical: 'sports',
    image: '/demo-products/tech-demo-summit-jacket.png',
  },
];

function HybridSearchDemo() {
  const [ref, inView] = useInView(0.25);
  const step = useTicker(2, 3200, inView);
  const searching = step === 0;

  return (
    <div ref={ref} className="min-w-0 max-w-full">
      <DemoShell
        footer={
          <>
            <span className="text-[9px] text-gray-400">ביגוד לחוץ</span>
            <span className="flex items-center gap-1 text-[9px] font-medium text-violet-700">
              <span className="inline-block h-1 w-1 rounded-full bg-violet-500" />
              חיפוש היברידי
            </span>
          </>
        }
      >
        <MiniSearchBar query={HYBRID_QUERY} pulse={searching} />
        <ResultsHeader count="24 מוצרים" query={HYBRID_QUERY} />

        <div className="min-h-[210px] px-3 pb-3">
          <AnimatePresence mode="wait">
            {searching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {[0, 1, 2].map((i) => (
                  <ProductSkeleton key={i} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {HYBRID_RESULTS.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07, duration: 0.25 }}
                  >
                    <MiniProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DemoShell>
    </div>
  );
}

/* --- 2. Personalization: electronics storefront --- */

const SHOPPER_A_RESULTS = [
  {
    id: 'pa1',
    name: 'Pulse Gaming Headset',
    subtitle: '7.1 surround · RGB',
    price: '$129',
    compareAt: '$159',
    vertical: 'electronics',
    image: '/demo-products/tech-demo-gaming-headset.png',
    personalized: true,
  },
  {
    id: 'pa2',
    name: 'AirFit Earbuds Pro',
    subtitle: 'Noise cancelling',
    price: '$89',
    vertical: 'electronics',
    image: '/demo-products/tech-demo-earbuds.png',
    muted: true,
  },
  {
    id: 'pa3',
    name: 'Studio Monitor HP',
    subtitle: 'Flat response',
    price: '$74',
    vertical: 'electronics',
    image: '/demo-products/tech-demo-studio-headphones.png',
    muted: true,
  },
];

const SHOPPER_B_RESULTS = [
  {
    id: 'pb1',
    name: 'AirFit Earbuds Pro',
    subtitle: 'Commute & workouts',
    price: '$89',
    compareAt: '$109',
    vertical: 'electronics',
    image: '/demo-products/tech-demo-earbuds.png',
    personalized: true,
  },
  {
    id: 'pb2',
    name: 'Pulse Gaming Headset',
    subtitle: '7.1 surround',
    price: '$129',
    vertical: 'electronics',
    image: '/demo-products/tech-demo-gaming-headset.png',
    muted: true,
  },
  {
    id: 'pb3',
    name: 'OpenRun Sport Buds',
    subtitle: 'Bone conduction',
    price: '$119',
    vertical: 'sports',
    image: '/demo-products/tech-demo-sport-buds.png',
    muted: true,
  },
];

const SHOPPERS = [
  { id: 'a', label: 'קונה א', signal: 'קונה ציוד גיימינג', results: SHOPPER_A_RESULTS },
  { id: 'b', label: 'קונה ב', signal: 'רץ ונוסע לעבודה כל יום', results: SHOPPER_B_RESULTS },
];

function PersonalizationDemo() {
  const [ref, inView] = useInView();
  const step = useTicker(2, 2400, inView);
  const activeShopper = SHOPPERS[step];

  return (
    <div ref={ref} className="min-w-0 max-w-full">
      <DemoShell
        footer={
          <>
            <span className="text-[9px] text-gray-400">חנות אלקטרוניקה · אותה שאילתה</span>
            <span className="text-[9px] font-medium text-violet-700">דירוג מותאם אישית</span>
          </>
        }
      >
        <MiniSearchBar query="אוזניות אלחוטיות" />
        <ResultsHeader count="126 מוצרים" query="אוזניות אלחוטיות" />

        <div className="grid grid-cols-2 gap-2 px-3 py-2">
          {SHOPPERS.map((shopper, index) => (
            <motion.button
              key={shopper.id}
              type="button"
              animate={{
                opacity: step === index ? 1 : 0.45,
                scale: step === index ? 1 : 0.98,
              }}
              className={[
                'rounded-lg border p-2 text-left transition-colors duration-300',
                step === index
                  ? 'border-violet-300 bg-violet-50/80'
                  : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white',
                    step === index ? 'bg-violet-600' : 'bg-gray-300',
                  ].join(' ')}
                >
                  {shopper.id.toUpperCase()}
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-gray-900">{shopper.label}</p>
                  <p className="text-[8px] text-gray-500">{shopper.signal}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="min-h-[220px] px-3 pb-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeShopper.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {activeShopper.results.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.3 }}
                >
                  <MiniProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </DemoShell>
    </div>
  );
}

/* --- 3. Boosting: home & decor merchandising --- */

const BOOST_CATALOG = [
  {
    id: 'boost-a',
    name: 'Linen Throw Pillow Set',
    subtitle: 'Neutral · set of 2',
    price: '$48',
    vertical: 'home',
    image: '/demo-products/tech-demo-throw-pillows.png',
  },
  {
    id: 'boost-b',
    name: 'Ceramic Table Lamp',
    subtitle: 'Matte white · dimmable',
    price: '$72',
    compareAt: '$89',
    vertical: 'home',
    image: '/demo-products/tech-demo-table-lamp.png',
  },
  {
    id: 'boost-c',
    name: 'Holiday Decor Bundle',
    subtitle: 'Seasonal centerpiece kit',
    price: '$94',
    compareAt: '$118',
    vertical: 'home',
    image: '/demo-products/tech-demo-holiday-decor.png',
    featured: false,
    boostable: true,
  },
];

function BoostingDemo() {
  const [ref, inView] = useInView();
  const step = useTicker(2, 2600, inView);
  const boosted = step === 1;

  const rows = boosted
    ? [
        { ...BOOST_CATALOG[2], featured: true },
        BOOST_CATALOG[0],
        BOOST_CATALOG[1],
      ]
    : BOOST_CATALOG;

  return (
    <div ref={ref} className="min-w-0 max-w-full">
      <DemoShell
        footer={
          <>
            <span className="text-[9px] text-gray-400">חנות בית ועיצוב</span>
            <motion.span
              animate={{ opacity: boosted ? 1 : 0.5 }}
              className={[
                'text-[9px] font-medium',
                boosted ? 'text-amber-700' : 'text-gray-500',
              ].join(' ')}
            >
              {boosted ? 'בוסט מרצ׳נדייזר פעיל' : 'סדר קטלוג רגיל'}
            </motion.span>
          </>
        }
      >
        <div className="flex flex-col gap-2 border-b border-gray-100 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-900">חיוניים לסלון</p>
            <p className="mt-0.5 text-[9px] text-gray-500">מיון: הנמכרים ביותר</p>
          </div>
          <motion.div
            animate={{
              borderColor: boosted ? 'rgb(251 191 36)' : 'rgb(229 231 235)',
              backgroundColor: boosted ? 'rgb(255 251 235)' : 'rgb(249 250 251)',
            }}
            className="min-w-0 rounded-lg border px-2 py-1.5"
          >
            <p className="text-[8px] font-semibold uppercase tracking-wide text-gray-500">לוח בקרה</p>
            <p className="mt-0.5 truncate text-[9px] font-medium text-gray-800">
              {boosted ? '✓ Holiday Decor Bundle מוצמד' : 'הצמדת מוצר למקום #1…'}
            </p>
          </motion.div>
        </div>

        <LayoutGroup>
          <div className="space-y-2 p-3">
            {rows.map((item, index) => (
              <motion.article
                key={item.id}
                layout
                transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                className={[
                  'flex items-center gap-2 rounded-lg border p-2 sm:gap-3 sm:p-2.5',
                  item.featured
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-gray-200 bg-white',
                ].join(' ')}
              >
                <span className="w-4 shrink-0 text-center text-[10px] font-semibold text-gray-400">
                  {index + 1}
                </span>
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-white sm:h-14 sm:w-14">
                  {item.featured ? (
                    <span className="absolute left-0.5 top-0.5 z-10 rounded bg-amber-500 px-1 py-px text-[6px] font-bold uppercase text-white">
                      מומלץ
                    </span>
                  ) : null}
                  <ProductImage src={item.image} alt={item.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-gray-900">{item.name}</p>
                  <p className="truncate text-[9px] text-gray-500">{item.subtitle}</p>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-[11px] font-semibold text-gray-900">{item.price}</span>
                    {item.compareAt ? (
                      <span className="text-[8px] text-gray-400 line-through">{item.compareAt}</span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className={[
                    'shrink-0 rounded-md px-1.5 py-1 text-[8px] font-semibold sm:px-2',
                    item.featured
                      ? 'bg-amber-500 text-white'
                      : 'border border-gray-900 bg-gray-900 text-white',
                  ].join(' ')}
                >
                  <span className="sm:hidden">הוסף</span>
                  <span className="hidden sm:inline">הוסף לסל</span>
                </button>
              </motion.article>
            ))}
          </div>
        </LayoutGroup>
      </DemoShell>
    </div>
  );
}

/* --- Section --- */

const PILLARS = [
  {
    eyebrow: 'חיפוש היברידי',
    title: 'דיוק של מילות מפתח. הבנה סמנטית. תוצאה אחת.',
    description:
      'כל שאילתה עוברת בשתי השכבות במקביל — התאמת מילות מפתח מדויקת ל־SKU ולשמות מוצרים, והבנה סמנטית לבקשות מעורפלות, מורכבות או רב־לשוניות. קונים יכולים לחפש כמו שהם חושבים, ועדיין להגיע למוצר הנכון.',
    Demo: HybridSearchDemo,
  },
  {
    eyebrow: 'פרסונליזציה',
    title: 'אותו חיפוש משמעותו שונה לכל קונה.',
    description:
      'קליקים, הוספות לסל והיסטוריית רכישות מעצבים את הדירוג של כל קונה בזמן אמת, תוך כדי הסשן. שני אנשים יכולים להקליד את אותה מילה וכל אחד יראה את המוצר הכי מתאים לו ראשון — בלי כללים ידניים לתחזק.',
    Demo: PersonalizationDemo,
  },
  {
    eyebrow: 'בוסטינג',
    title: 'כשמוצרים מסוימים צריכים לנצח — אתם מחליטים.',
    description:
      'מרצ׳נדייזרים מגדירים עדיפות לכל מוצר בקטלוג — דחיפות עונתיות, פריטים עם מרווח גבוה, עודפי מלאי — והתוצאות מדורגות מחדש מיד. בלי קוד, בלי פנייה לתמיכה, שליטה מלאה מלוח הבקרה.',
    Demo: BoostingDemo,
  },
];

export default function TechnologySection() {
  return (
    <section dir="rtl" className="border-t border-gray-200 bg-white py-16 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex items-center gap-3 sm:gap-5">
          <p className="min-w-0 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            הטכנולוגיה
          </p>
          <div className="h-px min-w-[2rem] flex-1 bg-gray-200" />
        </div>
        <div className="mt-8 max-w-3xl">
          <h2 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-black sm:text-5xl">
            מנוע אחד. שלוש שכבות של שיקול דעת.
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            חיפוש היברידי מביא כל שאילתה למוצרים הנכונים. פרסונליזציה ובוסטינג
            מחליטים בדיוק איזה מוצר כל קונה רואה ראשון.
          </p>
        </div>

        <div className="mt-12 space-y-14 sm:mt-20 sm:space-y-24">
          {PILLARS.map((pillar, index) => (
            <div
              key={pillar.eyebrow}
              className="grid min-w-0 items-center gap-8 lg:grid-cols-2 lg:gap-16"
            >
              <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-purple-700">
                  {pillar.eyebrow}
                </p>
                <h3 className="mt-4 text-2xl font-semibold leading-snug tracking-[-0.02em] text-gray-900 sm:text-3xl">
                  {pillar.title}
                </h3>
                <p className="mt-4 text-lg leading-8 text-gray-600">{pillar.description}</p>
              </div>
              <div className={`min-w-0 max-w-full ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <pillar.Demo />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
