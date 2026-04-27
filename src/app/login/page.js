"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setGoogleLoading(true);
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("התחברות עם Google נכשלה.");
      setGoogleLoading(false);
    }
  };

  const handleCredentialsSignIn = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("יש להזין שם משתמש וסיסמה.");
      return;
    }
    setError("");
    setCredLoading(true);
    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("שם משתמש או סיסמה שגויים.");
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("אירעה שגיאה, נסה שנית.");
    } finally {
      setCredLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100"
      dir="rtl"
    >
      {/* Animated background shapes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-purple-300 to-pink-200 rounded-full filter blur-3xl opacity-30 animate-pulse z-0" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-blue-200 to-purple-200 rounded-full filter blur-3xl opacity-30 animate-pulse z-0" />

      <div className="w-full max-w-md z-10">
        <div className="bg-white/90 rounded-3xl shadow-2xl px-10 py-12 flex flex-col items-center relative">
          {/* Logo */}
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 48 48">
                <rect width="48" height="48" rx="24" fill="currentColor" />
                <text x="50%" y="56%" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="bold" fontFamily="sans-serif" dy=".3em">S</text>
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-2">התחבר ל-Semantix AI</h1>
          <p className="text-base text-gray-500 text-center mb-8">חיפוש מבוסס בינה מלאכותית לחנות שלך.</p>

          {/* Google button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || credLoading}
            className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-white border-2 border-gray-200 rounded-xl font-semibold text-lg shadow-md hover:shadow-xl hover:border-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-70 mb-6"
            style={{ minHeight: 56 }}
          >
            <svg className="w-7 h-7" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M533.5 278.4c0-17.7-1.6-34.7-4.6-51.2H272v96.9h146.9c-6.4 34-25.6 62.8-54.7 82v68.2h88.4c51.7-47.7 81.6-118.1 81.6-195.9z" />
              <path fill="#34A853" d="M272 544.3c73.7 0 135.4-24.3 180.5-66.1l-88.4-68.2c-24.5 16.4-55.6 26.1-92.1 26.1-70.9 0-131-47.9-152.3-112.1h-89v70.6C79.2 483.1 168.8 544.3 272 544.3z" />
              <path fill="#FBBC04" d="M119.7 323.9c-8.3-24.9-8.3-51.6 0-76.5v-70.6h-89c-39.1 77.8-39.1 169.7 0 247.5l89-70.4z" />
              <path fill="#EA4335" d="M272 107.7c39.9-.6 77.9 14.1 107 40.8l80.1-80.1C381.6 15.4 311.8-4.2 238 0 134.8 0 45.2 61.2 13.7 149.3l89 70.6C141 155.5 201.1 107.7 272 107.7z" />
            </svg>
            {googleLoading ? "מפנה..." : "המשך עם Google"}
          </button>

          {/* Divider */}
          <div className="w-full flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400 font-medium">או</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentialsSignIn} className="w-full space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">שם משתמש</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="הזן שם משתמש"
                autoComplete="username"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="הזן סיסמה"
                autoComplete="current-password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={credLoading || googleLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-xl hover:from-purple-700 hover:to-pink-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {credLoading ? "מתחבר..." : "התחבר"}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="w-full mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-center text-sm font-medium">
              {error}
            </div>
          )}
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
