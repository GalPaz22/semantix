import Link from 'next/link';
import { RESEARCH_ITEMS } from '../lib/research-content';

export const metadata = {
  title: 'מחקר | Semantix',
  description: 'נתונים והערות שדה מפריסות Semantix אמיתיות — מסומנים בבירור כנקודות נתונים מחנות בודדת, לא ממוצעי תעשייה, עד שהמדגם תומך בטענה.',
  alternates: {
    canonical: 'https://www.semantix.co.il/research',
  },
};

export default function ResearchHubPage() {
  return (
    <main dir="rtl" className="bg-white">
      <section className="border-b border-gray-200 px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            מחקר
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            מספרים אמיתיים, עם תיוג כנה.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            מה שאנחנו מפרסמים כאן מתחיל כהערות שדה מפריסות בודדות מאומתות —
            לא ממוצעי תעשייה — עד שהמדגם באמת תומך בטענה.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
          {RESEARCH_ITEMS.map((item) => (
            <Link
              key={item.slug}
              href={`/research/${item.slug}`}
              className="rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-purple-300 hover:bg-purple-50/40"
            >
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                {item.type}
              </span>
              <h2 className="mt-3 font-semibold text-gray-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
