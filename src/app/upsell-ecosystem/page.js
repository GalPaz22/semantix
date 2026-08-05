import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Target,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';
import SemantixUpsellDemo from '../components/SemantixUpsellDemo';
import { PRIMARY_CTA } from '../lib/marketing-copy';

export const metadata = {
  title: 'פרסונליזציה בזמן אמת | Semantix',
  description:
    'להתאים את המוצרים הטובים ביותר בזמן אמת באמצעות אותות רכישה, קליקים והוספה לעגלה.',
  alternates: {
    canonical: 'https://www.semantix.co.il/upsell-ecosystem',
  },
};

const stats = [
  { label: 'עלייה ב-CTR מותאם אישית', value: '28%' },
  { label: 'עלייה בהוספה לעגלה', value: '41%' },
  { label: 'שיעור רכישות חוזרות', value: '1.7×' },
  { label: 'זמן התקנה', value: '12 דק׳' },
];

const Bullet = ({ title, body }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
        <CheckCircle className="w-3 h-3 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{body}</p>
      </div>
    </div>
  );
};

const upsellEcosystemStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Real-Time Personalization",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.semantix.co.il/upsell-ecosystem",
  description:
    "להתאים את המוצרים הטובים ביותר בזמן אמת באמצעות אותות רכישה, קליקים והוספה לעגלה.",
  provider: {
    "@type": "Organization",
    name: "Semantix",
    url: "https://www.semantix.co.il",
  },
};

export default function UpsellEcosystemPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(upsellEcosystemStructuredData) }}
      />
      {/* Hero */}
      <section className="py-24 md:py-32 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-gray-700">
                  Real-Time Personalization
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-semibold text-gray-900 tracking-tight mb-6">
                פרסונליזציה שמגיבה מיד
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                להתאים את המוצרים הטובים ביותר בזמן אמת לפי היסטוריית רכישות,
                קליקים והתנהגות הוספה לעגלה. ההתאמה מתעדכנת תוך כדי הסשן — בלי כללים ידניים, בלי עיכובים.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  {PRIMARY_CTA}
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <SemantixUpsellDemo />
            </div>
          </div>
          <div className="mt-12 lg:hidden">
            <SemantixUpsellDemo />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((item) => (
              <div key={item.label}>
                <div className="text-4xl font-semibold text-gray-900 mb-2">
                  {item.value}
                </div>
                <p className="text-sm text-gray-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature: Signals */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">
                אותות בזמן אמת
              </p>
              <h2 className="text-4xl font-semibold text-gray-900 mb-6">
                להתאים לכל קונה את המוצר הבא הנכון
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Semantix מדרגת מוצרים לפי אותות התנהגות חיים מהסשן הנוכחי ומרכישות קודמות. התוצאות נשארות רלוונטיות כשהכוונה משתנה.
              </p>
              <div className="space-y-4">
                <Bullet
                  title="משקל לפי היסטוריית רכישות"
                  body="הזמנות קודמות מעלות רלוונטיות לקונים חוזרים."
                />
                <Bullet
                  title="מהירות קליקים וצפיות"
                  body="לומדת ממה שמקבל תשומת לב בסשן הנוכחי."
                />
                <Bullet
                  title="מומנטום הוספה לעגלה"
                  body="מעלה מוצרים הקשורים להתנהגות עגלה אחרונה."
                />
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
                <ShoppingCart className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  אותות סשן שזוהו
                </span>
              </div>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                    דירוג מותאם אישית
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>✓ נלחץ: טוניקים הדרים</li>
                    <li>✓ נוסף: aperitif spritz</li>
                    <li>✓ נרכש: zero-proof set</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Session */}
      <section className="py-24 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">
                מודיעין סשן
              </p>
              <h2 className="text-4xl font-semibold text-gray-900 mb-6">
                פרסונליזציה שמתעדכנת בכל קליק
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                כשקונים גולשים, הדירוג מתאים את עצמו בזמן אמת. Semantix
                שומרת על רלוונטיות גבוהה בלי כללים קשיחים או סגמנטים סטטיים.
              </p>
              <div className="space-y-4">
                <Bullet
                  title="כיול חי"
                  body="הדירוגים מתרעננים בכל קליק ואירוע עגלה."
                />
                <Bullet
                  title="התאמה בין קטגוריות"
                  body="מציגה פריטים קשורים מכל ה-catalog אוטומטית."
                />
                <Bullet
                  title="זיהוי קונים חוזרים"
                  body="מנצלת היסטוריית רכישות להעלאת סיכויי הצלחה."
                />
              </div>
            </div>
            <div className="space-y-6">
              {[
                {
                  label: 'נלחץ: מי מינרל',
                  items: ['✓ Citrus spritz', '✓ Herbal mixer', '✓ Bitter orange'],
                },
                {
                  label: 'נוסף לעגלה: aperitif set',
                  items: ['✓ Zero-proof negroni', '✓ Grapefruit soda', '✓ Party pack'],
                },
                {
                  label: 'נרכש בחודש שעבר: mocktail kit',
                  items: ['✓ Refill bundle', '✓ New flavor drops', '✓ Glassware'],
                },
              ].map((context) => (
                <div
                  key={context.label}
                  className="border border-gray-200 rounded-xl p-5 bg-white"
                >
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                    {context.label}
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {context.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Customer Journey */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                מסע חלק — בלי שלבים מיותרים
              </h3>
              <div className="space-y-4">
                {[
                  'גלישה • «aperitif לא אלכוהולי»',
                  'קליקים מאותתים על כוונה בזמן אמת',
                  'דירוג מותאם אישית מתעדכן מיד',
                  'הוספה לעגלה עם חלופות רלוונטיות',
                  'תשלום — שיעור המרה גבוה יותר',
                ].map((step, idx) => (
                  <div key={step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">
                      {idx === 4 ? '✓' : idx + 1}
                    </div>
                    <p className="text-sm text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">
                השפעה על הכנסות
              </p>
              <h2 className="text-4xl font-semibold text-gray-900 mb-6">
                בנוי להגיב בתוך המסע שלכם
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                ההתאמה האישית קורית תוך כדי תנועת הקונה. בלי פופ-אפים, בלי
                מבוי סתום — רק המוצרים הבאים הטובים ביותר ברגע הנכון.
              </p>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  <span>פרויקט — קמעונאי משקאות מיוחדים</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      לפני Semantix
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">2.1%</p>
                    <p className="text-sm text-gray-600">שיעור המרה</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      אחרי Semantix
                    </p>
                    <p className="text-2xl font-semibold text-emerald-600">3.0%</p>
                    <p className="text-sm text-gray-600">שיעור המרה</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-4">
            להשיק פרסונליזציה בזמן אמת השבוע
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            לחבר את Semantix לחנות תוך דקות — בלי תיוג, בלי תהליכי עבודה ידניים.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
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
