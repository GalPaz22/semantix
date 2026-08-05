const IMPLEMENTATION_POINTS = [
  'עובד עם שורת החיפוש הקיימת',
  'בלי עיצוב מחדש לחנות',
  'בלי צ\'אטבוט או מסע לקוח חדש',
  'הטמעה קלה',
  'Shopify, WooCommerce וחנויות מותאמות',
  'דשבורד החזרה כלול',
];

const FLOW_STEPS = [
  'חיבור קטלוג',
  'הוספת סקריפט',
  'מעקב אחרי חיפושים בלי תוצאות',
  'הפעלת החזרה',
];

export default function SearchSaverInvisibleLayer() {
  return (
    <section dir="rtl" id="implementation" className="border-t border-gray-100 bg-[#fafafb] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
            הטמעה
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            עולים לאוויר בלי לבנות חיפוש מחדש.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            רוב החנויות מתחילות עם Search Saver לפני שהן שוקלות להחליף מנוע חיפוש.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IMPLEMENTATION_POINTS.map((point) => (
            <div
              key={point}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-700"
            >
              {point}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[28px] border border-gray-200 bg-white p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-700">
            תהליך ההטמעה
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {FLOW_STEPS.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-gray-700">
                  {step}
                </span>
                {index < FLOW_STEPS.length - 1 ? (
                  <span className="hidden text-gray-300 sm:inline" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Shopify', 'WooCommerce', 'חנויות מותאמות'].map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-gray-200 bg-[#fbfbfc] px-3 py-1.5 text-xs font-medium text-gray-600"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
