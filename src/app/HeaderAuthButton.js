"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserCircle, LayoutDashboard, LogOut, LogIn } from "lucide-react";
import Link from "next/link";

export default function HeaderAuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Close popover when clicking outside
  useEffect(() => {
    function onClick(e) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Position popover under the icon
  useEffect(() => {
    if (!show || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const w = Math.min(260, window.innerWidth * 0.9);
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - w - 10));
    setPos({ top: rect.bottom + window.scrollY + 8, left });
  }, [show]);

  // Close popover after successfully signing in
  useEffect(() => {
    if (status === "authenticated") {
      setShow(false);
    }
  }, [status]);

  /* ──────────────────────────────────────────────────────────── */
  /*  helpers                                                   */
  const googleSignIn = () =>
    signIn("google", {
      callbackUrl: "/dashboard",
      authorizationParams: { 
        prompt: "select_account",
        access_type: "offline"
      }
    });

  const credentialsSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await signIn("credentials", {
        username: credentials.username,
        password: credentials.password,
        redirect: false,
      });
      
      if (result?.error) {
        alert("שגיאה בהתחברות: " + result.error);
      } else {
        router.push("/dashboard");
        setShow(false);
      }
    } catch (error) {
      alert("שגיאה בהתחברות");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // First clear any local state/storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear any Google OAuth tokens from the browser
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('google') || name.includes('oauth') || name.includes('auth')) {
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          }
        }
      }
      
      // Sign out with callback to force account selection on next login
      await signOut({ 
        callbackUrl: '/',
        redirect: true
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: force reload if something goes wrong
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Always LTR so the element stays left-to-right aligned */}
      <div dir="ltr" className="relative z-[9999]">
        {session ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-xs sm:text-sm font-medium transform hover:translate-y-[-1px] active:translate-y-[1px] min-w-[44px] justify-center sm:justify-start"
            >
              <LayoutDashboard size={16} className="stroke-[2.5] sm:w-[18px] sm:h-[18px] flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">לוח בקרה</span>
            </Link>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-300 text-xs sm:text-sm font-medium min-w-[44px] justify-center sm:justify-start"
              aria-label="התנתק"
            >
              <LogOut size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">התנתק</span>
            </button>
          </div>
        ) : (
          <button
            ref={buttonRef}
            onClick={() => setShow((s) => !s)}
            className="flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-xs sm:text-sm font-medium min-w-[44px] justify-center sm:justify-start"
            aria-label="התחבר"
          >
            <LogIn size={16} className="stroke-[2] sm:w-[18px] sm:h-[18px] flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">התחבר</span>
          </button>
        )}
      </div>

      {/* Popover (for unauthenticated users) - This will also be hidden as the button that triggers it is now null */}
      {show && status !== "authenticated" && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            width: "min(300px,90vw)",
            zIndex: 9999
          }}
          className="bg-white rounded-lg shadow-xl p-5 border border-gray-100 animate-fadeIn"
        >
          <h2 className="text-center text-base font-medium text-gray-800 mb-4">
            ברוכים הבאים ל-Semantix
          </h2>
          
          {/* Username/Password Login */}
          <form onSubmit={credentialsSignIn} className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם משתמש
              </label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="username"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סיסמה
              </label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'מתחבר...' : 'התחבר'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">או</span>
            </div>
          </div>

          {/* Google Login */}
          <button
            onClick={googleSignIn}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-sm">
              המשך עם Google
            </span>
          </button>
          
          <p className="mt-4 text-xs text-gray-500 text-center">
            אם אין לך חשבון, הוא ייוצר אוטומטית.
          </p>
        </div>,
        document.body
      )}
    </>
  );
}