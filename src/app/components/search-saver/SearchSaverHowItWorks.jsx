import SearchSaverModesShowcase from './SearchSaverModesShowcase';

const SUMMARY_STEPS = [
  {
    title: 'מזהה חיפושים בלי תוצאות',
    detail: 'תופס חיפושים שהחזירו אפס מוצרים.',
  },
  {
    title: 'מבין מה הלקוח רצה',
    detail: 'קורא את הכוונה — לא רק התאמה מדויקת למילה.',
  },
  {
    title: 'מחזיר תוצאות במקום',
    detail: 'ממלא את העמוד הריק בלי לשנות את החנות.',
  },
];

const SIMPLE_STEPS = [
  {
    title: 'חיבור הקטלוג',
    detail:
      'Semantix קורא מוצרים, קטגוריות, מאפיינים והתנהגות חיפוש מהחנות.',
  },
  {
    title: 'זיהוי חיפושים בלי תוצאות',
    detail:
      'Search Saver עוקב אחרי החיפוש הקיים ונכנס לפעולה רק כשחיפוש מחזיר ריק.',
  },
  {
    title: 'החזרת מוצרים רלוונטיים',
    detail:
      'מוצרים רלוונטיים מוחזרים בתוך חוויית החיפוש הקיימת — עם מעקב בדשבורד.',
  },
];

function SummarySteps({ steps }) {
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-3">
      {steps.map((step, index) => (
        <div key={step.title} className="border-t border-gray-200 pt-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
              {index + 1}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{step.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LayerVisual() {
  return (
    <div className="rounded-[32px] border border-gray-200 bg-[#fbfbfc] p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] sm:p-8">
      <div className="rounded-[26px] border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-[#f8f8f9] px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">שורת החיפוש הקיימת</p>
            <p className="mt-1 text-sm font-medium text-gray-700">תוצאות החיפוש ממשיכות להופיע בחנות כרגיל.</p>
          </div>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-500">
            החנות ללא שינוי
          </span>
        </div>

        <div className="mx-auto my-4 flex w-full max-w-[460px] items-center justify-center">
          <div className="h-8 w-px bg-gray-200" />
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-700">שכבת Search Saver</p>
              <p className="mt-1 text-sm text-gray-700">עולה בכ־5 דקות ונכנסת לפעולה רק כשהחיפוש מחזיר ריק.</p>
            </div>
            <span className="rounded-full border border-purple-200 bg-white px-3 py-1 text-[11px] font-semibold text-purple-700">
              התערבות בזמן אמת
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailedStory() {
  return (
    <>
      <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
            איך השכבה משתלבת
          </p>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-[2rem]">
            Search Saver לא מחליף את שורת החיפוש. הוא יושב מעליה.
          </h3>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            החנות נשארת כמו שהיא. Search Saver עוקב אחרי חיפושים בלי תוצאות
            ונכנס לפעולה רק כשהחיפוש מחזיר ריק.
          </p>

          <div className="mt-8 space-y-4">
            {[
              'עולה תוך דקות — לא פרויקט עיצוב.',
              'הלקוח נשאר באותה שורת חיפוש ואותו עמוד תוצאות.',
              'עובד רק על חיפושים בלי תוצאות — לא נוגע בתוצאות תקינות.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-gray-200 bg-[#fbfbfc] px-5 py-4 text-sm leading-6 text-gray-600">
                {item}
              </div>
            ))}
          </div>
        </div>

        <LayerVisual />
      </div>

      <SearchSaverModesShowcase />
    </>
  );
}

function SimpleStory() {
  return (
    <>
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
          איך זה עובד
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
          שלושה שלבים להחזרת חיפושים בלי תוצאות.
        </h2>
      </div>
      <SummarySteps steps={SIMPLE_STEPS} />
      <div className="mt-12">
        <LayerVisual />
      </div>
    </>
  );
}

export default function SearchSaverHowItWorks({
  id = 'how-search-saver-works',
  variant = 'detailed',
}) {
  return (
    <section dir="rtl" id={id} className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {variant === 'simple' ? <SimpleStory /> : <DetailedStory />}
      </div>
    </section>
  );
}
