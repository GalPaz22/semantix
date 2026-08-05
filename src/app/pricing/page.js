import Link from 'next/link';

export const metadata = {
  title: 'תמחור | Semantix',
  description:
    'תמחור פשוט ושקוף ל־Search Saver — התחילו בחינם עם 30 חיפושים שהוחזרו בחודש, ושדרגו כשהחנות גדלה.',
  alternates: {
    canonical: 'https://www.semantix.co.il/pricing',
  },
};

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'לתמיד',
    tagline: 'בלי כרטיס אשראי.',
    features: [
      'ראות מלאה לכל חיפוש ללא תוצאות',
      'עד 30 החזרות אוטומטיות בחודש',
      'חנות אחת',
      'תמיכה באימייל'
    ],
    cta: { label: 'התחילו עכשיו', href: '/start' },
    popular: false
  },
  {
    name: 'Starter',
    price: '$79',
    cadence: '/חודש',
    tagline: 'לחנויות בצמיחה.',
    features: [
      'עד 1,000 חיפושים בחודש',
      'החזרות ללא הגבלה במסגרת התוכנית',
      'חנות אחת',
      'תמיכה באימייל'
    ],
    cta: { label: 'התחילו עכשיו', href: '/start' },
    popular: false
  },
  {
    name: 'Growth',
    price: '$199',
    cadence: '/חודש',
    tagline: 'לרוב החנויות הפעילות.',
    features: [
      'עד 5,000 חיפושים בחודש',
      'החזרות ללא הגבלה במסגרת התוכנית',
      'תמיכה בעדיפות',
      'סיכום החזרות שבועי'
    ],
    cta: { label: 'התחילו עכשיו', href: '/start' },
    popular: true
  },
  {
    name: 'Scale',
    price: '$449',
    cadence: '/חודש',
    tagline: 'לחנויות עם תעבורה גבוהה.',
    features: [
      'עד 20,000 חיפושים בחודש',
      'החזרות ללא הגבלה במסגרת התוכנית',
      'תמיכה ב־Slack',
      'מספר חנויות'
    ],
    cta: { label: 'התחילו עכשיו', href: '/start' },
    popular: false
  }
];

function CheckIcon({ className = 'text-violet-600' }) {
  return (
    <svg
      className={`mt-0.5 h-4 w-4 shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <main className="bg-[#faf9f7] text-gray-900" dir="rtl">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(124,58,237,0.12),transparent_50%),radial-gradient(ellipse_at_90%_10%,rgba(16,185,129,0.10),transparent_45%),linear-gradient(180deg,#fff_0%,#faf9f7_100%)]" />

        <div className="relative mx-auto max-w-4xl px-6 pb-14 pt-20 text-center sm:px-8 sm:pb-20 sm:pt-28">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-violet-700/80">
            תמחור
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-gray-950 sm:text-5xl">
            התחילו בחינם. שלמו כשזה כבר מחזיר את עצמו.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
            כל תוכנית כוללת את דשבורד הייחוס המלא, כך שתמיד תראו בדיוק מה Search Saver
            החזיר — לא ספירת קליקים לנוי.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-[1.75rem] border px-6 py-6 ${
                  plan.popular
                    ? 'border-violet-300 bg-white shadow-[0_25px_60px_-25px_rgba(124,58,237,0.35)]'
                    : 'border-black/5 bg-white shadow-sm'
                }`}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
                    הכי פופולרי
                  </span>
                ) : null}

                <h3 className="text-lg font-semibold tracking-tight text-gray-950">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-[-0.03em] text-gray-950">
                    {plan.price}
                  </span>
                  <span className="text-sm font-medium text-gray-500">{plan.cadence}</span>
                </div>
                <div className="min-h-[220px]">
                  <p className="mt-2 text-sm leading-6 text-gray-600">{plan.tagline}</p>

                  <ul className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <CheckIcon />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={plan.cta.href}
                  className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                    plan.popular
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'bg-gray-950 text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta.label}
                </Link>
              </div>
            ))}

            {/* Full Semantix Search — the full product, not just Search Saver at scale */}
            <div className="relative flex flex-col overflow-hidden rounded-[1.75rem] border border-violet-400/30 bg-[#0f0f12] px-6 py-6 text-white shadow-[0_25px_60px_-25px_rgba(124,58,237,0.55)]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-14 -left-6 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" />

              <span className="relative inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">
                החבילה המלאה
              </span>
              <h3 className="relative mt-3 text-lg font-semibold tracking-tight">Full Semantix Search</h3>
              <div className="relative mt-2 flex items-baseline gap-1">
                <span className="text-sm text-white/60">החל מ־</span>
                <span className="text-4xl font-bold tracking-[-0.03em]">$1,499</span>
                <span className="text-sm font-medium text-white/60">/חודש</span>
              </div>
              <p className="relative mt-2 text-sm leading-6 text-white/70">
                כל המנוע ההיברידי, מכוון אליכם.
              </p>

              <ul className="relative mt-5 flex-1 space-y-2">
                {[
                  'חיפוש היברידי רב־שכבתי מלא',
                  'פרסונליזציה בזמן אמת',
                  'מרצ׳נדייזינג וקידום',
                  'תהליכי חיפוש אג׳נטיים',
                  'שאילתות חודשיות ללא הגבלה',
                  'CSM ייעודי ו־SLA'
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-white/85">
                    <CheckIcon className="text-violet-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className="relative mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100"
              >
                דברו עם המכירות
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-black/5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6 sm:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            שאלות
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-gray-950">
            כמה דברים שאנשים שואלים.
          </h2>

          <div className="mt-10 space-y-8">
            <div className="border-t border-black/10 pt-6">
              <h3 className="text-base font-semibold tracking-tight text-gray-950">
                מה נחשב ״חיפוש שהוחזר״?
              </h3>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                קונה מחפש, החיפוש המובנה בחנות מחזיר אפס תוצאות, ו־Search Saver מציג מוצר
                שעליו הם לוחצים או מוסיפים לעגלה. רק מעורבות אמיתית שמיוחסת נספרת — לא נפח
                שאילתות גולמי.
              </p>
            </div>
            <div className="border-t border-black/10 pt-6">
              <h3 className="text-base font-semibold tracking-tight text-gray-950">
                צריך כרטיס אשראי לתוכנית Free?
              </h3>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                לא. נכנסים, מחברים את החנות, ואתם באוויר. תוכנית Free נשארת חינמית — אין
                שעון ניסיון שסופר לאחור.
              </p>
            </div>
            <div className="border-t border-black/10 pt-6">
              <h3 className="text-base font-semibold tracking-tight text-gray-950">
                אפשר לשנות תוכנית אחר כך?
              </h3>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                כן — לשדרג או להוריד בכל רגע כשנפח החיפוש החודשי משתנה. תמיד נמליץ על
                התוכנית הקטנה ביותר שמתאימה לתעבורה שלכם.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-black/5 bg-white py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
              ראו כמה עולים לכם החיפושים ללא תוצאות.
            </h2>
            <p className="mt-3 text-gray-600">
              שתי דקות להתקנה. חינם לתמיד, עד 30 החזרות בחודש.
            </p>
          </div>
          <Link
            href="/start"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            התחילו בחינם
          </Link>
        </div>
      </section>
    </main>
  );
}
