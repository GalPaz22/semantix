import Link from 'next/link';
import { Shield, Cookie, Lock, Eye, FileText } from 'lucide-react';

export const metadata = {
  title: 'מדיניות פרטיות | Semantix',
  description: 'למדו כיצד Semantix אוספת, משתמשת ומגנה על המידע האישי שלכם.',
  alternates: {
    canonical: 'https://www.semantix.co.il/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">מדיניות פרטיות</h1>
          </div>
          <p className="text-xl text-purple-100">
            הפרטיות שלכם חשובה לנו. כאן תוכלו ללמוד כיצד אנו אוספים, משתמשים ומגנים על הנתונים שלכם.
          </p>
          <p className="text-sm text-purple-200 mt-4">
            עודכן לאחרונה: {new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-600" />
              מבוא
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Semantix (&quot;אנחנו&quot;, &quot;שלנו&quot; או &quot;אנו&quot;) מחויבת להגן על הפרטיות שלכם. מדיניות פרטיות זו מסבירה כיצד אנו אוספים,
              משתמשים, מגלים ושומרים על המידע שלכם כשאתם מבקרים באתר שלנו ומשתמשים בשירותינו.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Eye className="w-8 h-8 text-indigo-600" />
              מידע שאנו אוספים
            </h2>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">מידע אישי</h3>
              <p className="text-gray-600 mb-3">כשאתם משתמשים בשירותינו, ייתכן שנאסוף:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>שם ופרטי קשר (כתובת דוא&quot;ל, מספר טלפון)</li>
                <li>פרטי חשבון ונתוני אימות</li>
                <li>מידע עסקי (שם חברה, כתובת אתר)</li>
                <li>פרטי תשלום (מעובדים בצורה מאובטחת דרך ספקי תשלום צד שלישי)</li>
                <li>העדפות תקשורת והתכתבות איתנו</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">מידע שנאסף אוטומטית</h3>
              <p className="text-gray-600 mb-3">אנו אוספים אוטומטית מידע מסוים כשאתם מבקרים באתר:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>כתובת IP ומידע על המכשיר</li>
                <li>סוג וגרסת דפדפן</li>
                <li>דפים שביקרתם בהם וזמן שהייה</li>
                <li>מקורות הפניה ודפי יציאה</li>
                <li>מערכת הפעלה וסוג מכשיר</li>
              </ul>
            </div>
          </section>

          {/* Cookies Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Cookie className="w-8 h-8 text-amber-600" />
              עוגיות וטכנולוגיות מעקב
            </h2>
            
            <p className="text-gray-600 mb-4">
              אנו משתמשים בעוגיות ובטכנולוגיות מעקב דומות כדי לשפר את החוויה שלכם באתר. עוגיות הן קבצי טקסט קטנים
              שנשמרים במכשיר שלכם ועוזרים לנו להבין כיצד אתם משתמשים בשירותינו.
            </p>

            <div className="space-y-6">
              <div className="bg-purple-50 border-l-4 border-purple-500 rounded-r-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">עוגיות הכרחיות</h3>
                <p className="text-gray-600">
                  חיוניות לתפקוד תקין של האתר. עוגיות אלה מאפשרות פונקציות ליבה כמו אבטחה,
                  ניהול רשת ונגישות. לא ניתן לבטל אותן.
                </p>
              </div>

              <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">עוגיות אנליטיקה</h3>
                <p className="text-gray-600 mb-3">
                  אנו משתמשים בשירותי אנליטיקה כמו <strong>Hotjar</strong> ו-<strong>Google Analytics</strong> כדי להבין
                  כיצד מבקרים מתקשרים עם האתר. הכלים האלה עוזרים לנו:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>להבין התנהגות משתמשים ולשפר את השירותים שלנו</li>
                  <li>לעקוב אחר ביצועי האתר ולזהות בעיות</li>
                  <li>לנתח מסעות משתמש ושיעורי המרה</li>
                  <li>ליצור מפות חום והקלטות סשן (Hotjar)</li>
                </ul>
                <p className="text-sm text-gray-500 mt-3">
                  ניתן לשלוט בעוגיות אנליטיקה דרך באנר ההסכמה לעוגיות.
                </p>
              </div>

              <div className="bg-pink-50 border-l-4 border-pink-500 rounded-r-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">עוגיות שיווק</h3>
                <p className="text-gray-600">
                  משמשות לעקוב אחר מבקרים בין אתרים כדי להציג פרסום רלוונטי. עוגיות אלה עשויות להיקבע על ידי
                  שותפי הפרסום שלנו, וניתן לבטל אותן דרך הגדרות העוגיות.
                </p>
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-6 mt-6">
              <h4 className="font-semibold text-gray-900 mb-2">ניהול העדפות העוגיות שלכם</h4>
              <p className="text-gray-600 mb-3">
                ניתן לנהל את העדפות העוגיות בכל עת על ידי:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>שינוי הגדרות הדפדפן לחסימה או מחיקת עוגיות</li>
                <li>שימוש בבאנר ההסכמה לעוגיות בביקור הראשון באתר</li>
                <li>גישה להעדפות העוגיות דרך הגדרות הפרטיות בדפדפן</li>
              </ul>
              <p className="text-sm text-gray-500 mt-3">
                שימו לב: חסימת עוגיות מסוימות עלולה להשפיע על תפקוד האתר.
              </p>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Lock className="w-8 h-8 text-green-600" />
              כיצד אנו משתמשים במידע שלכם
            </h2>
            <p className="text-gray-600 mb-4">אנו משתמשים במידע שנאסף למטרות הבאות:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">מתן שירות</h4>
                <p className="text-sm text-gray-600">לספק, לתחזק ולשפר את שירותי החיפוש שלנו</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">תקשורת</h4>
                <p className="text-sm text-gray-600">לשלוח עדכונים, ניוזלטרים והודעות תמיכה</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">אנליטיקה</h4>
                <p className="text-sm text-gray-600">לנתח דפוסי שימוש ולשפר את חוויית המשתמש</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">אבטחה</h4>
                <p className="text-sm text-gray-600">להגן מפני הונאה וגישה לא מורשית</p>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">שיתוף מידע וגילוי</h2>
            <p className="text-gray-600 mb-4">
              איננו מוכרים את המידע האישי שלכם. ייתכן שנשתף את המידע שלכם עם:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>ספקי שירות:</strong> צדדים שלישיים שעוזרים לנו להפעיל את השירותים (למשל, אחסון, אנליטיקה)</li>
              <li><strong>שותפים עסקיים:</strong> כשאתם משתלבים עם פלטפורמות צד שלישי כמו Shopify</li>
              <li><strong>דרישות חוק:</strong> כשנדרש על פי חוק או כדי להגן על זכויותינו</li>
              <li><strong>העברות עסקיות:</strong> בקשר למיזוגים, רכישות או מכירת נכסים</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">שירותי צד שלישי</h2>
            <p className="text-gray-600 mb-4">
              אנו משתמשים בשירותי צד שלישי הבאים שעשויים לאסוף מידע עליכם:
            </p>
            <div className="bg-blue-50 rounded-xl p-6">
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="font-semibold min-w-[120px]">Hotjar:</span>
                  <span>אנליטיקה ומעקב התנהגות משתמשים — <a href="https://www.hotjar.com/legal/policies/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">מדיניות פרטיות</a></span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold min-w-[120px]">Google Analytics:</span>
                  <span>אנליטיקת אתר — <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">מדיניות פרטיות</a></span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold min-w-[120px]">Shopify:</span>
                  <span>אינטגרציה עם פלטפורמת מסחר אלקטרוני — <a href="https://www.shopify.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">מדיניות פרטיות</a></span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold min-w-[120px]">Paddle:</span>
                  <span>עיבוד תשלומים — <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">מדיניות פרטיות</a></span>
                </li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">אבטחת מידע</h2>
            <p className="text-gray-600 mb-4">
              אנו מיישמים אמצעים טכניים וארגוניים מתאימים להגנה על המידע האישי שלכם, כולל:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>הצפנת מידע במעבר ובמנוחה</li>
              <li>הערכות אבטחה ועדכונים שוטפים</li>
              <li>בקרות גישה ואמצעי אימות</li>
              <li>עיבוד תשלומים מאובטח דרך ספקים מהימנים</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">הזכויות שלכם</h2>
            <p className="text-gray-600 mb-4">בהתאם למיקום שלכם, ייתכן שיש לכם את הזכויות הבאות:</p>
            <div className="bg-green-50 rounded-xl p-6">
              <ul className="space-y-2 text-gray-600">
                <li><strong>גישה:</strong> לבקש גישה למידע האישי שלכם</li>
                <li><strong>תיקון:</strong> לבקש תיקון של נתונים שגויים</li>
                <li><strong>מחיקה:</strong> לבקש מחיקת המידע האישי שלכם</li>
                <li><strong>ניידות:</strong> לבקש עותק של הנתונים שלכם בפורמט נייד</li>
                <li><strong>התנגדות:</strong> להתנגד לעיבוד מסוים של הנתונים שלכם</li>
                <li><strong>ביטול הסכמה:</strong> לבטל הסכמה לעיבוד נתונים</li>
              </ul>
            </div>
            <p className="text-gray-600 mt-4">
              למימוש זכויות אלה, אנא פנו אלינו ב-<a href="mailto:privacy@semantix-ai.com" className="text-purple-600 hover:underline font-medium">privacy@semantix-ai.com</a>
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">יצירת קשר</h2>
            <p className="text-gray-600 mb-4">
              אם יש לכם שאלות לגבי מדיניות פרטיות זו או לגבי נוהגי הנתונים שלנו, אנא פנו אלינו:
            </p>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
              <p className="text-gray-600 mb-2"><strong>דוא&quot;ל:</strong> <a href="mailto:privacy@semantix-ai.com" className="text-purple-600 hover:underline">privacy@semantix-ai.com</a></p>
              <p className="text-gray-600 mb-2"><strong>אתר:</strong> <a href="https://www.semantix.co.il" className="text-purple-600 hover:underline">www.semantix.co.il</a></p>
              <p className="text-gray-600"><strong>דף יצירת קשר:</strong> <Link href="/contact" className="text-purple-600 hover:underline">טופס יצירת קשר</Link></p>
            </div>
          </section>

          {/* Updates */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">עדכונים למדיניות זו</h2>
            <p className="text-gray-600">
              ייתכן שנעדכן מדיניות פרטיות זו מעת לעת. נודיע לכם על שינויים על ידי פרסום המדיניות החדשה
              בדף זה ועדכון תאריך &quot;עודכן לאחרונה&quot;. אנו ממליצים לעיין במדיניות פרטיות זו מעת לעת
              כדי להתעדכן בשינויים.
            </p>
          </section>

        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
