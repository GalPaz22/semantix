'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, Shield, BarChart3, CheckCircle } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after a small delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      try {
        const savedPreferences = JSON.parse(consent);
        setPreferences(savedPreferences);
        
        // Initialize tracking based on preferences
        if (savedPreferences.analytics) {
          initializeAnalytics();
        }
      } catch (e) {
        console.error('Error loading cookie preferences:', e);
      }
    }
  }, []);

  const initializeAnalytics = () => {
    // Trigger Hotjar/ContentSquare if analytics are enabled
    if (typeof window !== 'undefined' && window.hj) {
      window.hj('trigger', 'consent_given');
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    savePreferences(onlyNecessary);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  const savePreferences = (prefs) => {
    localStorage.setItem('cookieConsent', JSON.stringify(prefs));
    setPreferences(prefs);
    
    // Initialize analytics if enabled
    if (prefs.analytics) {
      initializeAnalytics();
    }
    
    // Reload page to apply changes
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return; // Can't disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-slide-up" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-8">
              {!showSettings ? (
                // Main Banner
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Cookie className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      הפרטיות שלכם חשובה לנו
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      אנחנו משתמשים בעוגיות כדי לשפר את חוויית הגלישה, לנתח תנועה באתר ולהבין מאיפה מגיעים המבקרים שלנו.
                      בלחיצה על "אישור לכל", אתם מסכימים לשימוש בעוגיות, כולל כלי אנליטיקה כמו Hotjar.
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleAcceptAll}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                      >
                        <CheckCircle className="w-4 h-4" />
                        אישור לכל
                      </button>
                      
                      <button
                        onClick={handleRejectAll}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        דחייה לכל
                      </button>
                      
                      <button
                        onClick={() => setShowSettings(true)}
                        className="px-6 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
                      >
                        פרסונליזציה
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleRejectAll}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="סגירה"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                // Settings Panel
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      העדפות עוגיות
                    </h3>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    {/* Necessary Cookies */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex-shrink-0 mt-1">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">עוגיות הכרחיות</h4>
                          <div className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                            תמיד פעילות
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          עוגיות אלה חיוניות לתפקוד תקין של האתר. הן מאפשרות פונקציונליות ליבה כמו אבטחה, ניהול רשת ונגישות.
                        </p>
                      </div>
                    </div>
                    
                    {/* Analytics Cookies */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex-shrink-0 mt-1">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">עוגיות אנליטיקה</h4>
                          <button
                            onClick={() => togglePreference('analytics')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              preferences.analytics ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                preferences.analytics ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">
                          אנחנו משתמשים בשירותי אנליטיקה כמו Hotjar כדי להבין איך מבקרים מתנהגים באתר. זה עוזר לנו לשפר את החוויה שלכם.
                        </p>
                      </div>
                    </div>
                    
                    {/* Marketing Cookies */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex-shrink-0 mt-1">
                        <Cookie className="w-5 h-5 text-pink-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">עוגיות שיווק</h4>
                          <button
                            onClick={() => togglePreference('marketing')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              preferences.marketing ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                preferences.marketing ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">
                          עוגיות אלה עוקבות אחרי הפעילות שלכם ברשת כדי לעזור לנו להציג פרסום רלוונטי יותר, או להגביל כמה פעמים תראו מודעה.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSavePreferences}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <CheckCircle className="w-4 h-4" />
                      שמירת העדפות
                    </button>
                    
                    <button
                      onClick={() => setShowSettings(false)}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </>
  );
}
