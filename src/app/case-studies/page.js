import Link from 'next/link';
import CaseStudyList from '../components/CaseStudyList';
import { PRIMARY_CTA, PRIMARY_CTA_HREF } from '../lib/marketing-copy';

export const metadata = {
  title: 'לקוחות | פרויקטים של Semantix',
  description:
    'תוצאות לקוחות מ־Weinroute, Wine House, Garmin ו־Lisa Leonard — שיעורי ייחוס, הכנסות שהוחזרו ופריסות Semantix חיות.',
  alternates: {
    canonical: 'https://www.semantix.co.il/case-studies',
  },
};

export default function CaseStudiesPage() {
  return (
    <main className="bg-white" dir="rtl">
      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            פרויקטים
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            איך סוחרים משתמשים ב־Semantix.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            כל שורה היא פריסה חיה — סוחר, תהליך והמספרים החשובים באמת. בלי פירוט קטלוג או
            מק״טים.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <CaseStudyList />
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50 px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              רוצים את אותה מפת החזרה לחנות שלכם?
            </h2>
            <p className="mt-2 text-gray-600">
              נראה אילו חיפושים Semantix יכולה להחזיר או לייחס בתעבורה שלכם.
            </p>
          </div>
          <Link
            href={PRIMARY_CTA_HREF}
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-900"
          >
            {PRIMARY_CTA}
          </Link>
        </div>
      </section>
    </main>
  );
}
