import Link from 'next/link';
import ImageCarousel from './components/ImageCarousel';
import FloatingQueryStream from './components/FloatingQueryStream';
import TechnologySection from './components/TechnologySection';
import CaseStudySection from './components/CaseStudySection';
import SearchSaverBeforeAfter from './components/search-saver/SearchSaverBeforeAfter';
import SemantixProductHierarchy from './components/search-saver/SemantixProductHierarchy';
import SearchSaverCTA from './components/search-saver/SearchSaverCTA';
import { PRIMARY_CTA, PRIMARY_CTA_HREF } from './lib/marketing-copy';

export const metadata = {
  title: 'Semantix | חיפוש לאי־קומרס שמוכר',
  description:
    'Semantix בונה חיפוש לאי־קומרס שמוכר — Search Saver מציל חיפושים ללא תוצאות, ו־Semantix Search מפעיל את חוויית החיפוש המלאה בחנות.',
  openGraph: {
    title: 'Semantix | חיפוש לאי־קומרס שמוכר',
    description:
      'Semantix בונה חיפוש לאי־קומרס שמוכר — מציל חיפושים כושלים והופך כוונת קונים להכנסות.',
    url: 'https://www.semantix.co.il/',
  },
  twitter: {
    title: 'Semantix | חיפוש לאי־קומרס שמוכר',
    description:
      'Semantix בונה חיפוש לאי־קומרס שמוכר — מציל חיפושים כושלים והופך כוונת קונים להכנסות.',
  },
  alternates: {
    canonical: 'https://www.semantix.co.il/',
  },
};

export default function HomePage() {
  return (
    <div className="relative w-full overflow-x-hidden bg-white" dir="rtl">
      <div className="relative">
        {/* 1. Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:pb-24 sm:pt-36">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(167,139,250,0.1),_transparent_42%)]" />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-semibold leading-[1.15] tracking-[-0.03em] text-black sm:text-6xl lg:text-[4.25rem]">
                החיפוש שלכם צריך למכור.
              </h1>
              <p className="mt-5 text-lg font-medium leading-7 text-gray-800 sm:mt-7 sm:text-2xl sm:leading-9">
                החיפוש באתר הוא איש המכירות שלכם. הפכו אותו לטוב ביותר.
              </p>
              <p className="mt-4 max-w-xl text-base leading-7 text-gray-600 sm:mt-5 sm:text-lg sm:leading-8">
                חיפוש הוא רגע הכוונה הגבוה ביותר באי־קומרס. Semantix הופכת את שורת החיפוש
                למנוע מכירות. בלי עיצוב מחדש. בלי צ׳אטבוט. מתחבר לחנות הקיימת שלכם.
              </p>

              <div className="mt-8">
                <Link
                  href={PRIMARY_CTA_HREF}
                  className="animate-white-glow relative inline-flex items-center justify-center overflow-visible rounded-full border-2 border-gray-300 bg-black px-8 py-4 text-base font-semibold text-white transition-all hover:bg-gray-900"
                >
                  {PRIMARY_CTA}
                </Link>
              </div>
            </div>

            <div className="flex shrink-0 justify-center lg:justify-start">
              <FloatingQueryStream />
            </div>
          </div>
        </section>

        {/* 2. Proof strip + metrics */}
        <section className="border-t border-gray-200 bg-white px-4 py-14">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3 px-2 sm:gap-5">
              <p className="min-w-0 font-mono text-[10px] font-semibold uppercase leading-snug tracking-[0.16em] text-gray-500 sm:text-xs sm:tracking-[0.22em]">
                חנויות איקומרס שסומכות עלינו
              </p>
              <div className="hidden h-px min-w-[2rem] flex-1 bg-gray-200 sm:block" />
            </div>
            <ImageCarousel />
          </div>
        </section>

        {/* 3. The technology — personalization + boosting, business-wise */}
        <TechnologySection />

        {/* 4. Case study — real numbers from a live deployment */}
        <CaseStudySection />

        {/* 5. Search Saver in action */}
        <SearchSaverBeforeAfter />

        {/* 6. Close by explaining the two products */}
        <SemantixProductHierarchy />

        <SearchSaverCTA
          eyebrow="Semantix"
          title="גלו איפה החיפוש שלכם מפסיד כסף."
          body="בהדגמה קצרה נמפה את החיפושים ללא תוצאות ונראה איזה מוצר של Semantix מחזיר אותם הכי מהר."
        />
      </div>
    </div>
  );
}
