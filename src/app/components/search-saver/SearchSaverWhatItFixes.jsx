import Link from 'next/link';
import { PRIMARY_CTA, PRIMARY_CTA_HREF } from '../../lib/marketing-copy';

const POINTS = [
  {
    title: 'חיפושים בלי מוצא',
    body:
      'לקוח מקליד מה שהוא צריך, החיפוש מחזיר ריק — ביקור אבוד. Search Saver מחזיר אותו באותו עמוד.',
  },
  {
    title: 'שגיאות כתיב וניסוחים קרובים',
    body:
      'טעות כתיב או ניסוח אחר, והמנוע מחזיר "לא נמצאו מוצרים". Search Saver מחזיר את החיפוש.',
  },
  {
    title: 'חיפושים בשפה חופשית',
    body:
      '"יין אדום לסטייק", "מתנה לאמא" — חיפוש מילות מפתח לא תופס. Search Saver מחזיר מהקטלוג.',
  },
];

export default function SearchSaverWhatItFixes() {
  return (
    <section dir="rtl" className="bg-[#f6f6f8] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
            בעיה אחת שאנחנו פותרים
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            חיפושים בלי תוצאות שהורגים הכנסות בשקט.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            Search Saver עושה דבר אחד: מחזיר חיפושים שלא מחזירים כלום. לא מדרג מחדש,
            לא מזריק לתוצאות תקינות, ולא מחליף את מנוע החיפוש.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {POINTS.map((point) => (
            <div key={point.title} className="rounded-[28px] border border-gray-200 bg-white p-7">
              <h3 className="text-xl font-semibold text-gray-900">{point.title}</h3>
              <p className="mt-3 text-base leading-7 text-gray-600">{point.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={PRIMARY_CTA_HREF}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-purple-300 hover:text-black"
          >
            ראו מה החנות שלכם מפספסת
          </Link>
        </div>
      </div>
    </section>
  );
}
