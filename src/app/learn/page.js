import Link from 'next/link';
import { LEARN_SUPER_CATEGORIES, DOMAINS } from '../lib/content-taxonomy';
import { getAllLearnSlugs } from '../lib/learn-content';

export const metadata = {
  title: 'ללמוד | מדריכי חיפוש למסחר אלקטרוני מ-Semantix',
  description:
    'מדריכי ייחוס על חיפוש במסחר אלקטרוני: התאוששות מחיפושים ללא תוצאות, חיפוש AI והיברידי, מודיעין חיפושים ופרסונליזציה.',
  alternates: {
    canonical: 'https://www.semantix.co.il/learn',
  },
};

const DOMAIN_BY_SLUG = new Map(DOMAINS.map((domain) => [domain.slug, domain]));
const BUILT_SLUGS = new Set(getAllLearnSlugs());

export default function LearnHubPage() {
  return (
    <main dir="rtl" className="bg-white">
      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            ללמוד
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            מרכז הלמידה לחיפוש במסחר אלקטרוני.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            מדריכי ייחוס על איך חיפוש במסחר אלקטרוני באמת עובד — התאוששות מחיפושים ללא תוצאות,
            חיפוש AI והיברידי, מודיעין חיפושים ופרסונליזציה. בלי פיץ' למוצר,
            רק המושגים.
          </p>
          <Link
            href="/glossary"
            className="mt-6 inline-flex items-center text-sm font-semibold text-purple-700 hover:text-purple-800"
          >
            לעיין במילון →
          </Link>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl space-y-16">
          {LEARN_SUPER_CATEGORIES.map((category) => (
            <div key={category.slug}>
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                {category.name}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.domains.map((slug) => {
                  const domain = DOMAIN_BY_SLUG.get(slug);
                  if (!domain) return null;
                  const isBuilt = BUILT_SLUGS.has(slug);

                  const cardContent = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">{domain.name}</h3>
                        {!isBuilt && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            בקרוב
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">{domain.description}</p>
                    </>
                  );

                  return isBuilt ? (
                    <Link
                      key={slug}
                      href={`/learn/${slug}`}
                      className="rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-purple-300 hover:bg-purple-50/40"
                    >
                      {cardContent}
                    </Link>
                  ) : (
                    <div key={slug} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
