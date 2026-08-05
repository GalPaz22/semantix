import Link from 'next/link';
import { TOOLS } from '../lib/tools-content';

export const metadata = {
  title: 'כלים חינמיים | Semantix',
  description: 'כלים אינטראקטיביים חינמיים לחיפוש במסחר אלקטרוני — החל ממחשבון ההכנסות מחיפושים ללא תוצאות.',
  alternates: {
    canonical: 'https://www.semantix.co.il/tools',
  },
};

export default function ToolsHubPage() {
  return (
    <main dir="rtl" className="bg-white">
      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            כלים
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            כלים חינמיים לחיפוש במסחר אלקטרוני.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            בלי הרשמה. כל מספר מגיע מהנתונים שלכם — לא מממוצע תעשייה מומצא.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const isBuilt = tool.status === 'built';
            const cardContent = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">{tool.name}</h2>
                  {!isBuilt && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      בקרוב
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">{tool.description}</p>
              </>
            );

            return isBuilt ? (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-purple-300 hover:bg-purple-50/40"
              >
                {cardContent}
              </Link>
            ) : (
              <div key={tool.slug} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                {cardContent}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
