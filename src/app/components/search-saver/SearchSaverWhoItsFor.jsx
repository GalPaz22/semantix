const VERTICALS = [
  {
    title: 'יין ומשקאות',
    queries: [
      'מתנה לחובב בורדו',
      'יין אדום לסטייק עד 150 ש״ח',
      'מבעבע יבש לארוחת ערב',
    ],
  },
  {
    title: 'תכשיטים',
    queries: [
      'שרשרת זהב ליום יום',
      'מתנה ליום נישואין עד 1000',
      'טבעת מינימלית לעבודה',
    ],
  },
  {
    title: 'בית ולייפסטייל',
    queries: [
      'מנורה לחדר שינה',
      'ספה קטנה לדירת סטודיו',
      'שטיח חם לסלון',
    ],
  },
  {
    title: 'יופי וטיפוח',
    queries: [
      'קרם ליובש ורגישות',
      'מארז מתנה לעור שמן',
      'SPF קל ליום יום',
    ],
  },
];

export default function SearchSaverWhoItsFor() {
  return (
    <section dir="rtl" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
            למי זה מתאים
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            בנוי לחנויות שבהן חיפושים מורכבים לעיתים קרובות מחזירים ריק.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            אם לקוחות מחפשים לפי שימוש, אירוע, תקציב או סגנון — והמנוע מגיע לריק
            — Search Saver מחזיר את החיפושים האלה מהקטלוג.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VERTICALS.map((vertical) => (
            <div
              key={vertical.title}
              className="rounded-[28px] border border-gray-200 bg-[#fbfbfc] p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900">{vertical.title}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {vertical.queries.map((query) => (
                  <span
                    key={query}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600"
                  >
                    {query}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
