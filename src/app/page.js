'use client';

import React, { useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ImageCarousel from './components/ImageCarousel';
import SemantixBrainDemo from './components/SemantixBrainDemo';
import ZeroResultRecoveryDemo from './components/homepage/ZeroResultRecoveryDemo';
import NoisyResultCorrectionDemo from './components/homepage/NoisyResultCorrectionDemo';
import PersonalizedRerankDemo from './components/homepage/PersonalizedRerankDemo';
import ProductBoostDemo from './components/homepage/ProductBoostDemo';
import SearchSaverAnimation from './components/search-saver/SearchSaverAnimation';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const faqs = [
  {
    question: 'כמה זמן לוקח להתחיל?',
    answer:
      'רוב החנויות באוויר תוך פחות מ-5 דקות. מתקינים פלאגין קל, מחברים את החנות, ו-Search Saver מתחיל לעבוד מיד.',
  },
  {
    question: 'האם זה מחליף את החיפוש הקיים שלי?',
    answer:
      'לא. Search Saver משתלב ישירות בשורת החיפוש הקיימת ומציג תוצאות בתוך הגריד של האתר. כשהחיפוש הרגיל עובד טוב, Search Saver שקוף לגמרי. הוא נכנס לפעולה רק כשצריך.',
  },
  {
    question: 'איך זה עובד מבפנים?',
    answer:
      'המערכת מבינה את הכוונה מאחורי החיפוש, לא רק את המילים. היא מזהה שגיאות כתיב, ניסוחים שונים ושמות לא מדויקים, ומציפה מוצרים רלוונטיים מתוך הקטלוג הקיים שלכם.',
  },
  {
    question: 'אילו תוצאות אפשר לצפות?',
    answer:
      'הלקוחות שלנו רואים בדרך כלל הכנסות מוחזרות של מעל $40K, מעל 40,000 חיפושים שניצלו, וירידה משמעותית בנטישה מחיפושים כושלים. אפשר למדוד הוספות לעגלה ורכישות שהוחזרו מהיום הראשון.',
  },
];

const HomePage = () => {
  const dashboardRef = useRef(null);

  return (
    <div className="relative w-full overflow-x-hidden bg-white">
      <Head>
        <meta name="robots" content="noimageindex" />
        <meta name="googlebot" content="noimageindex" />
      </Head>

      {/* ── HERO ── */}
      <section className="pt-8 sm:pt-16 pb-12 sm:pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(141,92,255,0.12),_transparent_55%)]" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Copy - right side in RTL (first child) */}
            <div className="max-w-2xl" dir="rtl">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-100 rounded-full mb-6">
               
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-4xl font-semibold mb-6 leading-[1.1] tracking-tight text-gray-900">
             מנוע החיפוש הוא מנוע המכירות שלכם
              </h1>

              <p className="text-xl sm:text-2xl text-gray-600 mb-6 leading-relaxed">
                Search Saver משתלב ישירות בחיפוש הקיים ומציל מכירות שמסתיימות בנטישה.
                הוא מבין את כוונת הלקוח ואת הטעם האישי שלו, ומקדם את המוצרים שאתם רוצים למכור.
              </p>

              <p className="text-lg text-gray-500 mb-8">
              בלי לשנות כלום בממשק הקיים, ובלי התקנה ארוכה ומסובכת- תוצאות רלוונטיות שימירו כבר מהיום הראשון.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-3">
             <Link
  href="/contact"
  className="group relative flex items-center justify-center overflow-hidden rounded-sm border border-transparent bg-[#171a20] px-12 py-3 text-sm font-medium tracking-widest text-white transition-all duration-500 ease-in-out hover:bg-white hover:text-black hover:shadow-[0_8px_16px_rgba(0,0,0,0.1)] uppercase"
>
  <span className="relative z-10 transition-colors duration-500 group-hover:text-black">
   איך זה עובד?
  </span>
  {/* אפקט עדין של רקע שמתמלא או משתנה - אופציונלי */}
  <div className="absolute inset-0 z-0 bg-white opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
</Link>
              
              </div>

              <p className="mt-6 text-sm text-gray-400">
                מדדו הוספות לעגלה ורכישות שהוחזרו מהיום הראשון.
              </p>
            </div>

            {/* Ring animation - left side in RTL (second child) */}
            <div className="hidden lg:flex justify-center">
              <SearchSaverAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* ── BRAND CAROUSEL ── */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <ImageCarousel />
        </div>
      </section>

      {/* ── FEATURE 1: ZERO RESULT RECOVERY ── */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-xl" dir="rtl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-purple-700">01</span>
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide">שכבה ראשונה</p>
                  <p className="text-xs text-gray-500">הבנת כוונת חיפוש</p>
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-gray-900">
                כשהחיפוש מחזיר אפס תוצאות
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                לקוח מחפש משהו שהמנוע הקיים לא מזהה ורואה &ldquo;אין תוצאות&rdquo;.
                Search Saver נכנס לפעולה, מבין את הכוונה מאחורי החיפוש ומציף מוצרים רלוונטיים
                ישירות בתוך גריד התוצאות הקיים.
              </p>
              <div className="grid gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="font-semibold text-gray-900 mb-1">תומך בשפה חופשית</p>
                  <p className="text-sm text-gray-600">
                    לא מילות מפתח. הלקוח כותב מה שהוא רוצה, והמערכת מבינה.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="font-semibold text-gray-900 mb-1">מזהה שגיאות כתיב וניסוחים שונים</p>
                  <p className="text-sm text-gray-600">
                    גם כשהלקוח לא כותב בדיוק את שם המוצר, המערכת יודעת למה הוא מתכוון.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="font-semibold text-gray-900 mb-1">מחזיר מוצרים גם בלי התאמה מושלמת</p>
                  <p className="text-sm text-gray-600">
                    עובד עם הקטלוג הקיים. לא צריך מלאי נוסף או תיוגים מיוחדים.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <ZeroResultRecoveryDemo />
            </div>
          </div>
          <div className="lg:hidden mt-8">
            <ZeroResultRecoveryDemo />
          </div>
        </div>
      </section>

      {/* ── FEATURE 2: NOISY RESULT AI INJECTION ── */}
      <section className="py-24 px-4 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="hidden lg:block">
              <NoisyResultCorrectionDemo />
            </div>
            <div className="max-w-xl" dir="rtl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-emerald-700">02</span>
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide">שכבה שנייה</p>
                  <p className="text-xs text-gray-500">שילוב ותיקון תוצאות</p>
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-gray-900">
               יש תוצאות- לא מספיק טובות
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                לפעמים החיפוש מחזיר תוצאות, אבל הן לא מה שהלקוח חיפש- בגלל המנגנון המיושן של מילות המפתח.
                Search Saver מזהה את הפער, משלב מוצרים רלוונטיים בתוך סט התוצאות הקיים
                ומתקן את הדירוג כך שהלקוח רואה קודם את מה שהוא באמת רצה.
              </p>
              <div className="grid gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="font-semibold text-gray-900 mb-1">משלב תוצאות סמנטיות בגריד הקיים</p>
                  <p className="text-sm text-gray-600">
                    חלק מהתוצאות מגיעות מהמנוע הקיים, חלק מהמנוע הסמנטי. הלקוח לא מרגיש הבדל.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="font-semibold text-gray-900 mb-1">מתקן דירוג לפי כוונת החיפוש</p>
                  <p className="text-sm text-gray-600">
                    כשחיפוש &ldquo;מעיל&rdquo; מציג חולצות, המערכת מציפה מעילים בראש התוצאות.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="font-semibold text-gray-900 mb-1">משלים מוצרים שאזלו מהמלאי</p>
                  <p className="text-sm text-gray-600">
                    כשמוצרים לא זמינים, המערכת משלימה בפריטים דומים וזמינים כדי לאפשר המשך רכישה.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:hidden mt-8">
            <NoisyResultCorrectionDemo />
          </div>
        </div>
      </section>

      {/* ── FEATURE 3: PERSONALIZED RERANK ── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-xl" dir="rtl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-blue-700">03</span>
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide">שכבה שלישית</p>
                  <p className="text-xs text-gray-500">פרסונליזציה</p>
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-gray-900">
                כל קונה רואה תוצאות אחרות
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                המערכת לומדת את הקונה בזמן אמת. לפי חיפושים קודמים, קליקים, רכישות והעדפות,
                התוצאות מדורגות מחדש כך שכל מבקר רואה קודם את מה שהכי רלוונטי עבורו.
              </p>
              <div className="grid gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="font-semibold text-gray-900 mb-1">לומדת מהתנהגות בזמן אמת</p>
                  <p className="text-sm text-gray-600">
                    קליקים, הוספות לעגלה ורכישות משפיעים על הדירוג תוך כדי הגלישה.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="font-semibold text-gray-900 mb-1">מתאימה לכל סשן בנפרד</p>
                  <p className="text-sm text-gray-600">
                    ההתאמה האישית מתעדכנת תוך כדי הגלישה, לא לאחר מעשה.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="font-semibold text-gray-900 mb-1">משפרת חיפושים חוזרים</p>
                  <p className="text-sm text-gray-600">
                    לקוח שחוזר מקבל תוצאות טובות יותר כבר מהחיפוש הראשון בסשן.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <PersonalizedRerankDemo />
            </div>
          </div>
          <div className="lg:hidden mt-8">
            <PersonalizedRerankDemo />
          </div>
        </div>
      </section>

      {/* ── PRODUCT BOOST ── */}
      <section className="py-24 px-4 bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" dir="rtl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full mb-6">
              <span className="text-sm font-medium text-purple-700">מרצ׳נדייזינג</span>
              <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-gray-900">
              קידום ונעיצת מוצרים
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              קחו שליטה על תוצאות החיפוש. נעצו, קדמו או הדגישו מוצרים נבחרים
              בראש כל שאילתת חיפוש. הקטלוג שלכם, הכללים שלכם.
            </p>
          </div>
          <div className="max-w-lg mx-auto">
            <ProductBoostDemo />
          </div>
        </div>
      </section>

      {/* ── SEMANTIX BRAIN ── */}
      <section id="semantix-brain" className="py-24 px-4 bg-white" ref={dashboardRef}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-3xl" dir="rtl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-6">
                <span className="text-sm font-medium text-gray-700">Semantix Brain</span>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-gray-900">
                דעו מה הקונים שלכם מחפשים
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                מודיעין חיפושים בזמן אמת, מיפוי המרות ואנליטיקת ROI.
                תבינו כל חיפוש, תגיבו מיד ותקבלו החלטות לפי דאטא, לא לפי תחושות.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">פיד חי של כל החיפושים</p>
                    <p className="text-sm text-gray-600">צפו בזמן אמת במה מחפשים, באילו מוצרים נוגעים ומה נכנס לעגלה.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">זיהוי חיפושים בעייתיים</p>
                    <p className="text-sm text-gray-600">גלו איפה לקוחות נתקעים ואילו חיפושים מובילים לנטישה.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">מגמות ושעות שיא</p>
                    <p className="text-sm text-gray-600">זהו חלונות מכירה לפי שעות, ימים ועונות.</p>
                  </div>
                </div>
              </div>
            
            </div>
            <div className="hidden lg:block">
              <SemantixBrainDemo />
            </div>
          </div>
          <div className="lg:hidden mt-8">
            <SemantixBrainDemo />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="testimonials" className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16" dir="rtl">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">שאלות נפוצות</h2>
            <p className="text-xl text-gray-600">כל מה שצריך לדעת על Search Saver</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-all duration-300"
                dir="rtl"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
