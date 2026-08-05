import SearchSaverHero from '../components/search-saver/SearchSaverHero';
import SearchSaverWhatItFixes from '../components/search-saver/SearchSaverWhatItFixes';
import SearchSaverHowItWorks from '../components/search-saver/SearchSaverHowItWorks';
import SearchSaverInvisibleLayer from '../components/search-saver/SearchSaverInvisibleLayer';
import SearchSaverProof from '../components/search-saver/SearchSaverProof';
import SearchSaverComparison from '../components/search-saver/SearchSaverComparison';
import SearchSaverWhoItsFor from '../components/search-saver/SearchSaverWhoItsFor';
import SearchSaverWhyDifferent from '../components/search-saver/SearchSaverWhyDifferent';
import SearchSaverFAQ from '../components/search-saver/SearchSaverFAQ';
import SemantixProductHierarchy from '../components/search-saver/SemantixProductHierarchy';
import SearchSaverCTA from '../components/search-saver/SearchSaverCTA';
import MultiLayerPipeline from '../components/MultiLayerPipeline';

export const metadata = {
  title: 'Search Saver מבית Semantix | חיפושים בלי תוצאות הופכים להכנסות',
  description:
    'Search Saver מחזיר חיפושים בלי תוצאות בחנות — שכבה קלה שמחזירה חיפושים ריקים בתוך שורת החיפוש הקיימת.',
  openGraph: {
    title: 'Search Saver מבית Semantix | חיפושים בלי תוצאות הופכים להכנסות',
    description:
      'מחזירים חיפושים בלי תוצאות במקום — ועוקבים אחרי ההכנסות ש־Search Saver מחזיר.',
    url: 'https://www.semantix.co.il/search-saver',
  },
  twitter: {
    title: 'Search Saver מבית Semantix | חיפושים בלי תוצאות הופכים להכנסות',
    description:
      'מחזירים חיפושים בלי תוצאות במקום — ועוקבים אחרי ההכנסות ש־Search Saver מחזיר.',
  },
  alternates: {
    canonical: 'https://www.semantix.co.il/search-saver',
  },
};

const agentStages = ['קריאת תעבורה', 'זיהוי חיפוש ריק', 'החזרה במקום', 'מעקב הכנסות'];

const agentQueries = [
  {
    text: 'wineter jacket',
    tag: 'חיפוש בלי תוצאות שהוחזר',
    resultName: "Winter Jacket — Men's",
    resultNote: 'הוחזר מ־: 0 תוצאות.',
  },
  {
    text: 'red wine for steak under $40',
    tag: 'חיפוש בלי תוצאות שהוחזר',
    resultName: 'Primitivo di Puglia Zin',
    resultNote: 'הוחזר מ־: 0 תוצאות.',
  },
  {
    text: 'chianti clasico riserva',
    tag: 'חיפוש בלי תוצאות שהוחזר',
    resultName: 'Chianti Classico Riserva',
    resultNote: 'הוחזר מ־: 0 תוצאות.',
  },
];

const searchSaverStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Search Saver",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.semantix.co.il/search-saver",
  description:
    "Search Saver מחזיר חיפושים בלי תוצאות בחנות — שכבה קלה שמחזירה חיפושים ריקים בתוך שורת החיפוש הקיימת.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "ILS",
    url: "https://www.semantix.co.il/pricing",
  },
  provider: {
    "@type": "Organization",
    name: "Semantix",
    url: "https://www.semantix.co.il",
  },
};

export default function SearchSaverPage() {
  return (
    <main className="bg-white" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(searchSaverStructuredData) }}
      />
      <SearchSaverHero />
      <SearchSaverWhatItFixes />
      <SearchSaverHowItWorks />
      <SearchSaverInvisibleLayer />

      <section className="border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-sm uppercase tracking-[0.25em] text-gray-500">בשידור חי</p>
            <h2 className="mb-6 text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
              תופס חיפושים בלי תוצאות ומחזיר אותם במקום
            </h2>
            <p className="text-lg leading-relaxed text-gray-600">
              כשהחיפוש הקיים מחזיר ריק, Search Saver קורא את החיפוש, מחזיר מוצרים
              רלוונטיים מהקטלוג ומשאיר את הלקוח באותו עמוד תוצאות.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-2xl">
            <MultiLayerPipeline stages={agentStages} queries={agentQueries} />
          </div>
        </div>
      </section>

      <SearchSaverProof variant="landing" />
      <SearchSaverComparison />
      <SearchSaverWhoItsFor />
      <SearchSaverWhyDifferent />
      <SearchSaverFAQ />
      <SemantixProductHierarchy />
      <SearchSaverCTA
        title="משאירים את החנות. מחזירים את החיפושים הריקים."
        body="Search Saver יושב כשכבה דקה מעל שורת החיפוש הקיימת, מחזיר חיפושים בלי תוצאות במקום — ומראה בדשבורד כמה הכנסות חזרו."
      />
    </main>
  );
}
