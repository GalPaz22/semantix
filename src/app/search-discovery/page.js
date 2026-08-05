import Link from 'next/link';
import { Search, Globe, CheckCircle, ArrowRight } from 'lucide-react';
import SemantixSearchDemo from '../components/SemantixSearchDemo';
import MultiLayerPipeline from '../components/MultiLayerPipeline';
import { PRIMARY_CTA, PRODUCTS } from '../lib/marketing-copy';

const semantixSearch = PRODUCTS[1];

const engineStages = ['שכבה סמנטית', 'קידום', 'פרופילים', 'פרסונליזציה'];

const engineQueries = [
  {
    text: 'light red wine to drink with friends',
    tag: 'שאילתה סמנטית',
    resultName: 'Château de la Selve — Petite Selve',
    resultNote: 'התאמה לפי משמעות, ואז קידום לפי המרות אחרונות.',
  },
  {
    text: 'dry red wine from France under $40, not too heavy',
    tag: 'שאילתה מורכבת',
    resultName: 'Domaine Denizot — Sancerre Rouge Biorga',
    resultNote: 'מספר אילוצים נפתרו במעבר אחד — בלי פילטרים.',
  },
  {
    text: 'wine',
    tag: 'שאילתה סטנדרטית',
    resultName: 'הבחירה המובילה לקונה הזה',
    resultNote: 'מותאם אישית לפי היסטוריית גלישה ורכישות.',
  },
];

export const metadata = {
  title: 'Semantix Search | מנוע חיפוש היברידי רב־שכבתי',
  description: semantixSearch.description,
  alternates: {
    canonical: 'https://www.semantix.co.il/search-discovery',
  },
};

const impactStats = [
  {
    value: '+41%',
    label: 'עלייה ממוצעת בהמרה אחרי מעבר ל־Semantix Search',
  },
  {
    value: '3.6x',
    label: 'יותר הכנסות שנוצרות דרך חיפוש באתר',
  },
  {
    value: '30+',
    label: 'שפות שמבינים באופן מובנה, בלי כללי תרגום',
  },
];

const intentBullets = [
  {
    title: 'היברידי לפי עיצוב',
    description:
      'דיוק מילות מפתח למק״טים ושמות מוצר, הבנה סמנטית לכוונה מעורפלת או מורכבת — סט תוצאות מדורג אחד.',
  },
  {
    title: 'מטפל בעמימות אוטומטית',
    description: 'מנרמל שגיאות כתיב, סלנג וביטויים מעורפלים לפני דירוג התוצאות.',
  },
  {
    title: 'קידום, פרופילים ופרסונליזציה',
    description:
      'עדיפויות מרצ׳נדייזינג וההיסטוריה של כל קונה מעצבות מי רואה מה קודם — בלי גיליונות כללים אינסופיים.',
  },
];

const multilingualExamples = [
  {
    language: 'אנגלית',
    query: '"dry red wine from France"',
    matches: '47 התאמות רלוונטיות',
  },
  {
    language: 'ספרדית',
    query: '"vino tinto ligero para amigos"',
    matches: 'אותן 47 התאמות',
  },
  {
    language: 'גרמנית',
    query: '"rote wein fuer grillabend"',
    matches: 'אותן 47 התאמות',
  },
];

const semantixSearchStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Semantix Search",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.semantix.co.il/search-discovery",
  description: semantixSearch.description,
  offers: {
    "@type": "Offer",
    price: "1499",
    priceCurrency: "USD",
    url: "https://www.semantix.co.il/pricing",
  },
  provider: {
    "@type": "Organization",
    name: "Semantix",
    url: "https://www.semantix.co.il",
  },
};

export default function SearchDiscoveryPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(semantixSearchStructuredData) }}
      />
      {/* Hero */}
      <section className="relative py-16 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                <span className="text-sm font-medium text-gray-700 tracking-tight">
                  {semantixSearch.name}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-7xl font-semibold mb-6 leading-tight text-gray-900 tracking-tight">
                מנוע החיפוש ההיברידי הרב־שכבתי המלא
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-10 leading-relaxed">
                החליפו או שדרגו את החיפוש בחנות עם דירוג היברידי רב־לשוני שמבין שאילתות
                סמנטיות, מורכבות וסטנדרטיות — ואז מנווט כל קונה לתוצאה המועדפת עליו עם קידום,
                פרופילים ופרסונליזציה.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {PRIMARY_CTA}
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <SemantixSearchDemo />
            </div>
          </div>
          <div className="mt-12 lg:hidden">
            <SemantixSearchDemo />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-500 text-center">הוכחות, לא הבטחות</p>
          <div className="grid md:grid-cols-3 gap-10 text-center mt-10">
            {impactStats.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <p className="text-4xl md:text-5xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intent-first ranking */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-gray-500 mb-4">דירוג היברידי</p>
              <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-6 tracking-tight">
                כל סוג שאילתה. תוצאה אחת מדויקת.
              </h2>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Semantix Search הוא המנוע מאחורי השורה — לא טלאי החזרה. הוא מבין את המשימה
                שיש לבצע, מדרג עם אותות המרה חיים, ומשאיר את המרצ׳נדייזרים בשליטה בלי רשימות
                מילים נרדפות או כללי גיליון.
              </p>

              <div className="space-y-4">
                {intentBullets.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <CheckCircle className="w-5 h-5 text-gray-900" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm text-gray-600">
                החזרת אפס־תוצאות כלולה כששאילתה הייתה נכשלת אחרת — כיכולת אחת של המנוע
                המלא, לא העבודה היחידה של המוצר.
              </p>
            </div>

            <div className="relative min-w-0">
              <div className="border border-gray-200 rounded-2xl p-4 sm:p-6 bg-gray-50 space-y-6">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-white flex items-center justify-center border border-gray-200">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 sm:tracking-[0.3em]">שאילתה חיה</p>
                    <p className="text-base sm:text-lg font-medium text-gray-900 mt-1 break-words">light red wine to drink with friends</p>
                    <p className="text-sm text-gray-500">כוונה: מפגש חברתי</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-white border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-semibold text-gray-900">Château de la Selve - Petite Selve</p>
                      <span className="shrink-0 text-sm font-semibold text-gray-900">$24</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">אדום קל ופירותי, אידיאלי לשיתוף עם חברים.</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full mt-3">
                      התאמה מושלמת
                    </span>
                  </div>

                  <div className="rounded-2xl border border-dashed border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-900">Lustig - Lulu Dolcetto</p>
                    <p className="text-sm text-gray-500 mt-1">טאנינים רכים, חומציות מאוזנת, מעולה לערבים רגועים.</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <span>$36</span>
                      <span>קודם לפי המרות אחרונות</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-layer engine */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-gray-500 mb-4">מנוע אחד, כל סוג שאילתה</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6 tracking-tight">
              סמנטית, מורכבת או סטנדרטית — כל שאילתה נוחתת על התוצאה הנכונה
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              כל שאילתה עוברת באותן שכבות: הבנה סמנטית, קידום, פרופילים ופרסונליזציה —
              כך שכל קונה מנותב להתאמה הטובה ביותר עבורו.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mt-12">
            <MultiLayerPipeline stages={engineStages} queries={engineQueries} />
          </div>
        </div>
      </section>

      {/* Multi-language */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-6 text-sm text-gray-600">
                <Globe className="w-4 h-4 shrink-0" />
                <span className="font-medium tracking-tight">חיפוש היברידי רב־לשוני</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6 tracking-tight">
                בנוי לקטלוגים גלובליים
              </h2>

              <p className="text-lg text-gray-600 leading-relaxed">
                Semantix Search מבין כוונה בשפת הקונה, ממפה אותה לקטלוג שלכם, ומחיל את אותה
                לוגיקת קידום ופרסונליזציה בכל שוק — בלי לתחזק כללי תרגום.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-900 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">הבנה חוצת־שפות</p>
                    <p className="text-sm text-gray-600">חפשו בספרדית, קבלו נתוני מוצר באנגלית בלי לאבד ניואנסים.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-900 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">העשרה אוטומטית</p>
                    <p className="text-sm text-gray-600">אנחנו מעשירים מאפייני מוצר כדי שהכוונה תישאר עקבית בין לוקאלים.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-900 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">תמיכה מלאה ב־RTL/LTR</p>
                    <p className="text-sm text-gray-600">הממשקים מתאימים את עצמם אוטומטית — בלי זמן פיתוח נוסף.</p>
                  </div>
                </div>
              </div>

              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors mt-10"
              >
                דברו עם הצוות שלנו
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {multilingualExamples.map((example) => (
                <div key={example.language} className="border border-gray-200 rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{example.language}</p>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-xs sm:tracking-[0.3em]">
                      כוונה זוהתה
                    </span>
                  </div>
                  <p className="text-base sm:text-lg text-gray-800 mt-2 break-words">{example.query}</p>
                  <p className="text-sm text-gray-500 mt-1">{example.matches}</p>
                </div>
              ))}
              <div className="border border-dashed border-gray-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-gray-900">קטלוג אחד. כל שפה.</p>
                <p className="text-sm text-gray-600">
                  Semantix שומרת על מלאי, מחירים ותוכן מסונכרנים בין שווקים אוטומטית.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 mb-4 tracking-tight">
            מוכנים לשדרג את מנוע החיפוש?
          </h2>
          <p className="text-lg text-gray-600 mb-10">
            ראו את Semantix Search על הקטלוג שלכם — דירוג היברידי, כוונה רב־לשונית, קידום
            ופרסונליזציה בהדגמה אחת.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              {PRIMARY_CTA}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
