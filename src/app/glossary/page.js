import Link from 'next/link';
import { GLOSSARY_TERMS } from '../lib/glossary-content';
import { getDomain } from '../lib/content-taxonomy';

export const metadata = {
  title: 'מילון חיפוש איקומרס | חיפוש סמנטי, אפס תוצאות ועוד',
  description:
    'הגדרות קצרות בעברית למונחי חיפוש באתר: חיפוש ללא תוצאות, חיפוש סמנטי, חיפוש היברידי, BM25, בוסטינג, חיפוש בעברית ועוד.',
  keywords: [
    'מילון חיפוש',
    'חיפוש סמנטי הגדרה',
    'חיפוש ללא תוצאות',
    'חיפוש היברידי',
    'חיפוש באתר',
  ],
  alternates: {
    canonical: 'https://www.semantix.co.il/glossary',
  },
};

const sortedTerms = [...GLOSSARY_TERMS].sort((a, b) => a.term.localeCompare(b.term, 'he'));

export default function GlossaryHubPage() {
  return (
    <main dir="rtl" className="bg-white">
      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            מילון
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            מילון חיפוש לאיקומרס — מוגדר בעברית.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            הגדרות קצרות שאפשר לצטט: חיפוש באתר, חיפוש סמנטי, חיפושים ללא תוצאות,
            חיפוש בעברית, דירוג, מרצ׳נדייזינג ואנליטיקה.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
            {sortedTerms.map((entry) => {
              const domain = getDomain(entry.domain);
              return (
                <li key={entry.slug} className="p-5">
                  <Link
                    href={`/glossary/${entry.slug}`}
                    className="text-lg font-semibold text-gray-900 hover:text-purple-700"
                  >
                    {entry.term}
                  </Link>
                  {domain && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {domain.name}
                    </span>
                  )}
                  <p className="mt-2 text-sm leading-6 text-gray-600">{entry.shortDefinition}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
