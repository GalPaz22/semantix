'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Image from 'next/image';
import ImageCarousel from './components/ImageCarousel';

const HomePage = () => {
  const router = useRouter();
  const queriesWithImages = [
    {
      query: "יין אדום שמתאים לסטייק, עד 120 ש׳׳ח",
      images: [
        "/wine1.png",
        "/wine2.png",
        "/wine3.png",
        "/wine4.png",
      ]
    },
    {
      query: "שעון ספורט שאפשר גם לשלם איתו",
      images: [
        "https://shipi.b-cdn.net/wp-content/uploads/2023/06/Apple-Watch-SE-2022-40mm-600x600.webp",
        "https://shipi.b-cdn.net/wp-content/uploads/2023/01/Untitled-1-RADSecovered-2-600x600-1-600x600.jpg",
        "https://shipi.b-cdn.net/wp-content/uploads/2022/08/16382009-600x600.jpg",
        "https://shipi.b-cdn.net/wp-content/uploads/2022/06/6339680_sd-600x600.jpg",
      ]
    },
    {
      query: "תכשיט בצורת לב או צדף ליום ההולדת של הבת שלי, שיהיה בהנחה",
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
  const [roiInputs, setRoiInputs] = useState({
    monthlyVisitors: 10000,
    avgOrderValue: 75,
    currentConversionRate: 2
  });

  const calculateROI = () => {
    const { monthlyVisitors, avgOrderValue, currentConversionRate } = roiInputs;
    
    // Current monthly revenue
    const currentMonthlyOrders = (monthlyVisitors * currentConversionRate) / 100;
    const currentMonthlyRevenue = currentMonthlyOrders * avgOrderValue;
    
    // Projected revenue with 32% conversion increase
    const improvedConversionRate = currentConversionRate * 1.32;
    const projectedMonthlyOrders = (monthlyVisitors * improvedConversionRate) / 100;
    const projectedMonthlyRevenue = projectedMonthlyOrders * avgOrderValue;
    
    // Additional revenue
    const additionalMonthlyRevenue = projectedMonthlyRevenue - currentMonthlyRevenue;
    const additionalYearlyRevenue = additionalMonthlyRevenue * 12;
    
    return {
      currentMonthlyRevenue,
      projectedMonthlyRevenue,
      additionalMonthlyRevenue,
      additionalYearlyRevenue,
      newConversionRate: improvedConversionRate.toFixed(2),
      additionalOrders: Math.round(projectedMonthlyOrders - currentMonthlyOrders)
    };
  };

  const roi = calculateROI();

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

  const [queriesSaved, setQueriesSaved] = useState(0);
  const [productsSold, setProductsSold] = useState(0);
  const [countdown, setCountdown] = useState({
    days: 30,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const animateNumbers = () => {
      const queriesTarget = 1000000;
      const productsTarget = 10000;
      const duration = 2000; // 2 seconds
      const steps = 60;
      const queriesStep = queriesTarget / steps;
      const productsStep = productsTarget / steps;
      
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        setQueriesSaved(Math.floor(currentStep * queriesStep));
        setProductsSold(Math.floor(currentStep * productsStep));
        
        if (currentStep >= steps) {
          setQueriesSaved(queriesTarget);
          setProductsSold(productsTarget);
          clearInterval(interval);
        }
      }, duration / steps);
    };

    // Start animation when component mounts
    animateNumbers();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prevCountdown => {
        const totalSeconds = prevCountdown.days * 24 * 60 * 60 + 
                           prevCountdown.hours * 60 * 60 + 
                           prevCountdown.minutes * 60 + 
                           prevCountdown.seconds;
        
        if (totalSeconds <= 0) {
          return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }
        
        const newTotalSeconds = totalSeconds - 1;
        const days = Math.floor(newTotalSeconds / (24 * 60 * 60));
        const hours = Math.floor((newTotalSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((newTotalSeconds % (60 * 60)) / 60);
        const seconds = newTotalSeconds % 60;
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: 'שאילתות נשלחו', value: `${queriesSaved.toLocaleString()}+`, icon: 'SAVED', isMain: true },
    { label: 'מוצרים נמכרו', value: `${productsSold.toLocaleString()}+`, icon: 'SOLD', isMain: true },
  ];

  const features = [
    {
      title: 'הבנה טבעית רב-לשונית',
      description: 'לקוחות מחפשים כמו שהם חושבים - ובכל שפה. לא עוד משחקי ניחוש מילות מפתח.',
      icon: '💬',
      details: ['מבין הקשר וכוונה', 'מטפל בטעויות כתיב ווריאציות', 'תומך במספר שפות']
    },
    {
      title: 'התאמת מוצרים חכמה',
      description: 'התאמה מבוססת בינה מלאכותית שמבינה באמת קשרים בין מוצרים.',
      icon: '🎯',
      details: ['המלצות חוצות קטגוריות', 'התאמה מבוססת תכונות', 'חיפוש דמיון סמנטי']
    },
    {
      title: 'אנליטיקה בזמן אמת',
      description: 'ראה מה לקוחות רוצים, מתי הם רוצים את זה, ואיך לספק.',
      icon: '📊',
      details: ['ניתוח מגמות חיפוש', 'מעקב המרות', 'תובנות כוונת לקוחות']
    },
    {
      title: 'אינטגרציה ללא קוד',
      description: 'התקן, חבר, וצפה בשיעורי ההמרה שלך עולים.',
      icon: '🔌',
      details: ['התקנה בלחיצה אחת', 'סנכרון אוטומטי עם קטלוג', 'עובד עם התקנה קיימת']
    },
  ];

  const painPoints = [
    {
      title: 'גילוי מוצרים חכם',
      description: 'בינה מלאכותית מבינה כוונת לקוחות מעבר למילות מפתח מדויקות',
      icon: 'SMART',
    },
    {
      title: 'למידה בזמן אמת',
      description: 'אלגוריתמים משתפרים עם כל אינטראקציית חיפוש',
      icon: 'LEARN',
    }
  ];

  const integrations = [
    { name: 'WooCommerce', logo: 'WOO', status: 'available', description: 'מוכן להתקנה' },
    { name: 'Shopify', logo: 'SHOP', status: 'coming-soon', description: 'מגיע Q2 2025' },
  ];

  const faqs = [
    {
      question: 'איך Semantix AI שונה מחיפוש רגיל?',
      answer: 'Semantix AI מבין את הכוונה האמיתית של הלקוח, לא רק מילות מפתח. זה מאפשר חיפוש טבעי יותר ומדויק יותר.'
    },
    {
      question: 'האם זה עובד עם כל פלטפורמת מסחר אלקטרוני?',
      answer: 'כרגע תומך ב-WooCommerce, עם תמיכה ב-Shopify בקרוב. אנו מוסיפים פלטפורמות נוספות באופן קבוע.'
    },
    {
      question: 'כמה זמן לוקח להתקין?',
      answer: 'התקנה אורכת פחות מ-5 דקות. פשוט התקן את התוסף, חבר את החנות שלך, וזה מתחיל לעבוד מיד.'
    },
    {
      question: 'האם יש תמיכה טכנית?',
      answer: 'כן! הצוות שלנו זמין 24/7 לעזור לך להפיק את המרב מ-Semantix AI.'
    }
  ];

  return (
    <div className="relative w-full overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Head>
        <meta name="robots" content="noimageindex" />
        <meta name="googlebot" content="noimageindex" />
        <title>Semantix AI - חיפוש סמנטי מבוסס בינה מלאכותית לתוצאות מדויקות בעסק שלך</title>
        
      </Head>
      <div className="relative">
        {/* Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-50 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Semantix AI</span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-700 hover:text-purple-600 transition-colors">Features</a>
                <a href="#how-it-works" className="text-gray-700 hover:text-purple-600 transition-colors">How it Works</a>
              
                <a href="#testimonials" className="text-gray-700 hover:text-purple-600 transition-colors">Testimonials</a>
                <button onClick={() => window.open('https://calendly.com/semantix-sales', '_blank')} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  התחילו עכשיו
                </button>
              </div>
            </div>
          </div>
        </nav>



        {/* Hero Section - Enhanced */}
        <section className="pt-20 pb-20 px-4 relative overflow-hidden" dir="rtl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 opacity-50"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-12">
            
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mb-6">
                <span className="bg-gradient-to-b from-gray-500 to-purple-600 text-transparent bg-clip-text block mb-2 sm:mb-0 sm:inline">
                 המשתמשים שלכם יודעים מה הם מחפשים.
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              טכנולוגיית החיפוש באתרי אי קומרס לא השתנתה מהותית ב-20 שנה האחרונות. אנחנו כאן לשנות אותה.
                
              </p>
            </div>

            {/* Search Demo - Enhanced */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto mb-12 border border-gray-100">
              <div className="flex items-start mb-6">
                <div className="flex-1 bg-gray-50 rounded-xl px-6 py-4 h-20 sm:h-16 flex items-center justify-between">
                  <div className="flex-1 flex items-center min-h-0">
                    <span className={`text-sm sm:text-lg text-gray-700 transition-opacity duration-500 leading-snug ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
                      {text}
                      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} text-purple-600`}>|</span>
                    </span>
                  </div>
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Fixed height container to prevent layout shift */}
              <div className="h-80 md:h-48">
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-700 ${showImages && !isFadingOut ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {showImages && currentImages.map((image, index) => (
                    <div key={index} className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <Image src={image} alt={`Product ${index + 1}`} className="w-full h-32 md:h-48 object-cover" width={300} height={200} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-sm font-medium">Perfect Match</p>
                        <p className="text-xs opacity-90">Click to view</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => window.open('https://calendly.com/semantix-sales', '_blank')} className="group bg-gradient-to-r from-purple-600 to-light bg-purple-500 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center gap-3">
                <span>נסו בחינם!</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button onClick={() => router.push('/product')} className="bg-white text-gray-700 font-bold py-4 px-8 rounded-full text-lg border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
                איך זה עובד
              </button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-4 px-2">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="font-bold mb-1 text-5xl md:text-6xl text-gray-900">{stat.value}</div>
                  <div className="text-3xl font-serif italic tracking-wider mt-2 drop-shadow animate-fade-in-up bg-gradient-to-r from-purple-500 to-pink-400 bg-clip-text text-transparent">
                    {stat.label}
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

        {/* Problem/Solution Section */}
        <section className="py-20 px-4 bg-white" dir="rtl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              הלקוחות שלכם לא חושבים במילות מפתח
            </h2>
            <div className="space-y-6 mb-8">
              <div>
                <p className="font-semibold text-gray-800 text-xl mb-4">הם רוצים לחפש כמו שהם חושבים.</p>
                <p className="text-gray-600 text-lg leading-relaxed"> כולנו מכירים את חווית החיפוש המתסכלת באתרי אי קומרס. ההבנה שאם לא נתאים באופן מדויק את מילות המפתח, נקבל את ה׳׳אין תוצאות׳׳ הידוע והמבאס.</p>
              </div>
             
            </div>
            <button onClick={() => router.push('/product')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-full hover:shadow-lg transition-all duration-300 transform hover:scale-105 text-lg">
              ראה את הההבדל ←
            </button>
          </div>
        </section>

        {/* Analytics Dashboard Preview - Enhanced */}
        <section className="py-20 px-4 bg-white" ref={dashboardRef} dir="rtl">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                אנליטיקה בזמן אמת שמובילה לתוצאות
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                עקוב אחר כל חיפוש, עקוב אחר המרות עגלה, והבן בדיוק מה מוביל להכנסות בחנות שלך
              </p>
            </div>

            <div className={`transform ${dashboardVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-1000`}>
              {/* Analytics Dashboard Header */}
              <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-xl mb-6">
                <div className="relative p-8 flex flex-col md:flex-row justify-between items-center">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">לוח בקרה</h1>
                    <p className="text-purple-100">עקוב אחר שאילתות, המרות ו-ROI</p>
                  </div>
                  <div className="flex space-x-4 mt-4 md:mt-0">
                    <button className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white backdrop-blur-sm">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      30 ימים אחרונים
                    </button>
                  </div>
                </div>
                
                {/* Metrics Overview Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/5 backdrop-blur-sm border-t border-white/10">
                  <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
                    <p className="text-white/70 text-sm mb-1">סה"כ חיפושים</p>
                    <p className="text-3xl font-bold text-white">8,234</p>
                  </div>
                  <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
                    <p className="text-white/70 text-sm mb-1">המרת עגלה</p>
                    <p className="text-3xl font-bold text-white">32.4%</p>
                  </div>
                  <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
                    <p className="text-white/70 text-sm mb-1">ערך הזמנה ממוצע</p>
                    <p className="text-3xl font-bold text-white">₪127.50</p>
                  </div>
                  <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
                    <p className="text-white/70 text-sm mb-1">השפעה על הכנסות</p>
                    <p className="text-3xl font-bold text-white">+42%</p>
                  </div>
                </div>
              </div>

              {/* Search to Cart Conversions Section */}
              <section className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-6">
                <div className="border-b border-gray-100 p-5">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-800">
                      שאילתות החיפוש המובילות להמרה
                    </h2>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          שאילתת חיפוש
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          הוספות לעגלה
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          הכנסות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                          יין אדום לארוחת סטייק
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                            127
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">₪13,970.00</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                          שעון GPS לריצה
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                            89
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">₪81,520.00</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                          מתנת יום הולדת לבת
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                            76
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">₪16,720.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          </div>
        </section>

        {/* Features Section - Enhanced */}
        <section id="features" className="py-20 px-4 bg-white" dir="rtl">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100 hover:border-purple-200">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-6">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-gray-700">
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - Enhanced */}
        <section id="how-it-works" className="py-20 px-4 bg-purple-50" dir="rtl">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                התחל ב-3 שלבים פשוטים
              </h2>
              <p className="text-xl text-gray-600">
                ללא מפתחים, ללא הגדרה מורכבת, ללא כאבי ראש
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'התקן תוסף',
                  description: 'התקנה בלחיצה אחת מחנות האפליקציות של החנות שלך',
                  icon: 'INSTALL',
                  time: 'דקה אחת'
                },
                {
                  step: '2',
                  title: 'חבר חנות',
                  description: 'סנכרון אוטומטי עם קטלוג המוצרים והנתונים שלך',
                  icon: 'CONNECT',
                  time: '2 דקות'
                },
                {
                  step: '3',
                  title: 'צפה בקסם קורה',
                  description: 'לקוחות מוצאים מוצרים מהר יותר, קונים יותר, אוהבים את החנות שלך',
                  icon: 'MAGIC',
                  time: 'תוצאות מיידיות'
                }
              ].map((item, index) => (
                <div key={index} className="relative">
                  <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300">
                    <div className="absolute -top-6 -left-6 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {item.step}
                    </div>
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                    <p className="text-gray-600 mb-4">{item.description}</p>
                    <p className="text-sm text-purple-600 font-medium">{item.time}</p>
                  </div>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -left-4 transform -translate-y-1/2">
                      <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 bg-gray-50" dir="rtl">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                שאלות נפוצות
              </h2>
              <p className="text-xl text-gray-600">
                כל מה שאתה צריך לדעת על Semantix AI
              </p>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA - Enhanced */}
        <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600 relative overflow-hidden" dir="rtl">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full opacity-5 animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full opacity-5 animate-pulse"></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              מוכן להגדיל את המכירות שלך?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              הצטרף לעשרות חנויות שכבר משתמשות ב-Semantix AI כדי להגדיל את ההמרות ולהגדיל את ההכנסות
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => router.push('/login')}
                className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                התחל עכשיו - חינם
              </button>
              <button 
                onClick={() => router.push('/product')}
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-colors"
              >
                למידע נוסף
              </button>
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