// Ambient background visual for the hero: rows of real-looking complex
// queries drifting, each tagged with the product image and recovered cart value.

import { Search } from 'lucide-react';

const ROWS = [
  {
    duration: '32s',
    delay: '0s',
    track: 1,
    items: [
      { query: 'יין אדום קליל לשתות עם חברים', value: 45, image: '/demo-products/hero-demo-wine.png' },
      { query: 'מתנה למי שאוהב יין איטלקי', value: 210, image: '/demo-products/hero-demo-gift-wine.png' },
      { query: 'מעיל עמיד למים מידה L, עד 100$', value: 89, image: '/demo-products/tech-demo-windbreaker.png' },
      { query: 'אוזניות מבטלות רעש עד 150$', value: 145, image: '/demo-products/tech-demo-earbuds.png' },
    ],
  },
  {
    duration: '40s',
    delay: '-8s',
    track: 2,
    items: [
      { query: 'שמלה לחתונה בקיץ, צנועה', value: 168, image: '/demo-products/hero-demo-dress.png' },
      { query: 'מעיל צמר לחורף', value: 120, image: '/demo-products/tech-demo-wool-coat.png' },
      { query: 'נעלי ריצה לכפות רגליים שטוחות', value: 134, image: '/demo-products/hero-demo-shoes.png' },
      { query: 'קרם לחות לעור יבש ורגיש', value: 41, image: '/demo-products/hero-demo-skincare.png' },
    ],
  },
  {
    duration: '36s',
    delay: '-16s',
    track: 1,
    items: [
      { query: 'יין אדום יבש מצרפת, לא כבד מדי', value: 58, image: '/demo-products/hero-demo-wine.png' },
      { query: 'רוזה מבעבע למסיבה קטנה', value: 102, image: '/demo-products/hero-demo-sparkling.png' },
      { query: 'מעיל חורף', value: 76, image: '/demo-products/tech-demo-trailshell-jacket.png' },
      { query: 'מתנה למי שאוהב יין איטלקי', value: 210, image: '/demo-products/hero-demo-gift-wine.png' },
    ],
  },
];

function QueryCard({ query, value, image }) {
  return (
    <div className="inline-flex w-[200px] shrink-0 overflow-hidden rounded-2xl border border-gray-200/90 bg-white/95 shadow-[0_2px_14px_rgba(17,24,39,0.07)] backdrop-blur-sm sm:w-[300px]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-2.5 py-2 sm:gap-2.5 sm:px-3.5 sm:py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 sm:h-8 sm:w-8">
            <Search className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <p className="min-w-0 flex-1 truncate text-xs text-gray-700 sm:text-sm" dir="rtl">
            &ldquo;{query}&rdquo;
          </p>
        </div>

        <div className="relative h-[96px] w-full overflow-hidden border-t border-gray-100 bg-gradient-to-b from-gray-50 to-white sm:h-[160px]">
          <img
            src={image}
            alt=""
            className="absolute inset-0 m-auto max-h-[94%] max-w-[94%] object-contain object-center"
            loading="lazy"
          />
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-green-100/95 px-2.5 py-1 text-xs font-semibold leading-none text-green-700 shadow-sm backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-4 sm:py-2 sm:text-base">
            +${value}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FloatingQueryStream() {
  return (
    // Force LTR so the duplicated-track marquee loops seamlessly on an RTL page.
    <div
      dir="ltr"
      className="relative mx-auto h-[280px] w-full max-w-xl overflow-hidden sm:h-[480px] lg:h-[540px] [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent),linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] [mask-composite:intersect] motion-reduce:[mask-image:none]"
    >
      <div className="absolute inset-0 flex flex-col justify-center gap-3 py-3 sm:gap-8 sm:py-4">
        {ROWS.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={`hero-scroll-track flex items-center gap-3 whitespace-nowrap sm:gap-6 ${
              row.track === 2 ? 'hero-scroll-track-alt' : ''
            } ${rowIndex === 2 ? 'hidden sm:flex' : ''}`}
            style={{
              animationDuration: row.duration,
              animationDelay: row.delay,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }}
          >
            {row.items.concat(row.items).map((item, i) => (
              <QueryCard key={i} query={item.query} value={item.value} image={item.image} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
