const FAQS = [
  {
    question: 'האם Search Saver מחליף את החיפוש שלנו?',
    answer:
      'לא. הוא עובד כשכבה מעל החיפוש הקיים — מחזירים חיפושים בלי תוצאות בלי לבנות מחדש את החיפוש בחנות.',
  },
  {
    question: 'זה צ\'אטבוט?',
    answer:
      'לא. הלקוח נשאר בשורת החיפוש ובעמוד התוצאות שלכם. אין צ\'אט נפרד.',
  },
  {
    question: 'אילו חיפושים הוא מחזיר?',
    answer:
      'רק חיפושים בלי תוצאות. Search Saver לא מדרג מחדש תוצאות קיימות ולא מזריק מוצרים לעמודים תקינים.',
  },
  {
    question: 'כמה זמן לוקחת ההטמעה?',
    answer:
      'קצר. בדרך כלל מחברים קטלוג ומוסיפים סקריפט — בלי שינוי עיצוב ובלי פרויקט החלפת מנוע.',
  },
  {
    question: 'באילו פלטפורמות אתם תומכים?',
    answer: 'Shopify, WooCommerce וחנויות איקומרס מותאמות.',
  },
  {
    question: 'איך מודדים את ההשפעה?',
    answer:
      'הדשבורד עוקב אחרי חיפושים שהוחזרו, מוצרים שהוחזרו, שיעור החזרה והכנסות שיוחסו להחזרה.',
  },
];

export default function SearchSaverFAQ({ variant = 'default' }) {
  const faqs = variant === 'compact' ? FAQS.slice(0, 3) : FAQS;

  return (
    <section dir="rtl" className="bg-[#f6f6f8] py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
            שאלות נפוצות
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            מה שואלים לפני העלייה לאוויר.
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-[24px] border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
              <p className="mt-3 text-base leading-7 text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
