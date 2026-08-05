import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getResearchItem, getAllResearchSlugs } from '../../lib/research-content';

const SITE_URL = 'https://www.semantix.co.il';

export function generateStaticParams() {
  return getAllResearchSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const item = getResearchItem(params.slug);
  if (!item) {
    return { title: 'לא נמצא | Semantix Research' };
  }

  return {
    title: `${item.title} | Semantix`,
    description: item.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/research/${item.slug}`,
    },
  };
}

export default function ResearchItemPage({ params }) {
  const item = getResearchItem(params.slug);
  if (!item) {
    notFound();
  }

  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.title,
    description: item.metaDescription,
    url: `${SITE_URL}/research/${item.slug}`,
    author: { '@type': 'Organization', name: 'Semantix', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Semantix', url: SITE_URL },
  };

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'מחקר', item: `${SITE_URL}/research` },
      { '@type': 'ListItem', position: 2, name: item.title, item: `${SITE_URL}/research/${item.slug}` },
    ],
  };

  return (
    <main dir="rtl" className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
            <Link href="/research" className="hover:text-purple-600">
              מחקר
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">{item.title}</span>
          </nav>

          <span className="mt-4 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {item.type} · {item.dataPeriod}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            {item.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">{item.summary}</p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          {item.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-base leading-7 text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {item.source && (
        <section className="border-t border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
              מקור
            </h2>
            <Link
              href={`/case-studies/${item.source.caseStudySlug}`}
              className="mt-3 inline-flex items-center text-base font-semibold text-purple-700 hover:text-purple-800"
            >
              הפרויקט המלא של {item.source.name} →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
