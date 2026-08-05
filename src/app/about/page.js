import Link from 'next/link';
import { PRIMARY_CTA, PRIMARY_CTA_HREF } from '../lib/marketing-copy';

export const metadata = {
  title: 'אודותינו | Semantix - Tal & Gal',
  description:
    'הכירו את Tal ו־Gal, מייסדי Semantix. שלוש שנים אנחנו חיים את חיפוש האתר במסחר אלקטרוני — מצילים שאילתות שנכשלו והופכים כוונה להכנסות.',
  alternates: {
    canonical: 'https://www.semantix.co.il/about',
  },
};

const FOUNDERS = [
  {
    name: 'Gal Paz',
    role: 'מייסד שותף ומנכ״ל',
    image: '/team/gal-paz-ceo.png',
    blurb:
      'אובססיבי לרגע שבו קונה מקליד בחיפוש — ומה קורה כשהחנות מפספסת. בונה את המוצר, את הדשבורדים ואת ההתקנות החיות המורכבות.',
  },
  {
    name: 'Tal Paz',
    role: 'מייסד שותף ו־COO',
    image: '/team/tal-paz-coo.png',
    blurb:
      'החצי השני של אותה אובססיה. הופך את המציאות בחנות למערכות שמחזירות ביקוש, מייחסות הכנסות ומשתלבות בלי לקרוע את הסטאק שלכם.',
  },
];

const BELIEFS = [
  {
    title: 'חיפוש הוא ערוץ הכנסות',
    body: 'לא ווידג׳ט נחמד. כל שאילתה שנכשלה היא קופה שקטה שמעולם לא התחילה.',
  },
  {
    title: 'כוונה מנצחת מילות מפתח',
    body: 'אנשים מחפשים כמו בני אדם — שגיאות כתיב, תחושות, מק״טים חצי־זכורים. החיפוש צריך לפגוש אותם שם.',
  },
  {
    title: 'להוכיח על תעבורה חיה',
    body: 'אנחנו מעדיפים להראות עגלות שהוחזרו בחנות שלכם מאשר מצגת מלוטשת של השערות.',
  },
];

export default function AboutPage() {
  return (
    <main className="bg-[#faf9f7] text-gray-900" dir="rtl">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(124,58,237,0.12),transparent_50%),radial-gradient(ellipse_at_90%_10%,rgba(16,185,129,0.10),transparent_45%),linear-gradient(180deg,#fff_0%,#faf9f7_100%)]" />
        <div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-violet-700/80">
            אודותינו
          </p>
          <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-gray-950 sm:text-5xl lg:text-6xl">
            אנחנו Semantix.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
            בשנים האחרונות כל מה שאנחנו אוכלים, נושמים ועושים זה אופטימיזציה של מכירות דרך
            חיפוש באתר. Semantix היא האובססיה הזאת — שהפכה למוצרים שסוחרים יכולים להעלות תוך
            דקות ולמדוד בהכנסות.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="border-b border-black/5 bg-white py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              על Semantix
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-gray-950 sm:text-4xl">
              הסיפור שלנו.
            </h2>
            <p className="mt-4 text-xl font-medium tracking-tight text-gray-800 sm:text-2xl">
              שנים בתוך שורת החיפוש.
            </p>
            <div className="mt-6 space-y-5 text-base leading-8 text-gray-600 sm:text-lg sm:leading-8">
              <p>
                ראינו שוב ושוב את אותו דליפה: קונים שכבר רצו לקנות — מקלידים כוונה אמיתית —
                נתקלים בתוצאות ריקות, דירוגים מוזרים או קיר של מוצרים לא רלוונטיים. החיפוש
                המובנה משך כתפיים. ההכנסות הלכו.
              </p>
              <p>
                אז בנינו את Semantix בדיוק במקום שבו השבר קורה. קודם כ־{' '}
                <Link href="/search-saver" className="font-medium text-violet-700 underline-offset-4 hover:underline">
                  Search Saver
                </Link>{' '}
                להחזרת אפס־תוצאות, ואחר כך כ־{' '}
                <Link href="/search-discovery" className="font-medium text-violet-700 underline-offset-4 hover:underline">
                  Semantix Search
                </Link>{' '}
                כשחנויות רוצות את המנוע ההיברידי המלא — תמיד עם ייחוס שאפשר באמת לסמוך עליו.
              </p>
              <p>
                היום אנחנו עובדים עם סוחרים שאכפת להם מהאמצע השקט של המשפך: השאילתה שכמעט
                הפכה לעגלה. זה עדיין מה שאנחנו מדברים עליו בארוחת ערב.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-[#0f0f12] px-8 py-10 text-white shadow-xl sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
            <p className="relative font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
              מה שאנחנו רודפים אחריו
            </p>
            <p className="relative mt-5 text-2xl font-semibold tracking-[-0.03em] leading-snug sm:text-3xl">
              ״שכל חיפוש ירגיש כאילו החנות הבינה אותך.״
            </p>
            <p className="relative mt-6 text-sm leading-7 text-white/65">
              פחות גיליונות מילים נרדפות. יותר ביקוש שהוחזר. דשבורדים שמראים כסף, לא קליקים
              לנוי.
            </p>
          </div>
        </div>
      </section>

      {/* Founders — directly under the story block */}
      <section className="relative border-b border-black/5 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              האנשים מאחורי Semantix
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-gray-950 sm:text-4xl">
              הכירו את המייסדים.
            </h2>
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-12">
            {FOUNDERS.map((person, index) => (
              <article
                key={person.name}
                className="group flex flex-col items-start"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-violet-400/30 via-transparent to-emerald-300/30 opacity-80 blur-md transition duration-500 group-hover:opacity-100" />
                  <div className="relative h-44 w-44 overflow-hidden rounded-full shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] ring-4 ring-white sm:h-52 sm:w-52">
                    <img
                      src={person.image}
                      alt={person.name}
                      className="h-full w-full scale-[1.06] object-cover"
                    />
                  </div>
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight text-gray-950">
                  {person.name}
                </h3>
                <p className="mt-1 text-sm font-medium tracking-[0.04em] text-violet-700">
                  {person.role}
                </p>
                <p className="mt-4 max-w-md text-base leading-7 text-gray-600">{person.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Beliefs */}
      <section className="border-b border-black/5 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            איך אנחנו חושבים
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-gray-950 sm:text-4xl">
            כמה דברים שלא נתפשר עליהם.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {BELIEFS.map((item) => (
              <div key={item.title} className="border-t border-black/10 pt-6">
                <h3 className="text-lg font-semibold tracking-tight text-gray-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
              רוצים לראות את זה בחנות שלכם?
            </h2>
            <p className="mt-3 text-gray-600">
              נעבור יחד על תעבורת החיפוש האמיתית שלכם — כולל השאילתות שבשלב הזה לא מובילות
              לשום מקום.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={PRIMARY_CTA_HREF}
              className="inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {PRIMARY_CTA}
            </Link>
            <Link
              href="/case-studies"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
            >
              ראו תוצאות לקוחות
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
