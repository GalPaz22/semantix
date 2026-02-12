'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Image from 'next/image';
import Script from 'next/script';
import ImageCarousel from './components/ImageCarousel';
import SemantixSearchDemo from './components/SemantixSearchDemo';
import SemantixUpsellDemo from './components/SemantixUpsellDemo';
import SemantixBrainDemo from './components/SemantixBrainDemo';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Search, Globe, Shield, BarChart3 } from 'lucide-react';

const HomePage = () => {
  const router = useRouter();
  const queriesWithImages = [
    {
      query: "יין אדום שמתאים לסטייק, עד 120 ש\"ח",
      images: [
        "/wine1.png",
        "/wine2.png",
        "/wine3.png",
        "/wine4.png",
      ]
    },
    {
      query: "שעון ספורט GPS שאפשר לשלם איתו",
      images: [
        "https://shipi.b-cdn.net/wp-content/uploads/2023/06/Apple-Watch-SE-2022-40mm-600x600.webp",
        "https://shipi.b-cdn.net/wp-content/uploads/2023/01/Untitled-1-RADSecovered-2-600x600-1-600x600.jpg",
        "https://shipi.b-cdn.net/wp-content/uploads/2022/08/16382009-600x600.jpg",
        "https://shipi.b-cdn.net/wp-content/uploads/2022/06/6339680_sd-600x600.jpg",
      ]
    },
    {
      query: "תכשיט בצורת לב ליום ההולדת של הבת שלי - עם הנחה",
      images: [
        "https://theydream-online.com/wp-content/uploads/2024/06/1717340426_I8PsgQ_C-1.jpeg.webp",
        "https://theydream-online.com/wp-content/uploads/2023/07/1690810117_1690117322_06-652x652.jpg.webp",
        "https://theydream-online.com/wp-content/uploads/2024/02/1707144894_0E6A1819-520x780.jpg.webp",
        "https://theydream-online.com/wp-content/uploads/2024/01/1704373234_1195213438_0E6A2495-710x1065.jpg",
      ]
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [text, setText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const dashboardRef = useRef(null);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [showWhatWeDoDropdown, setShowWhatWeDoDropdown] = useState(false);

  const currentQuery = queriesWithImages[currentIndex].query;
  const currentImages = queriesWithImages[currentIndex].images;

  useEffect(() => {
    if (!isFadingOut && text.length < currentQuery.length) {
      const typingTimeout = setTimeout(() => {
        setText(currentQuery.slice(0, text.length + 1));
      }, 80);
      return () => clearTimeout(typingTimeout);
    } else if (text.length === currentQuery.length && !showImages) {
      const showImagesTimeout = setTimeout(() => {
        setShowImages(true);
      }, 500);
      return () => clearTimeout(showImagesTimeout);
    }
  }, [text, isFadingOut, currentQuery, showImages]);

  useEffect(() => {
    if (showImages) {
      const displayTimeout = setTimeout(() => {
        setIsFadingOut(true);
      }, 3000);
      return () => clearTimeout(displayTimeout);
    }
  }, [showImages]);

  useEffect(() => {
    if (isFadingOut) {
      const nextQueryTimeout = setTimeout(() => {
        setText('');
        setShowImages(false);
        setIsFadingOut(false);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % queriesWithImages.length);
      }, 500);
      return () => clearTimeout(nextQueryTimeout);
    }
  }, [isFadingOut, queriesWithImages.length]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDashboardVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (dashboardRef.current) {
      observer.observe(dashboardRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const stats = [
    { label: 'שיעור המרה מהחיפוש', value: '23%', icon: 'CONVERT', isMain: true },
    { label: 'מוצרים שמצאו התאמה', value: '50,000+', icon: 'SOLD', isMain: true },
    { label: 'שאילתות מורכבות שנפתרו', value: '100K+', icon: 'SAVED', isMain: true },
    { label: 'הכנסות שהושפעו מהחיפוש', value: '$3M+', icon: 'REVENUE', isMain: true },
  ];

  const faqs = [
    {
      question: 'כמה זמן לוקח להטמיע את Semantix?',
      answer: 'ההטמעה מתבצעת באמצעות פלאגין והתחברות קצרה לקטלוג. תוך פחות מעשר דקות המערכת כבר לומדת את הנתונים שלכם ומתחילה להציג תוצאות חכמות.'
    },
    {
      question: 'האם Semantix מחליפה את החיפוש הקיים?',
      answer: 'כן, המנוע שלנו משתלב במקום החיפוש הישן, אבל שומר על כל מבנה הקטגוריות, הפילטרים והעיצוב שלכם. חוויית המשתמש נשארת עקבית – רק הרבה יותר מדויקת.'
    },
    {
      question: 'איך אתם מטפלים בעברית, אנגלית ושפות נוספות?',
      answer: 'המודלים שלנו מבינים שפה טבעית, סלנג ושגיאות כתיב בעברית ובאנגלית, ופועלים בריבוי שפות כברירת מחדל. אין צורך להגדיר מילונים ידניים.'
    },
    {
      question: 'איזה תוצאות רואים הלקוחות לאחר ההשקה?',
      answer: 'חנויות מדווחות על עלייה של 20–40% בהמרות מהחיפוש, ירידה חדה בתוצאות ריקות ועלייה מתמדת בשווי סל הקנייה – כבר מהשבוע הראשון.'
    },
  ];

  return (
    <div className="relative w-full overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Head>
        <meta name="robots" content="noimageindex" />
        <meta name="googlebot" content="noimageindex" />
      </Head>
      <div className="relative">
        {/* Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-50 border-b border-gray-100 overflow-visible">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
            <div className="flex justify-between items-center h-16 overflow-visible" dir="rtl">
              <div className="flex items-center gap-3 overflow-visible flex-shrink-0">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text flex-shrink-0">Semantix AI</span>
                <div className="relative z-50" onMouseEnter={() => setShowWhatWeDoDropdown(true)} onMouseLeave={() => setShowWhatWeDoDropdown(false)}>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap text-sm sm:text-base"
                  >
                    <span>פתרונות</span>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showWhatWeDoDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showWhatWeDoDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[100]">
                      <a
                        href="#features"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowWhatWeDoDropdown(false);
                          document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="block px-5 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors text-right font-medium"
                      >
                        🔍 חיפוש וגילוי
                      </a>
                      <a
                        href="#upsell"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowWhatWeDoDropdown(false);
                          document.getElementById('upsell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="block px-5 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors text-right font-medium"
                      >
                        💰 מערכת Upsell
                      </a>
                      <a
                        href="#semantix-brain"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowWhatWeDoDropdown(false);
                          document.getElementById('semantix-brain')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="block px-5 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors text-right font-medium"
                      >
                        🧠 Semantix Brain
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4 sm:space-x-6 md:space-x-8 space-x-reverse">
                <button onClick={() => router.push('/contact')} className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  התחל עכשיו
                </button>
                <a href="#testimonials" className="text-gray-700 hover:text-purple-600 transition-colors">המלצות</a>
                <button onClick={() => router.push('/product')} className="text-gray-700 hover:text-purple-600 transition-colors bg-transparent border-none cursor-pointer">איך זה עובד</button>
                <a href="#features" className="text-gray-700 hover:text-purple-600 transition-colors">תכונות</a>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-12 sm:pt-24 pb-12 sm:pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 opacity-50"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-7xl font-extrabold mb-4 sm:mb-6 leading-tight" dir="ltr">
                <span className="bg-gradient-to-t from-purple-600 via-purple-500 to-gray-400 text-transparent bg-clip-text block mb-0 pb-0">
                  Site Search is Your Seller
                </span>
                <span className="text-gray-800 block sm:inline text-xl sm:text-6xl lg:text-6xl mt-4">Use the Best.</span>
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-10 px-4 leading-relaxed pb-2" dir="rtl">
                 שדרגו את שורת החיפוש שלכם ליועץ מכירות שמבין כוונה, מדייק תוצאות ומגדיל כל סל קנייה.
              </p>
            </div>

            {/* Search Demo */}
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto mb-8 sm:mb-12 border border-gray-100" dir="rtl">
              <div className="flex items-center mb-6">
                <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-6 py-4 justify-between min-h-[80px]">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className={`text-lg sm:text-xl text-gray-700 transition-opacity duration-500 leading-tight text-right flex-1 mr-4 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
                    {text}
                    <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} text-purple-600`}>|</span>
                  </span>
                </div>
              </div>
              
              <div className="h-56 sm:h-60 relative overflow-hidden">
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 transition-all duration-700 absolute inset-0 ${showImages && !isFadingOut ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {showImages && currentImages.map((image, index) => (
                    <div key={index} className="group relative overflow-hidden rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white">
                      <div className="w-full h-full bg-white flex items-center justify-center p-3">
                        <img 
                          src={image} 
                          alt={`מוצר ${index + 1}`} 
                          className="w-full h-full object-contain mix-blend-multiply" 
                          style={{ backgroundColor: 'transparent', maxHeight: '100%', maxWidth: '100%' }}
                        />
                      </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-xs sm:text-sm font-medium">התאמה מושלמת</p>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4" dir="rtl">
              <button onClick={() => router.push('/contact')} className="group bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-full text-base sm:text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center gap-3 w-full sm:w-auto justify-center">
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>דברו איתנו</span>
              </button>
              <button onClick={() => router.push('/product')} className="bg-white text-gray-700 font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-full text-base sm:text-lg border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 w-full sm:w-auto">
              איך זה עובד
              </button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12" dir="rtl">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                תוצאות מוכחות שמניעות הכנסות
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                מספרים אמיתיים מחנויות שהחליפו את החיפוש הגנרי במנוע סמנטי אחד
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-purple-200">
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-lg font-medium text-gray-700 leading-tight">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Carousel Section */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <ImageCarousel />
          </div>
        </section>

        {/* Search & Discovery Section */}
        <section id="features" className="py-24 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
              <div className="max-w-3xl" dir="rtl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-6">
                  <span className="text-sm font-medium text-gray-700">חיפוש וגילוי</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                </div>
                <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-gray-900 text-right">
                  חיפוש שחושב כמו הקונים שלכם
                </h2>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed text-right">
                  Semantix מנתחת כל שאילתה בהקשר שלה, מבינה למה הלקוח מתכוון ומחזירה בדיוק את המוצר המתאים ביותר.
                </p>
                <div className="space-y-4 mb-8" dir="rtl">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-gray-900 mt-1 flex-shrink-0" />
                    <div className="text-right">
                      <p className="font-medium text-gray-900">מבינים את המשימה האמיתית</p>
                      <p className="text-sm text-gray-600">מבדילים בין “יין אדום קל לערב חברה” ל“יין יוקרתי למתנה” ומציגים את התוצאה המדויקת.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-gray-900 mt-1 flex-shrink-0" />
                    <div className="text-right">
                      <p className="font-medium text-gray-900">מדברים בכל שפה, גם בשגיאות</p>
                      <p className="text-sm text-gray-600">מתקנים סלנג, טייפו ושילובי עברית-אנגלית- הכול אוטומטי, ללא צורך בהגדרה ידנית.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-gray-900 mt-1 flex-shrink-0" />
                    <div className="text-right">
                      <p className="font-medium text-gray-900">מתעדפים רלוונטיות שמכניסה כסף</p>
                      <p className="text-sm text-gray-600">משלבים סיגנלים התנהגותיים והמרות אמיתיות כדי להציג קודם את מה שהופך לרכישה.</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/search-discovery"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>לכל היכולות של Search &amp; Discovery</span>
                </Link>
              </div>
              <div className="hidden lg:block">
                <SemantixSearchDemo />
              </div>
            </div>
            <div className="lg:hidden">
              <SemantixSearchDemo />
            </div>
          </div>
        </section>

        {/* Upsell Ecosystem Section */}
        <section id="upsell" className="py-24 px-4 bg-gray-50 border-y border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
              <div className="hidden lg:block">
                <SemantixUpsellDemo />
              </div>
              <div className="max-w-3xl" dir="rtl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-6">
                  <span className="text-sm font-medium text-gray-700">מערכת Upsell</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-gray-900 text-right">
                  Upsell שמתאים את המוצרים הנכונים
                </h2>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed text-right">
                  המערכת שלנו מבינה מה הלקוח מחפש כרגע, ומוסיפה באלגנטיות את המוצר המשלים שהכי כדאי לו. ולכם.
                </p>
                <div className="space-y-4 mb-8" dir="rtl">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">מודיעין כוונה בזמן אמת</p>
                      <p className="text-sm text-gray-600">מאבחנים למה הלקוח צריך את המוצר ומציעים את מה שמשלים את הרגע.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">חבילות דינמיות</p>
                      <p className="text-sm text-gray-600">יוצרים סטים משתנים אוטומטית לפי הקשר, תקציב וסגנון.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">התאמה חווייתית</p>
                      <p className="text-sm text-gray-600">מציגים Upsell בתוך תוצאות החיפוש – בלי פופ-אפים ובלי לחצות את קו הטעם הטוב.</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/upsell-ecosystem"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>גלו את מערכת ה-Upsell</span>
                </Link>
              </div>
            </div>
            <div className="lg:hidden">
              <SemantixUpsellDemo />
            </div>
          </div>
        </section>

        {/* Semantix Brain Section */}
        <section id="semantix-brain" className="py-24 px-4 bg-white" ref={dashboardRef}>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
              <div className="max-w-3xl" dir="rtl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-6">
                  <span className="text-sm font-medium text-gray-700">Semantix Brain</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                </div>
                <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-gray-900 text-right">
                  דעו מה הקונים שלכם רוצים
                </h2>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed text-right">
                  לוח הבקרה של Semantix Brain חושף מה מחפשים עכשיו, מה באמת מביא הכנסות ואיפה מחכים לכם הזדמנויות מכירה חדשות.
                </p>
                <div className="space-y-4 mb-8" dir="rtl">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">פיד חי של כל השאלות</p>
                      <p className="text-sm text-gray-600">צפו בזמן אמת במה מחפשים, באילו מוצרים נוגעים ומה נכנס לעגלה.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">מדד מורכבות מול חיפוש פשוט</p>
                      <p className="text-sm text-gray-600">גלו כמה כסף מגיע משאילתות סמנטיות ומה עוד צריך מענה.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-1">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">תזמון שמזהה חלונות מכירה</p>
                      <p className="text-sm text-gray-600">מפות חכמות של שעות שיא, מוצרים חמים ועונתיות- כדי שתתזמנו מלאי וקמפיינים.</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/semantix-brain"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>פתחו את לוח הבקרה</span>
                </Link>
              </div>
              <div className="hidden lg:block">
                <SemantixBrainDemo />
              </div>
            </div>
            <div className="lg:hidden">
              <SemantixBrainDemo />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="testimonials" className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16" dir="rtl">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                שאלות נפוצות
              </h2>
              <p className="text-xl text-gray-600">
                כל מה שאתה צריך לדעת על Semantix AI
              </p>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-all duration-300" dir="rtl">
                  <h3 className="text-xl font-bold text-gray-800 mb-3 text-right">{faq.question}</h3>
                  <p className="text-gray-600 text-right">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

      <style jsx>{`
        @keyframes fadeDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes dashboardReveal {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-fadeDown {
          animation: fadeDown 0.8s ease-out forwards;
        }

        .animate-dashboardReveal {
          animation: dashboardReveal 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
