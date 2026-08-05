const ROWS = [
  {
    option: 'בניית חיפוש מחדש',
    time: 'שבועות / חודשים',
    uxRisk: 'גבוה',
    visibility: 'איטי',
    bestFor: 'החלפת מנוע חיפוש מלאה',
    highlight: false,
  },
  {
    option: 'הוספת צ\'אטבוט',
    time: 'בינוני',
    uxRisk: 'בינוני',
    visibility: 'לא ברור',
    bestFor: 'מסעות שירות',
    highlight: false,
  },
  {
    option: 'מילים נרדפות / כללים ידניים',
    time: 'מתמשך',
    uxRisk: 'נמוך',
    visibility: 'מוגבל',
    bestFor: 'תיקון חיפושים ידועים',
    highlight: false,
  },
  {
    option: 'Search Saver',
    time: 'מהיר',
    uxRisk: 'נמוך',
    visibility: 'דשבורד הכנסות שהוחזרו',
    bestFor: 'החזרת הכנסות מחיפושים בלי תוצאות',
    highlight: true,
  },
];

export default function SearchSaverComparison() {
  return (
    <section dir="rtl" className="bg-[#f6f6f8] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
            למה לא פשוט להחליף את החיפוש?
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            השוו את האפשרויות לפני שבונים מחדש.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            לרוב החנויות לא צריך מנוע חיפוש חדש. צריך להחזיר הכנסות מחיפושים
            שמחזירים ריק — בתוך החוויה שכבר רצה.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto rounded-[28px] border border-gray-200 bg-white">
          <table className="min-w-[720px] w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-[0.16em] text-gray-400">
                <th className="px-5 py-4 font-semibold">אפשרות</th>
                <th className="px-5 py-4 font-semibold">זמן לעלייה</th>
                <th className="px-5 py-4 font-semibold">סיכון לחנות</th>
                <th className="px-5 py-4 font-semibold">נראות להכנסות</th>
                <th className="px-5 py-4 font-semibold">מתאים ל</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.option}
                  className={
                    row.highlight
                      ? 'border-b border-purple-200 bg-purple-50 last:border-b-0'
                      : 'border-b border-gray-100 last:border-b-0'
                  }
                >
                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">{row.option}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{row.time}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{row.uxRisk}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{row.visibility}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
