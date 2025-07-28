"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBSCRIPTION_TIERS } from '/lib/paddle-config'; // Make sure this path is correct
import { Shield, Crown, CheckCircle, TrendingUp } from "lucide-react";

// Re-usable fullscreen message with improved styling
const FullScreenMsg = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
    <div className="text-xl text-gray-700 font-medium shadow-lg bg-white p-8 rounded-xl">
      {children}
    </div>
  </div>
);

export default function SubscriptionPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  // Handle subscription checkout
  const handleCheckout = async (tier) => {
    setCheckoutLoading(tier);
    setMessage('');

    try {
      // 1. Load Paddle.js if needed
      if (!window.Paddle) {
        const script = document.createElement('script');
        script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
        script.async = true;
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      // 2. Tell Paddle we're in sandbox mode (only if using test_ token)
      window.Paddle.Environment.set('sandbox');

      // 3. Initialize with your client-side token only
      window.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_PUBLIC_KEY  // e.g. 'test_…'
      });

      // 4. Open overlay
      window.Paddle.Checkout.open({
        items: [{
          price_id: SUBSCRIPTION_TIERS[tier].priceId, // Use the price ID from your config
          quantity: 1
        }],
        // For a public pricing page, success might redirect to login/dashboard or a thank you page
        // If user provides email during Paddle checkout, session might be created by webhook handler
        successUrl: `${window.location.origin}/dashboard?new_subscription=true`, // Or a dedicated success page
        cancelUrl: `${window.location.origin}/subscription?checkout_canceled=true`,
        // Customer email can be pre-filled if known, but for a public page, it's often not.
        // Paddle will ask for email if not provided.
      });

    } catch (err) {
      console.error('Subscription error:', err);
      setMessage(`Failed to start checkout: ${err.message}`);
    } finally {
      setCheckoutLoading(null);
    }
  };
  
  // Check for URL parameters (e.g., from Paddle redirect)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout_canceled')) {
      setMessage('Checkout process was canceled.');
    }
    if (params.get('error')) {
      setMessage(`An error occurred: ${params.get('error')}`);
    }
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16 px-4 sm:px-6 lg:px-8">
      {/* Launch Era Banner */}
      <div className="text-center mb-12" dir="rtl">
        <div className="inline-flex items-center px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-base font-semibold shadow-lg mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
          חינם כרגע! מחירי השקה
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-2">
          קבלו גישה מוקדמת – 0 ₪ לזמן מוגבל
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          כל המסלולים <span className="font-bold text-indigo-600">חינמיים</span> בתקופת ההשקה. תהנו מכל הפיצ'רים המתקדמים – ללא עלות!
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-xl mb-8 ${
          message.includes('Failed') || message.includes('error') || message.includes('canceled')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="text-sm underline opacity-75 hover:opacity-100"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8" dir="rtl">
        {/* Free Plan */}
        <div className="relative rounded-xl border-2 p-6 pt-12 transition-all flex flex-col border-gray-200 hover:border-indigo-300 bg-white shadow-lg hover:shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
              <Shield className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">חינם</h3>
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-extrabold text-gray-900">₪0</span>
                <span className="text-gray-500">/לחודש</span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="text-lg text-gray-400 line-through">₪0/לחודש</span>
                <span className="text-sm font-medium text-indigo-600">חינם כרגע!</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 h-10"></p>
          </div>
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">פיצ'רים בסיסיים</span></li>
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">שימוש מוגבל</span></li>
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">תמיכה קהילתית</span></li>
          </ul>
          <div className="mt-auto">
            <Link href="/login">
              <button className="w-full py-3 px-4 rounded-lg font-semibold transition-colors text-sm bg-gray-200 hover:bg-gray-300 text-gray-700">
                התחילו בחינם
              </button>
            </Link>
          </div>
        </div>
        {/* Pro Plan */}
        <div className="relative rounded-xl border-2 p-6 pt-12 transition-all flex flex-col border-indigo-500 bg-indigo-50 shadow-2xl">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-full shadow-md">הכי פופולרי</div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
              <Crown className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">פרו</h3>
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-extrabold text-gray-900">₪0</span>
                <span className="text-gray-500">/לחודש</span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="text-lg text-gray-400 line-through">₪19/לחודש</span>
                <span className="text-sm font-medium text-indigo-600">חינם כרגע!</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 h-10"></p>
          </div>
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">כל הפיצ'רים של חינם</span></li>
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">פיצ'רים מתקדמים</span></li>
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">תמיכה עדיפה</span></li>
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">מגבלות שימוש גבוהות</span></li>
          </ul>
          <div className="mt-auto">
            <button className="w-full py-3 px-4 rounded-lg font-semibold transition-colors text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg ">
              <TrendingUp className="w-4 h-4 mr-2 inline" />
              קבלו גישה מוקדמת
            </button>
          </div>
        </div>
        {/* Premium Plan */}
        <div className="relative rounded-xl border-2 p-6 pt-12 transition-all flex flex-col border-gray-200 hover:border-indigo-300 bg-white shadow-lg hover:shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
              <Crown className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">פרימיום</h3>
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-extrabold text-gray-900">₪0</span>
                <span className="text-gray-500">/לחודש</span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="text-lg text-gray-400 line-through">₪49/לחודש</span>
                <span className="text-sm font-medium text-indigo-600">חינם כרגע!</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 h-10"></p>
          </div>
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">כל הפיצ'רים של פרו</span></li>
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">פיצ'רים לארגונים</span></li>
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">שימוש ללא הגבלה</span></li>
            <li className="flex items-start text-sm"><CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /><span className="text-gray-700">תמיכה ייעודית</span></li>
          </ul>
          <div className="mt-auto">
            <button className="w-full py-3 px-4 rounded-lg font-semibold transition-colors text-sm bg-indigo-500 hover:bg-indigo-600 text-white ">
              <TrendingUp className="w-4 h-4 mr-2 inline" />
              קבלו גישה מוקדמת
            </button>
          </div>
        </div>
      </div>
      <div className="mt-16 text-center" dir="rtl">
        <div className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-50 border border-indigo-100">
          <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
          <p className="text-indigo-700 font-medium">חינם כרגע! מחירי השקה • לזמן מוגבל בלבד</p>
        </div>
        <p className="mt-4 text-gray-600">שאלות? <Link href="/contact" className="text-indigo-600 hover:underline font-medium">צרו קשר</Link>.</p>
      </div>
    </div>
  );
}