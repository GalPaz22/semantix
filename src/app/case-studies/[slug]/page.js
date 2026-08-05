import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CASE_STUDIES,
  getAllCaseStudySlugs,
  getCaseStudy,
} from '../../lib/case-studies';
import { PRIMARY_CTA, PRIMARY_CTA_HREF } from '../../lib/marketing-copy';

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const study = getCaseStudy(params.slug);
  if (!study) {
    return { title: 'פרויקט | Semantix' };
  }

  return {
    title: `פרויקט: ${study.name} | Semantix`,
    description: study.summary,
    alternates: {
      canonical: `https://www.semantix.co.il/case-studies/${study.slug}`,
    },
  };
}

export default function CaseStudyPage({ params }) {
  const study = getCaseStudy(params.slug);
  if (!study) {
    notFound();
  }

  const others = CASE_STUDIES.filter((entry) => entry.slug !== study.slug);

  return (
    <main className="bg-white" dir="rtl">
      <section className="border-b border-gray-200 px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/case-studies"
            className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            → כל הפרויקטים
          </Link>
          <p className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            {study.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-black sm:text-5xl">
            {study.headline}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">{study.summary}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-500">
            <span className="rounded-full border border-gray-200 px-3 py-1">{study.product}</span>
            <span className="rounded-full border border-gray-200 px-3 py-1">{study.period}</span>
            <span className="rounded-full border border-gray-200 px-3 py-1">{study.industry}</span>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-gray-900 pt-6">
            <p className="text-5xl font-semibold tracking-[-0.03em] text-gray-900 sm:text-6xl">
              {study.heroMetric.value}
            </p>
            <p className="mt-3 text-sm font-semibold text-purple-700">{study.heroMetric.label}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{study.heroMetric.note}</p>
            <p className="mt-4 text-sm text-gray-500">{study.periodNote}</p>
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
            {study.metrics.map((metric) => (
              <div key={metric.label} className="border-t border-gray-200 pt-5">
                <p className="text-3xl font-semibold tracking-[-0.02em] text-gray-900">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-semibold text-gray-800">{metric.label}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              הבעיה
            </p>
            <p className="mt-4 text-lg leading-8 text-gray-700">{study.problem}</p>
          </div>
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              מה Search Saver עשה
            </p>
            <p className="mt-4 text-lg leading-8 text-gray-700">{study.solution}</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 sm:gap-5">
            <p className="min-w-0 font-mono text-[10px] font-semibold uppercase leading-snug tracking-[0.16em] text-gray-400 sm:text-xs sm:tracking-[0.22em]">
              מה הופיע בנתונים
            </p>
            <div className="hidden h-px min-w-[2rem] flex-1 bg-gray-200 sm:block" />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {study.patterns.map((pattern) => (
              <div key={pattern.title} className="border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900">{pattern.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{pattern.body}</p>
              </div>
            ))}
          </div>

          <ul className="mt-12 space-y-3 border-t border-gray-200 pt-10">
            {study.takeaways.map((takeaway) => (
              <li key={takeaway} className="flex gap-3 text-base leading-7 text-gray-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-600" />
                {takeaway}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-gray-200 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            מתודולוגיה
          </p>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-gray-500">{study.methodology}</p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-gray-400">
            הסיכום הציבורי הזה אינו כולל מוצרי קטלוג, מק״טים או תמחור לפי פריט.
          </p>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50 px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                ראו מה Search Saver יכול להחזיר עבורכם.
              </h2>
              <p className="mt-2 text-gray-600">
                סיור קצר בתעבורת אפס־התוצאות שלכם — אותה עדשת החזרה כמו בפרויקטים האלה.
              </p>
            </div>
            <Link
              href={PRIMARY_CTA_HREF}
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-900"
            >
              {PRIMARY_CTA}
            </Link>
          </div>

          {others.length ? (
            <div className="border-t border-gray-200 pt-10">
              <p className="text-sm font-semibold text-gray-500">עוד תוצאות</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {others.map((other) => (
                  <Link
                    key={other.slug}
                    href={`/case-studies/${other.slug}`}
                    className="border border-gray-200 bg-white p-5 transition hover:border-gray-900"
                  >
                    <p className="text-lg font-semibold text-gray-900">{other.name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {other.heroMetric.value} · {other.heroMetric.label}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
