"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setIsLoading(true);
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("התחברות עם Google נכשלה.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100" dir="rtl">
      {/* Animated background shapes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-purple-300 to-pink-200 rounded-full filter blur-3xl opacity-30 animate-pulse z-0" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-blue-200 to-purple-200 rounded-full filter blur-3xl opacity-30 animate-pulse z-0" />
      <div className="w-full max-w-md z-10">
        <div className="bg-white/90 rounded-3xl shadow-2xl px-10 py-12 flex flex-col items-center relative">
          {/* Logo/Icon */}
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 48 48">
                <rect width="48" height="48" rx="24" fill="currentColor" />
                <text x="50%" y="56%" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="bold" fontFamily="sans-serif" dy=".3em">S</text>
              </svg>
            </div>
          </div>
          {/* Headline & tagline */}
          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-2">התחבר ל-Semantix AI</h1>
          <p className="text-lg text-gray-500 text-center mb-8">חיפוש מבוסס בינה מלאכותית לחנות שלך. השתמש בחשבון Google שלך כדי להמשיך.</p>
          {/* Google button with logo */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-white border-2 border-gray-200 rounded-xl font-semibold text-lg shadow-md hover:shadow-xl hover:border-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-70 mb-4"
            style={{ minHeight: 56 }}
          >
            <svg
              className="w-7 h-7"
              viewBox="0 0 533.5 544.3"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#4285F4"
                d="M533.5 278.4c0-17.7-1.6-34.7-4.6-51.2H272v96.9h146.9c-6.4 34-25.6 62.8-54.7 82v68.2h88.4c51.7-47.7 81.6-118.1 81.6-195.9z"
              />
              <path
                fill="#34A853"
                d="M272 544.3c73.7 0 135.4-24.3 180.5-66.1l-88.4-68.2c-24.5 16.4-55.6 26.1-92.1 26.1-70.9 0-131-47.9-152.3-112.1h-89v70.6C79.2 483.1 168.8 544.3 272 544.3z"
              />
              <path
                fill="#FBBC04"
                d="M119.7 323.9c-8.3-24.9-8.3-51.6 0-76.5v-70.6h-89c-39.1 77.8-39.1 169.7 0 247.5l89-70.4z"
              />
              <path
                fill="#EA4335"
                d="M272 107.7c39.9-.6 77.9 14.1 107 40.8l80.1-80.1C381.6 15.4 311.8-4.2 238 0 134.8 0 45.2 61.2 13.7 149.3l89 70.6C141 155.5 201.1 107.7 272 107.7z"
              />
            </svg>
            {isLoading ? "מפנה..." : "המשך עם Google"}
          </button>
          {/* Error message */}
          {error && (
            <div className="w-full mt-2 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-center animate-pulse shadow-sm">
              <span className="font-semibold">{error}</span>
            </div>
          )}
          {/* sign‑up note */}
          <p className="text-center text-gray-500 text-base mt-8">
            אין לך חשבון?{' '}
            <a
              onClick={handleGoogleSignIn}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer transition-colors"
            >
              הירשם עם Google
            </a>
          </p>
        </div>
      </div>
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .animate-pulse {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
