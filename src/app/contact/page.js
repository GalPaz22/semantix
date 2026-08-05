"use client";

import { useEffect, useState } from "react";
import { getStoredMarketingAttribution, captureMarketingAttribution } from "../lib/marketing-attribution";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    company: "",
    websiteUrl: "",
    message: "",
  });

  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    captureMarketingAttribution();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          attribution: getStoredMarketingAttribution(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: "success",
          message: "תודה — קיבלנו. נחזור אליכם תוך יום עסקים אחד.",
        });
        setFormData({
          fullName: "",
          email: "",
          company: "",
          websiteUrl: "",
          message: "",
        });
      } else {
        setStatus({ type: "error", message: data.error || "משהו השתבש. נסו שוב." });
      }
    } catch (error) {
      setStatus({ type: "error", message: "שגיאת רשת. נסו שוב." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden px-4 py-10 sm:py-14" dir="rtl">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,#f2e9ff_0%,#f7f2ff_50%,#f2e9ff_100%)] bg-[length:200%_100%] animate-[gradientShift_18s_ease_infinite]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-300/40 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute top-32 -right-24 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl animate-blob animation-delay-2000" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-pink-300/30 blur-3xl animate-blob animation-delay-4000" />
      <div className="max-w-5xl mx-auto">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] items-start">
          {/* Left: conversion copy */}
          <div className="rounded-2xl border border-purple-200 bg-white/70 p-5 shadow-xl backdrop-blur sm:p-7">
            <div className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              קבעו הדגמה של 10 דקות
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">
              ראו איך Semantix מחזירה ביקוש תוך דקות.
            </h1>
            <p className="mt-3 text-gray-600">
              נראה לכם איך Search Saver מציל חיפושים ללא תוצאות — ואיך Semantix Search
              משדרגת דירוג לכל השאר — בלי לבנות מחדש את חזית החנות.
            </p>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-sm font-semibold text-gray-900">מה קורה אחר כך</div>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>• נחזור אליכם תוך יום עסקים אחד</li>
                <li>• בדיקת התאמה קצרה + סיור של 10 דקות</li>
                <li>• אם זה מתאים — עולים לאוויר תוך דקות</li>
              </ul>
            </div>
          </div>

          {/* Right: short form */}
          <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">ספרו לנו מאיפה להתחיל</h2>
              <p className="text-sm text-gray-600">ארבעה שדות. תשובה מהירה.</p>
            </div>

            {/* Status Messages */}
            {status.message && (
              <div
                className={`mb-5 p-4 rounded-lg ${
                  status.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fullName" className="block text-gray-900 text-sm font-medium mb-2">
                    שם מלא
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="ישראל ישראלי"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-gray-900 text-sm font-medium mb-2">
                    אימייל עבודה
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@company.com"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="company" className="block text-gray-900 text-sm font-medium mb-2">
                    חברה (אופציונלי)
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="שם החנות"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="websiteUrl" className="block text-gray-900 text-sm font-medium mb-2">
                    כתובת האתר (אופציונלי)
                  </label>
                  <input
                    type="url"
                    id="websiteUrl"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleChange}
                    placeholder="https://yourstore.com"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-gray-900 text-sm font-medium mb-2">
                  משהו שכדאי שנדע? (אופציונלי)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="למשל: שיעור המרה, ספק חיפוש, כאב עיקרי…"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl transform hover:scale-[1.02] text-base"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    שולחים...
                  </span>
                ) : (
                  "קבעו הדגמה של 10 דקות"
                )}
              </button>

              <p className="text-center text-xs text-gray-500">
                בלי ספאם. נחזור אליכם תוך יום עסקים אחד.
              </p>
            </form>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 0%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>
    </div>
  );
}
