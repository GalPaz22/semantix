import Link from 'next/link';
import { Suspense } from 'react';
import ZeroResultCalculator from './Calculator';

const SITE_URL = 'https://www.semantix.co.il';

export const metadata = {
  title: 'מחשבון חיפושים ללא תוצאות | Semantix',
  description:
    'להעריך כמה הכנסה חודשית בסיכון מחיפושים ללא תוצאות, לפי התנועה, שיעור ההמרה וערך ההזמנה הממוצע שלכם.',
  alternates: {
    canonical: `${SITE_URL}/tools/zero-result-calculator`,
  },
};

const webApplicationStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Zero-Result Calculator',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${SITE_URL}/tools/zero-result-calculator`,
  description:
    'להעריך כמה הכנסה חודשית בסיכון מחיפושים ללא תוצאות, לפי התנועה, שיעור ההמרה וערך ההזמנה הממוצע שלכם.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  provider: { '@type': 'Organization', name: 'Semantix', url: SITE_URL },
};

const breadcrumbStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'כלים', item: `${SITE_URL}/tools` },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Zero-Result Calculator',
      item: `${SITE_URL}/tools/zero-result-calculator`,
    },
  ],
};

export default function ZeroResultCalculatorPage() {
  return (
    <main dir="rtl" className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
            <Link href="/tools" className="hover:text-purple-600">
              כלים
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">Zero-Result Calculator</span>
          </nav>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            Zero-Result Calculator
          </h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            להעריך כמה הכנסה חודשית בסיכון מחיפושים שלא מחזירים מוצרים —
            לפי המספרים שלכם, לא לפי ממוצע תעשייה מניח.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Suspense fallback={null}>
            <ZeroResultCalculator />
          </Suspense>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
            קריאה קשורה
          </h2>
          <ul className="space-y-2">
            <li>
              <Link
                href="/learn/zero-result-searches"
                className="text-base font-medium text-gray-900 hover:text-purple-700"
              >
                חיפושים ללא תוצאות: מה הם עולים ואיך להתאושש מהם
              </Link>
            </li>
            <li>
              <Link
                href="/learn/ecommerce-conversion"
                className="text-base font-medium text-gray-900 hover:text-purple-700"
              >
                המרה במסחר אלקטרוני: ההשפעה העסקית של החיפוש
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
