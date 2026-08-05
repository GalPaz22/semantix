import Link from 'next/link';
import SearchSaverAgentDemo from './SearchSaverAgentDemo';
import { PRIMARY_CTA, PRIMARY_CTA_HREF } from '../../lib/marketing-copy';

const PILLARS = ['התקנה ב־5 דקות', 'בלי עיצוב מחדש', 'בלי צ\'אטבוט', 'מתחבר לחנות'];

export default function SearchSaverHero() {
  return (
    <section dir="rtl" className="relative overflow-hidden bg-white pt-24 sm:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(167,139,250,0.16),_transparent_46%)]" />

      <div className="relative mx-auto grid max-w-7xl items-start gap-12 px-6 pb-20 sm:px-8 lg:grid-cols-[0.96fr_1.04fr] lg:gap-14">
        <div className="max-w-2xl lg:sticky lg:top-28">
          <p className="text-xs font-semibold uppercase leading-snug tracking-[0.14em] text-purple-700 sm:text-sm sm:tracking-[0.18em]">
            שכבה קלה מעל שורת החיפוש הקיימת
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-5xl lg:text-6xl">
            החיפוש שלכם מפסיד כסף.
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
            Search Saver מחזיר חיפושי מוצרים בלי תוצאות — בלי להחליף את שורת החיפוש.
          </p>
          <p className="mt-4 text-base font-medium text-gray-500">
            בלי עיצוב מחדש. בלי צ&apos;אטבוט. מתחבר לחנות הקיימת.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {PILLARS.map((pillar) => (
              <span
                key={pillar}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600"
              >
                {pillar}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={PRIMARY_CTA_HREF}
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
            >
              {PRIMARY_CTA}
            </Link>
            <a
              href="#how-search-saver-works"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-purple-300 hover:text-black"
            >
              איך זה עובד
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <SearchSaverAgentDemo variant="landing" />
        </div>
      </div>
    </section>
  );
}
