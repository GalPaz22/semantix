import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGlossaryTerm, getAllGlossarySlugs } from '../../lib/glossary-content';
import { getDomain } from '../../lib/content-taxonomy';
import { getAllLearnSlugs } from '../../lib/learn-content';

const SITE_URL = 'https://www.semantix.co.il';
const BUILT_LEARN_SLUGS = new Set(getAllLearnSlugs());

export function generateStaticParams() {
  return getAllGlossarySlugs().map((slug) => ({ term: slug }));
}

export function generateMetadata({ params }) {
  const entry = getGlossaryTerm(params.term);
  if (!entry) {
    return { title: 'לא נמצא | Semantix Glossary' };
  }

  return {
    title: `${entry.term}: הגדרה | Semantix`,
    description: entry.shortDefinition,
    alternates: {
      canonical: `${SITE_URL}/glossary/${entry.slug}`,
    },
    openGraph: {
      title: `${entry.term}: הגדרה`,
      description: entry.shortDefinition,
      url: `${SITE_URL}/glossary/${entry.slug}`,
      locale: 'he_IL',
    },
  };
}

export default function GlossaryTermPage({ params }) {
  const entry = getGlossaryTerm(params.term);
  if (!entry) {
    notFound();
  }

  const domain = getDomain(entry.domain);
  const domainIsBuilt = domain && BUILT_LEARN_SLUGS.has(domain.slug);
  const relatedTerms = (entry.relatedTerms || []).map(getGlossaryTerm).filter(Boolean);

  const definedTermStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: entry.term,
    description: entry.shortDefinition,
    url: `${SITE_URL}/glossary/${entry.slug}`,
    inDefinedTermSet: `${SITE_URL}/glossary`,
    inLanguage: 'he',
  };

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'מילון', item: `${SITE_URL}/glossary` },
      { '@type': 'ListItem', position: 2, name: entry.term, item: `${SITE_URL}/glossary/${entry.slug}` },
    ],
  };

  return (
    <main dir="rtl" className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
            <Link href="/glossary" className="hover:text-purple-600">
              מילון
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">{entry.term}</span>
          </nav>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            {entry.term}
          </h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">{entry.shortDefinition}</p>

          {domain && (
            <p className="mt-4 text-sm text-gray-500">
              חלק מ{' '}
              {domainIsBuilt ? (
                <Link href={`/learn/${domain.slug}`} className="font-medium text-purple-700 hover:text-purple-800">
                  {domain.name}
                </Link>
              ) : (
                <span className="font-medium text-gray-700">{domain.name}</span>
              )}
            </p>
          )}
        </div>
      </section>

      {entry.expandedExplanation && (
        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl space-y-6">
            <p className="text-base leading-7 text-gray-700">{entry.expandedExplanation}</p>
            {entry.example && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  דוגמה
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-700">{entry.example}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {relatedTerms.length > 0 && (
        <section className="border-t border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
              מונחים קשורים
            </h2>
            <ul className="mt-3 space-y-2">
              {relatedTerms.map((related) => (
                <li key={related.slug}>
                  <Link
                    href={`/glossary/${related.slug}`}
                    className="text-base font-medium text-gray-900 hover:text-purple-700"
                  >
                    {related.term}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
