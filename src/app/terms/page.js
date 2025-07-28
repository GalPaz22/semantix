import React from 'react';

const TermsAndConditions = () => {
  const currentDate = new Date().toLocaleDateString('he-IL', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-5xl font-light mb-4">תנאי שירות</h1>
          <p className="text-purple-100 text-xl">הסכם רישוי תוכנה מבוססת בינה מלאכותית מקצועית</p>
          <p className="text-purple-200 text-sm mt-4">עודכן לאחרונה: {currentDate}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-16">
          
          {/* Introduction */}
          <section className="border-l-4 border-purple-600 pl-8">
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">סקירת הסכם</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                הסכם תנאי שירות זה ("הסכם") מסדיר את השימוש בפלטפורמת תוכנת החיפוש מבוססת הבינה המלאכותית 
                המיוחדת של Semantix AI. על ידי גישה לשירותים שלנו, אתה נכנס להסכם משפטי מחייב עם Semantix AI.
              </p>
              <p>
                אנו שומרים לעצמנו את הזכות לשנות תנאים אלה בכל עת. המשך השימוש בשירותים שלנו 
                מהווה קבלה של כל שינוי.
              </p>
            </div>
          </section>

          {/* Software Services */}
          <section>
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">שירותי תוכנה</h2>
            <div className="bg-gray-50 rounded-lg p-8 mb-6">
              <h3 className="text-xl font-medium text-gray-900 mb-4">טכנולוגיה מרכזית</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">חיפוש מבוסס בינה מלאכותית</h4>
                  <p className="text-gray-700 text-sm">אלגוריתמי חיפוש סמנטי מתקדמים</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">למידת מכונה</h4>
                  <p className="text-gray-700 text-sm">אופטימיזציית חיפוש משתפרת ברציפות</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">תשתית ענן</h4>
                  <p className="text-gray-700 text-sm">ארכיטקטורת SaaS ניתנת להרחבה</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">אינטגרציית API</h4>
                  <p className="text-gray-700 text-sm">חיבור ברמת ארגון</p>
                </div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">
              התוכנה שלנו פועלת כפתרון SaaS עצמאי, תוך שמירה על תאימות מלאה עם 
              תקני התעשייה ותנאי השירות של הפלטפורמה.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">קניין רוחני</h2>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-3">טכנולוגיה קניינית</h3>
                <p className="text-gray-700 leading-relaxed">
                  כל התוכנה, האלגוריתמים והקניין הרוחני הם בבעלות בלעדית ופותחו 
                  על ידי Semantix AI. הטכנולוגיה שלנו מוגנת על ידי זכויות יוצרים, סודות מסחריים וחוקים חלים.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-3">תאימות פלטפורמה</h3>
                <p className="text-gray-700 leading-relaxed">
                  אנו שומרים על היצמדות קפדנית לכל תנאי הפלטפורמה של צד שלישי ולא מפרים 
                  שום זכויות קניין רוחני באינטגרציות שלנו.
                </p>
              </div>
            </div>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">דרישות חשבון</h2>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                רישום חשבון מקצועי דורש מידע עסקי מדויק ותאימות עם פרוטוקולי אבטחה:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  מידע עסקי מלא ומדויק
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  ניהול פרטי התחברות מאובטח
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  תאימות עם תקנות חלות
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  הודעה מיידית על גישה לא מורשית
                </li>
              </ul>
            </div>
          </section>

          {/* Subscription Plans */}
          <section>
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">תוכניות מנוי מקצועיות</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="border-2 border-gray-200 rounded-lg p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">בסיסי</h3>
                  <div className="text-4xl font-light text-purple-600 my-4">$99<span className="text-lg text-gray-500">/חודש</span></div>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    50,000 שאילתות חיפוש בינה מלאכותית חודשיות
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    99.5% SLA זמן פעילות
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    גישה סטנדרטית ל-API
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    תמיכה בשעות עבודה
                  </li>
                </ul>
              </div>
              
              <div className="border-2 border-purple-600 rounded-lg p-8 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  מקצועי
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">פרו</h3>
                  <div className="text-4xl font-light text-purple-600 my-4">$120<span className="text-lg text-gray-500">/חודש</span></div>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    100,000 שאילתות חיפוש בינה מלאכותית חודשיות
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    99.9% SLA זמן פעילות
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    אלגוריתמים מתקדמים ולמידת מכונה
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    תמיכה ואנליטיקה בעדיפות
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Payment & Billing */}
          <section>
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">תשלום וחיוב</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">עיבוד תשלומים</h3>
                <p className="text-gray-700 leading-relaxed">
                  כל העסקאות מעובדות באופן מאובטח דרך Paddle, מעבד התשלומים המורשה שלנו. 
                  חיוב חודשי מתרחש באופן אוטומטי בתחילת כל מחזור.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-3">הבטחת כסף בחזרה ל-30 יום</h3>
                <p className="text-gray-700 leading-relaxed">
                  הבטחת שביעות רצון מקצועית עם החזר כספי מלא זמין תוך 30 יום מהמנוי 
                  עבור חשבונות זכאים העומדים בקריטריונים שלנו להחזר.
                </p>
              </div>
            </div>
          </section>

          {/* Legal Framework */}
          <section>
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">Legal Framework</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Jurisdiction</h3>
                <p className="text-gray-700 text-sm">Laws of Israel</p>
              </div>
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Data Protection</h3>
                <p className="text-gray-700 text-sm">GDPR & CCPA Compliant</p>
              </div>
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Enterprise Grade</h3>
                <p className="text-gray-700 text-sm">SOC 2 Security Standards</p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gray-900 text-white rounded-lg p-8">
            <h2 className="text-3xl font-semibold mb-6">Contact Information</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-medium mb-4">Support</h3>
                <p className="text-gray-300 mb-2">support@semantix-ai.com</p>
                <p className="text-gray-400 text-sm">Business hours: Sunday-Thursday, 9 AM - 5 PM Israel Time</p>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-4">Legal</h3>
                <p className="text-gray-300 mb-2">Semantix AI</p>
                <p className="text-gray-400 text-sm">AI Software Development & SaaS Provider</p>
                <p className="text-gray-400 text-sm">Israel</p>
              </div>
            </div>
          </section>

          {/* Updates Notice */}
          <section className="text-center py-8 border-t border-gray-200">
            <p className="text-gray-600">
              Terms may be updated to reflect software improvements and legal requirements. 
              Significant changes will be communicated via email.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;