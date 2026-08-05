const STACK_POINTS = [
  'שומרים על החנות כמו שהיא',
  'בלי עיצוב מחדש ובלי להסביר ללקוחות משהו חדש',
  'רואים השפעה מהר',
];

export default function SearchSaverWhyDifferent({
  eyebrow = 'למה זה שונה מהחלפת החיפוש',
  title = 'למה מוסיפים Search Saver לפני שמחליפים חיפוש',
  intro = 'לרוב החנויות לא צריך להחליף מנוע קודם. צריך להחזיר את רגעי החיפוש הריק שכבר עולים בכסף.',
  variant = 'landing',
}) {
  if (variant === 'home') {
    return (
      <section dir="rtl" className="border-t border-gray-100 bg-[#fafafb] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
                {eyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
                {title}
              </h2>
              <p className="mt-5 text-lg leading-8 text-gray-600">{intro}</p>
            </div>

            <div className="border-t border-gray-200 pt-5">
              <div className="space-y-3 why-points">
                {STACK_POINTS.map((point, index) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 border-b border-gray-200 pb-3 text-sm font-medium text-gray-700 last:border-b-0 last:pb-0"
                  >
                    <span
                      className="why-dot mt-1.5 h-2.5 w-2.5 rounded-full bg-purple-500"
                      style={{ animationDelay: `${index * 0.4}s` }}
                    />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" className="bg-[#f6f6f8] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
              {eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
              {title}
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-600">{intro}</p>

          </div>

          <div className="space-y-4">
            {[
              {
                title: 'שורת החיפוש נשארת כמו שהיא',
                body: 'הלקוחות ממשיכים לחפש באותה חנות, באותה חוויה.',
              },
              {
                title: 'Search Saver מחזיר חיפושים ריקים',
                body: 'נכנס לפעולה רק כשהחיפוש מחזיר ריק.',
              },
              {
                title: 'רואים השפעה על ההכנסות מהר',
                body: 'בדשבורד רואים כמה חיפושים הוחזרו וכמה הכנסות חזרו.',
              },
              {
                title: 'בלי פרויקט החלפת מנוע',
                body: 'מחזירים חיפושים בלי תוצאות בלי מחזור הטמעה ארוך.',
              },
            ].map((point) => (
              <div
                key={point.title}
                className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              >
                <h3 className="text-xl font-semibold text-gray-900">{point.title}</h3>
                <p className="mt-3 text-base leading-7 text-gray-600">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
