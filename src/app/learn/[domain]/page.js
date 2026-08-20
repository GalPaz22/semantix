import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLearnArticle, getAllLearnSlugs, LEARN_CONTENT_LAST_REVIEWED } from '../../lib/learn-content';
import { getDomain } from '../../lib/content-taxonomy';
import { blogArticles } from '../../blog/data';
import { CASE_STUDIES } from '../../lib/case-studies';
import { GLOSSARY_TERMS } from '../../lib/glossary-content';

const SITE_URL = 'https://www.semantix.co.il';
const BUILT_SLUGS = new Set(getAllLearnSlugs());

export function generateStaticParams() {
  return getAllLearnSlugs().map((slug) => ({ domain: slug }));
}

export function generateMetadata({ params }) {
  const article = getLearnArticle(params.domain);
  if (!article) {
    return { title: 'לא נמצא | Semantix Learn' };
  }

  return {
    title: `${article.title} | Semantix`,
    description: article.metaDescription,
    keywords: article.keywords,
    alternates: {
      canonical: `${SITE_URL}/learn/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.metaDescription,
      url: `${SITE_URL}/learn/${article.slug}`,
      type: 'article',
      locale: 'he_IL',
    },
  };
}

export default function LearnArticlePage({ params }) {
  const article = getLearnArticle(params.domain);
  if (!article) {
    notFound();
  }

  const domain = getDomain(article.slug);
  const siblingDomains = (domain?.relatedDomains || [])
    .filter((slug) => BUILT_SLUGS.has(slug))
    .map((slug) => getLearnArticle(slug))
    .filter(Boolean);

  const relatedPosts = blogArticles.filter((post) => post.domains?.includes(article.slug));
  const relatedCaseStudies = CASE_STUDIES.filter((study) => study.domains?.includes(article.slug));
  const relatedGlossaryTerms = GLOSSARY_TERMS.filter((term) => term.domain === article.slug);

  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription,
    url: `${SITE_URL}/learn/${article.slug}`,
    datePublished: LEARN_CONTENT_LAST_REVIEWED,
    dateModified: LEARN_CONTENT_LAST_REVIEWED,
    inLanguage: 'he-IL',
    author: { '@type': 'Organization', name: 'Semantix', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Semantix', url: SITE_URL },
  };

  const faqStructuredData = article.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: article.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }
    : null;

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ללמוד', item: `${SITE_URL}/learn` },
      {
        '@type': 'ListItem',
        position: 2,
        name: article.title,
        item: `${SITE_URL}/learn/${article.slug}`,
      },
    ],
  };

  return (
    <main dir="rtl" className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      {faqStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
            <Link href="/learn" className="hover:text-purple-600">
              ללמוד
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">{article.title}</span>
          </nav>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">{article.summary}</p>
          <p className="mt-4 text-xs text-gray-400">
            עודכן לאחרונה{' '}
            {new Date(LEARN_CONTENT_LAST_REVIEWED).toLocaleDateString('he-IL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          {article.sections.map((section) => (
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

          {article.faqs?.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                שאלות נפוצות
              </h2>
              <div className="mt-6 space-y-6">
                {article.faqs.map((faq) => (
                  <div key={faq.question} className="border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-10">
          {article.relatedProduct && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                לראות במוצר
              </h2>
              <Link
                href={article.relatedProduct.href}
                className="mt-3 inline-flex items-center text-base font-semibold text-purple-700 hover:text-purple-800"
              >
                {article.relatedProduct.name} →
              </Link>
            </div>
          )}

          {article.relatedResearch && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                מחקר
              </h2>
              <Link
                href={article.relatedResearch.href}
                className="mt-3 inline-flex items-center text-base font-semibold text-purple-700 hover:text-purple-800"
              >
                {article.relatedResearch.name} →
              </Link>
            </div>
          )}

          {article.relatedTool && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                לנסות את הכלי
              </h2>
              <Link
                href={article.relatedTool.href}
                className="mt-3 inline-flex items-center text-base font-semibold text-purple-700 hover:text-purple-800"
              >
                {article.relatedTool.name} →
              </Link>
            </div>
          )}

          {relatedGlossaryTerms.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                מונחים במילון
              </h2>
              <ul className="mt-3 space-y-2">
                {relatedGlossaryTerms.map((term) => (
                  <li key={term.slug}>
                    <Link
                      href={`/glossary/${term.slug}`}
                      className="text-base font-medium text-gray-900 hover:text-purple-700"
                    >
                      {term.term}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {siblingDomains.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                מדריכים קשורים
              </h2>
              <ul className="mt-3 space-y-2">
                {siblingDomains.map((sibling) => (
                  <li key={sibling.slug}>
                    <Link
                      href={`/learn/${sibling.slug}`}
                      className="text-base font-medium text-gray-900 hover:text-purple-700"
                    >
                      {sibling.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {relatedCaseStudies.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                פרויקטים קשורים
              </h2>
              <ul className="mt-3 space-y-2">
                {relatedCaseStudies.map((study) => (
                  <li key={study.slug}>
                    <Link
                      href={`/case-studies/${study.slug}`}
                      className="text-base font-medium text-gray-900 hover:text-purple-700"
                    >
                      {study.name}: {study.headline}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {relatedPosts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                קריאה קשורה
              </h2>
              <ul className="mt-3 space-y-2">
                {relatedPosts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-base font-medium text-gray-900 hover:text-purple-700"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
