import Link from 'next/link';
import { PRODUCTS } from '../../lib/marketing-copy';

export default function SemantixProductHierarchy() {
  return (
    <section id="products" className="border-t border-gray-200 bg-white py-24 sm:py-32" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex items-center gap-3 sm:gap-5">
          <p className="min-w-0 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            איך אנחנו מתקנים את זה
          </p>
          <div className="h-px min-w-[2rem] flex-1 bg-gray-200" />
        </div>
        <div className="mt-8 max-w-3xl">
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-black sm:text-5xl">
            מחזירים חיפושים ריקים — או מחליפים את החיפוש לגמרי.
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            מתחילים בהחזרת חיפושים בלי תוצאות ב־Search Saver, או עוברים למנוע מלא עם
            Semantix Search — אותו מנוע, שני מסלולי כניסה.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {PRODUCTS.map((product) => (
            <Link
              key={product.name}
              href={product.href}
              className={[
                'group border p-6 transition-colors sm:p-10',
                product.tier === 'entry'
                  ? 'border-purple-200 bg-purple-50/50 hover:border-purple-400'
                  : 'border-gray-200 bg-white hover:border-gray-400',
              ].join(' ')}
            >
              <p
                className={[
                  'font-mono text-[11px] font-semibold uppercase tracking-[0.18em]',
                  product.tier === 'entry' ? 'text-purple-700' : 'text-gray-400',
                ].join(' ')}
              >
                {product.tierLabel}
              </p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-gray-900 sm:text-3xl">
                {product.name}
              </h3>
              <p className="mt-2 text-sm font-medium text-gray-500">{product.tagline}</p>
              <p className="mt-4 text-base leading-7 text-gray-600">{product.description}</p>
              <span className="mt-6 inline-block text-sm font-semibold text-gray-900 transition-transform group-hover:-translate-x-1">
                ← איך זה עובד
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
