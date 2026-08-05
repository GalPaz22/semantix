import Link from 'next/link';
import { PRIMARY_CTA, PRIMARY_CTA_HREF } from '../../lib/marketing-copy';

export default function SearchSaverCTA({
  eyebrow = 'Search Saver מבית Semantix',
  title = 'גלו כמה כסף החיפוש שלכם מפספס.',
  body = 'בדמו קצר נראה איך Search Saver מזהה חיפושים בלי תוצאות, מחזיר מוצרים רלוונטיים ועוקב אחרי ההכנסות שהוחזרו.',
}) {
  return (
    <section className="bg-black py-16 text-white sm:py-32" dir="rtl">
      <div className="mx-auto max-w-5xl px-6 text-center sm:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">
          {eyebrow}
        </p>
        <h2 className="mt-5 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
          {body}
        </p>
        <div className="mt-8">
          <Link
            href={PRIMARY_CTA_HREF}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-purple-50"
          >
            {PRIMARY_CTA}
          </Link>
        </div>
      </div>
    </section>
  );
}
