export default function SearchSaverBeforeAfter() {
  return (
    <section id="before-after" className="bg-white py-20 sm:py-24" dir="rtl">
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
          לפני ואחרי
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
          אותה שורת חיפוש. תוצאה אחרת.
        </h2>
        <div className="mt-6 space-y-2 text-lg leading-8 text-gray-600">
          <p>
            <span className="font-semibold text-gray-900">לפני Search Saver:</span> חיפוש ריק
            בעמוד החיפוש הרגיל של החנות.
          </p>
          <p>
            <span className="font-semibold text-gray-900">אחרי Search Saver:</span> אותה שורת
            חיפוש ואותו עמוד — עם מוצרים שהוחזרו מאותו חיפוש ריק.
          </p>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          בהדגמה למעלה רואים את המעבר מחיפוש ריק למוצרים שהוחזרו.
        </p>
      </div>
    </section>
  );
}
