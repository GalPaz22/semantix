import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle, Code2 } from 'lucide-react';
import SemantixBrainDemo from '../components/SemantixBrainDemo';
import { PRIMARY_CTA } from '../lib/marketing-copy';

export const metadata = {
  title: 'Semantix Brain | אנליטיקה ותובנות',
  description:
    'אנליטיקת חיפושים בזמן אמת, מיפוי המרות ותובנות מעשיות לצוותי מסחר דיגיטלי בביצועים גבוהים.',
  alternates: {
    canonical: 'https://www.semantix.co.il/semantix-brain',
  },
};

const stats = [
  { label: 'זמן תגובה לנתונים חיים', value: 'בזמן אמת' },
  { label: 'כיסוי חיפושים', value: '100%' },
  { label: 'עלייה בהמרות', value: '28%' },
  { label: 'ROI לחיפושים מורכבים', value: '2×' },
];

const insights = [
  {
    title: 'מלאי חסר',
    body: '«יין אדום אורגני» חופש 47 פעמים ללא תוצאות. פוטנציאל: 4.2K$ לחודש.',
  },
  {
    title: 'הזדמנות תוכן',
    body: '«יין עם פסטה» במגמת עלייה. הופכים לפוסט בבלוג + דף נחיתה.',
  },
  {
    title: 'ירידה בהמרות',
    body: 'המרות ל«יין בתקציב» ירדו ב-18%. לבדוק תמחור וקופי.',
  },
];

const Bullet = ({ title, body }) => (
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

const semantixBrainStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Semantix Brain",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.semantix.co.il/semantix-brain",
  description:
    "אנליטיקת חיפושים בזמן אמת, מיפוי המרות ותובנות מעשיות לצוותי מסחר דיגיטלי בביצועים גבוהים.",
  provider: {
    "@type": "Organization",
    name: "Semantix",
    url: "https://www.semantix.co.il",
  },
};

export default function SemantixBrainPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(semantixBrainStructuredData) }}
      />
      {/* Hero */}
      <section className="py-24 md:py-32 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-sm font-medium text-gray-700">Semantix Brain</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-semibold text-gray-900 tracking-tight mb-6">
                לדעת מה הקונים שלכם רוצים
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                מודיעין חיפושים בזמן אמת, מיפוי המרות ואנליטיקת ROI. להבין כל חיפוש,
                להגיב מיד, ולקבל החלטות מבוססות נתונים — לא תחושות בטן.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  לגלות תובנות
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-800 rounded-lg font-medium hover:border-gray-400 transition-colors"
                >
                  {PRIMARY_CTA}
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <SemantixBrainDemo />
            </div>
          </div>
          <div className="mt-12 lg:hidden">
            <SemantixBrainDemo />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((item) => (
              <div key={item.label}>
                <div className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
                  {item.value}
                </div>
                <p className="text-sm text-gray-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Query Intelligence */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">
                מודיעין חיפושים
              </p>
              <h2 className="text-4xl font-semibold text-gray-900 mb-6">
                לעקוב אחרי כל חיפוש בזמן אמת
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                פיד חי של מה שקונים מקלידים, אילו חיפושים ממירים, ואיפה אתם מאבדים כוונה. לראות ביצועי חיפושים מורכבים מול פשוטים — בלי הגדרה.
              </p>
              <div className="space-y-4">
                <Bullet title="פיד חיפושים חי" body="לעקוב אחרי חיפושים בזמן שהם קורים, בכל מכשיר." />
                <Bullet
                  title="מורכב מול פשוט"
                  body="להבין את ההשפעה על ההכנסות מחיפושים סמנטיים — מיד."
                />
                <Bullet
                  title="אנליטיקת זמן"
                  body="שעות שיא, מגמות יומיות ועונתיות מובנות."
                />
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>היום</span>
                <span className="text-green-600 font-semibold">חי</span>
              </div>
              <div className="space-y-4">
                {[
                  { query: '«יין אדום לארוחת סטייק»', type: 'מורכב', value: '68% המרה' },
                  { query: '«cabernet»', type: 'פשוט', value: '45% המרה' },
                  { query: '«יין כשר לפסח»', type: 'מורכב', value: '72% המרה' },
                  { query: '«merlot»', type: 'פשוט', value: '38% המרה' },
                ].map((item) => (
                  <div key={item.query} className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900">{item.query}</p>
                    <div className="flex items-center justify-between mt-2 text-xs uppercase tracking-wide">
                      <span className="text-gray-500">{item.type}</span>
                      <span className="text-gray-900 font-semibold">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conversion Mapping */}
      <section className="py-24 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                המחשת משפך הרכישה
              </h3>
              <div className="space-y-6">
                {[
                  { label: 'סה״כ חיפושים', value: '2,324', percent: '100%', color: 'from-blue-500 to-blue-600' },
                  { label: 'נוסף לעגלה', value: '892', percent: '38.4%', color: 'from-purple-500 to-purple-600' },
                  { label: 'רכישות שהושלמו', value: '487', percent: '21.0%', color: 'from-emerald-500 to-emerald-600' },
                ].map((step) => (
                  <div key={step.label}>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>{step.label}</span>
                      <span className="font-semibold text-gray-900">{step.value}</span>
                    </div>
                    <div className={`h-10 rounded-lg bg-gradient-to-r ${step.color} text-white text-xs font-semibold flex items-center justify-center`}>
                      {step.percent}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-900">
                חיפושים מורכבים ממירים פי 2.3 יותר מחיפושים פשוטים.
              </div>
            </div>
            <div>
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">
                ייחוס הכנסות
              </p>
              <h2 className="text-4xl font-semibold text-gray-900 mb-6">
                לראות בדיוק מאיפה מגיעות ההכנסות
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                לעקוב אחרי כל חיפוש מכוונה ועד רכישה. לכמת כמה Semantix תורמת לשורה התחתונה
                ואילו חיפושים מניעים רווחיות.
              </p>
              <div className="space-y-4">
                <Bullet
                  title="מעקב מחיפוש לרכישה"
                  body="לקשר כל הזמנה לחיפוש שיצר אותה."
                />
                <Bullet
                  title="הכנסות לפי סוג חיפוש"
                  body="להשוות המרות והכנסות — מורכב מול פשוט — זה לצד זה."
                />
                <Bullet
                  title="ייחוס Semantix"
                  body="להבין את סך ההכנסות שנשמרו בזכות חיפוש סמנטי."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Insights */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">
                מודיעין מעשי
              </p>
              <h2 className="text-4xl font-semibold text-gray-900 mb-6">
                לא רק לראות נתונים — לקבל המלצות
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Semantix Brain אומר לכם מה לעשות הלאה: מה להכניס למלאי, מה לכתוב, איך לתקן ירידות בהמרות,
                ואיפה להכפיל.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 space-y-4">
                {insights.map((insight) => (
                  <div key={insight.title} className="p-4 bg-white border border-gray-100 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{insight.title}</p>
                    <p className="text-sm text-gray-600">{insight.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 text-white rounded-2xl p-8 flex flex-col gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-gray-400">סטרים חי</p>
                <h3 className="text-2xl font-semibold mt-2">פיד חיפושים</h3>
              </div>
              <div className="space-y-4 text-sm font-mono">
                {[
                  '14:02  «יין לבן יבש עד 100$»   →  נוסף לעגלה',
                  '14:05  «סט מתנה להורים»        →  חבילת upsell סמנטית',
                  '14:09  «רוזה אורגני לפיקניק»     →  אזהרת מלאי נמוך',
                  '14:11  «יין לערב פסטה»        →  הצעת תוכן',
                ].map((line) => (
                  <div key={line} className="py-2 border-b border-white/10 last:border-0">
                    {line}
                  </div>
                ))}
              </div>
              <div className="mt-auto text-xs text-gray-400 flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Webhook + API מוכנים
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-4">
            לפתוח את תובנות החיפוש שלכם
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            אנליטיקה בזמן אמת, המלצות אוטומטיות ותמונה ברורה של ROI — לצוותי מסחר דיגיטלי מודרניים.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              לגלות את הדשבורד
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-800 rounded-lg font-medium hover:border-gray-400 transition-colors"
            >
              {PRIMARY_CTA}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
