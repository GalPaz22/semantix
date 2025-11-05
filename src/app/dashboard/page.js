'use client'
import React, { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MenuConnector from '../components/MenuConnector';
import ProductsPanel from '../components/ProductsPanel';

// ===============================
// Add this to your existing dashboard file
// ===============================

// Import the subscription-related components at the top
import { useUserDetails } from '../hooks/useUserDetails'; // Make sure this path is correct
import { SUBSCRIPTION_TIERS } from '/lib/paddle-config'; // Make sure this path is correct
import CancellationModal from '../components/CancellationModal';

// Lucide icons
import {
  LayoutDashboard,
  ListTodo,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Download,
  Search,
  Bell,
  HelpCircle,
  Shield,
  ChevronDown,
  Calendar,
  Filter,
  LogOut,
  Copy,
  RefreshCw,
  CreditCard, // Add this icon
  Crown,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ShoppingCart,
  Package,
  
} from "lucide-react";


// Re‑usable fullscreen message with improved styling
const FullScreenMsg = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
    <div className="text-xl text-gray-700 font-medium shadow-lg bg-white p-8 rounded-xl">
      {children}
    </div>
  </div>
);


function SubscriptionPanel({ session, onboarding }) {
  const { 
    userDetails,
    tier: currentTier, 
    subscriptionStatus, 
    paddleSubscriptionId,
    nextBillDate,
    loading: userLoading,
    refreshUserDetails
  } = useUserDetails();
  const router = useRouter(); // useRouter is already imported at the top of the file
  
  const [loading, setLoading] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  // Effect to refresh user details on successful new subscription
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new_subscription') === 'true' || params.get('success') === 'true') { // Check for both possible params
      console.log('[SubscriptionPanel] Detected successful subscription/update, refreshing user details.');
      refreshUserDetails();
      // Clean the URL to remove the query parameters, preventing re-trigger on refresh
      const currentPath = window.location.pathname;
      router.replace(currentPath, undefined, { shallow: true });
      // Display a success message if not already handled by Paddle checkout page message prop
      if (!message) { // Avoid overwriting other messages
        setMessage('המנוי עודכן בהצלחה!');
      }
    }
  }, [refreshUserDetails, router, message]); // Add message to dependency array to avoid stale closure issue if setMessage is called inside

  const isActiveSubscription = currentTier !== 'free' && 
    ['active', 'trialing'].includes(subscriptionStatus);
  const isPendingCancellation = subscriptionStatus === 'canceled';
  const currentTierConfig = SUBSCRIPTION_TIERS[currentTier];

  // Handle subscription upgrade/change
  const handleUpgrade = async (tier) => {
    if (!session) {
      setMessage('אנא התחבר כדי להירשם');
      return;
    }

    setUpgradeLoading(tier);
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

      // 4. Open overlay—use the correct `items` + `subscription_plan`
      window.Paddle.Checkout.open({
        items: [{
          price_id: SUBSCRIPTION_TIERS[tier].priceId, // Use the price ID from your config
          quantity: 1
        }],
        successUrl: `₪{window.location.origin}/subscription/success`,
        cancelUrl: `₪{window.location.origin}/subscription/cancele`,
        customer: {
          email: session.user.email
        },
        custom_data: {
          userEmail: session.user.email,
          userId: session.user.id,
          userName: session.user.name
        },
        business: {
          name: session.user.name || undefined
        }
      });

    } catch (err) {
      console.error('Subscription error:', err);
      setMessage(`נכשל להתחיל תהליך התשלום: ₪{err.message}`);
    } finally {
      setUpgradeLoading(null);
    }
  };

  // Handle subscription cancellation
  const handleCancelConfirm = async (immediate, feedback) => {
    setLoading('cancel');
    setCancelError(null);

    try {
      const response = await fetch('/api/cancel-paddle-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: paddleSubscriptionId,
          immediate: immediate,
          feedback: feedback
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'נכשל לבטל את המנוי');
      }

      setCancelModalOpen(false);
      setMessage(immediate 
        ? 'המנוי בוטל מיידית' 
        : 'המנוי יבוטל בסוף תקופת החיוב'
      );
      
      // Refresh user details to get updated status
      setTimeout(refreshUserDetails, 1000);

    } catch (error) {
      console.error('Cancellation error:', error);
      setCancelError(error.message);
    } finally {
      setLoading(null);
    }
  };

  // Handle subscription reactivation
  const handleReactivate = async () => {
    setLoading('reactivate');
    try {
      const response = await fetch('/api/reactivate-paddle-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: paddleSubscriptionId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'נכשל להפעיל מחדש את המנוי');
      }

      setMessage('המנוי הופעל מחדש בהצלחה');
      setTimeout(refreshUserDetails, 1000);

    } catch (error) {
      console.error('Reactivation error:', error);
      setMessage('נכשל להפעיל מחדש את המנוי. אנא נסה שוב.');
    } finally {
      setLoading(null);
    }
  };

  // Format date helper
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSubscriptionStatusBadge = () => {
    let badgeText = '';
    let badgeClass = '';

    switch (subscriptionStatus) {
      case 'active':
      case 'trialing':
        badgeText = 'פעיל';
        badgeClass = 'bg-green-100 text-green-800';
        break;
      case 'paused':
        badgeText = 'מושהה';
        badgeClass = 'bg-yellow-100 text-yellow-800';
        break;
      case 'canceled':
        badgeText = 'בוטל';
        badgeClass = 'bg-red-100 text-red-800';
        break;
      case 'past_due':
        badgeText = 'פג תוקף';
        badgeClass = 'bg-orange-100 text-orange-800';
        break;
      default:
        badgeText = 'חינמי';
        badgeClass = 'bg-gray-100 text-gray-600';
        break;
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ₪{badgeClass}`}>
        {badgeText}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8" dir="rtl">
      {/* Page Header */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="relative p-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">ניהול מנוי</h1>
              <p className="text-indigo-100">
                נהל את המנוי והעדפות החיוב שלך
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white/80 text-sm">תוכנית נוכחית</p>
                <p className="text-2xl font-bold text-white capitalize">{currentTier}</p>
              </div>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                {currentTier === 'free' ? (
                  <Shield className="w-8 h-8 text-white" />
                ) : (
                  <Crown className="w-8 h-8 text-yellow-300" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-xl ₪{
          message.includes('נכשל') || message.includes('error')
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-green-50 text-green-800 border border-green-200'
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

      {/* Current Subscription Status */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">מנוי נוכחי</h2>
              <p className="text-gray-600 mt-1">התוכנית הפעילה שלך ומידע החיוב</p>
            </div>
            {getSubscriptionStatusBadge()}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan Details */}
            <div>
              {currentTierConfig && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      {currentTier === 'free' ? (
                        <Shield className="w-8 h-8 text-white" />
                      ) : (
                        <Crown className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{currentTierConfig.name}</h3>
                      <p className="text-lg text-gray-600">
                        {currentTierConfig.price > 0 ? `₪₪{currentTierConfig.price}/חודש` : 'חינמי לתמיד'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">תכונות התוכנית</h4>
                    <div className="space-y-2">
                      {currentTierConfig.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Billing Information */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">מידע חיוב</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">סטטוס</span>
                    {getSubscriptionStatusBadge()}
                  </div>
                  
                  {nextBillDate && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">חיוב הבא</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(nextBillDate)}
                      </span>
                    </div>
                  )}

                  {paddleSubscriptionId && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">מזהה מנוי</span>
                      <span className="font-mono text-sm text-gray-500">
                        {paddleSubscriptionId.slice(-8)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isPendingCancellation ? (
                  <button
                    onClick={handleReactivate}
                    disabled={loading === 'reactivate'}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading === 'reactivate' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        מעבד...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        הפעל מחדש מנוי
                      </>
                    )}
                  </button>
                ) : isActiveSubscription ? (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    בטל מנוי
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800">תוכניות זמינות</h2>
          <p className="text-gray-600 mt-1">בחר את התוכנית שמתאימה לצרכים שלך</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(SUBSCRIPTION_TIERS).map(([key, plan]) => (
              <div
                key={key}
                className={`relative rounded-xl border-2 p-6 transition-all ₪{
                  plan.tier === currentTier
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                }`}
              >
                {plan.tier === currentTier && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    תוכנית נוכחית
                  </div>
                )}

                {plan.tier === 'pro' && plan.tier !== currentTier && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                    הפופולרי ביותר
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">₪{plan.price}</span>
                    <span className="text-gray-500">/חודש</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-center">
                  {plan.tier === currentTier && !isPendingCancellation ? (
                    <div className="bg-green-100 text-green-700 py-2 px-4 rounded-lg font-medium text-sm">
                      התוכנית הנוכחית שלך
                    </div>
                  ) : plan.tier === 'free' ? (
                    <div className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium text-sm">
                      חינמי לתמיד
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.tier)}
                      disabled={upgradeLoading === plan.tier}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ₪{
                        plan.tier === 'pro'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      } ₪{
                        upgradeLoading === plan.tier ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {upgradeLoading === plan.tier ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          מעבד...
                        </span>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 mr-2 inline" />
                          {currentTier === 'free' ? 'התחל עכשיו' : 'שדרג'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800">היסטוריית חיוב</h2>
          <p className="text-gray-600 mt-1">עסקאות המנוי האחרונות שלך</p>
        </div>

        <div className="p-6">
          {isActiveSubscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">תוכנית {currentTierConfig?.name}</p>
                  <p className="text-sm text-gray-500">
                    {nextBillDate && `חיוב הבא: ₪{formatDate(nextBillDate)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">₪{currentTierConfig?.price}</p>
                  <p className="text-sm text-green-600">פעיל</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>היסטוריית חיוב מלאה תהיה זמינה בקרוב</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>אין היסטוריית חיוב זמינה</p>
              <p className="text-sm mt-1">שדרג לתוכנית בתשלום כדי לראות היסטוריית חיוב</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
        currentTier={currentTier}
        loading={loading === 'cancel'}
        error={cancelError}
      />
    </div>
  );
}



// Panel components now receive both session and onboarding
function AnalyticsPanel({ session, onboarding }) {
  // Use onboarding.credentials.dbName (if available) as the database name.
  const onboardDB = onboarding?.credentials?.dbName || "";
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Add state for cart analytics
  const [cartAnalytics, setCartAnalytics] = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [cartError, setCartError] = useState("");

  const [filters, setFilters] = useState({
    category: "",
    type: "",
    minPrice: "",
    maxPrice: ""
  });
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Date filtering defaults and pagination state.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Time period dropdown states
  const [timePeriodOpen, setTimePeriodOpen] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("30d");

  // Time period options
  const timePeriods = [
    { value: "today", label: "היום", days: 0 },
    { value: "7d", label: "7 ימים אחרונים", days: 7 },
    { value: "30d", label: "30 ימים אחרונים", days: 30 },
    { value: "90d", label: "90 ימים אחרונים", days: 90 },
    { value: "1y", label: "שנה אחרונה", days: 365 },
    { value: "all", label: "כל הנתונים", days: null }
  ];

  // Handle time period selection
  const handleTimePeriodChange = (period) => {
    setSelectedTimePeriod(period.value);
    setTimePeriodOpen(false);
    
    if (period.value === "all") {
      setStartDate("");
      setEndDate("");
    } else if (period.value === "today") {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period.days !== null) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period.days);
      
      setStartDate(startDate.toISOString().split('T')[0]);
      setEndDate(endDate.toISOString().split('T')[0]);
    }
  };

  // Get current time period label
  const getCurrentTimePeriodLabel = () => {
    const period = timePeriods.find(p => p.value === selectedTimePeriod);
    return period ? period.label : "30 ימים אחרונים";
  };

  // Initialize default time period (30 days)
  useEffect(() => {
    const defaultPeriod = timePeriods.find(p => p.value === "30d");
    if (defaultPeriod) {
      handleTimePeriodChange(defaultPeriod);
    }
  }, []); // Only run once on mount

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setTimePeriodOpen(false);
      }
    };
    
    if (timePeriodOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [timePeriodOpen]);

  useEffect(() => {
    if (!onboardDB) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("https://dashboard-server-ae00.onrender.com/queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbName: onboardDB })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error fetching queries");
        setQueries(data.queries);
        setCurrentPage(1);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [onboardDB]);

  // Fetch cart analytics data
  useEffect(() => {
    if (!onboardDB) return;
    (async () => {
      setLoadingCart(true);
      setCartError("");
      try {
        const res = await fetch("/api/cart-analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbName: onboardDB })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error fetching cart analytics");
        setCartAnalytics(data.cartItems || []);
      } catch (err) {
        setCartError(err.message);
      } finally {
        setLoadingCart(false);
      }
    })();
  }, [onboardDB]);

  // Compute category options.
  useEffect(() => {
    const allCategories = [];
    queries.forEach(q => {
      if (typeof q.category === "string" && q.category.trim()) {
        allCategories.push(q.category.trim().toLowerCase());
      } else if (Array.isArray(q.category)) {
        q.category.forEach(cat => {
          if (typeof cat === "string" && cat.trim()) {
            allCategories.push(cat.trim().toLowerCase());
          }
        });
      }
    });
    const uniqueCategories = Array.from(new Set(allCategories));
    const displayCategories = uniqueCategories.map(
      cat => cat.charAt(0).toUpperCase() + cat.slice(1)
    );
    setCategoryOptions(displayCategories);
  }, [queries]);

  const filteredQueries = queries.filter(q => {
    let match = true;
    if (filters.category) {
      const selected = filters.category.toLowerCase();
      if (typeof q.category === "string") {
        if (q.category.trim().toLowerCase() !== selected) match = false;
      } else if (Array.isArray(q.category)) {
        const hasMatch = q.category.some(cat => typeof cat === "string" && cat.trim().toLowerCase() === selected);
        if (!hasMatch) match = false;
      } else {
        match = false;
      }
    }
    if (filters.type && q.type !== filters.type) match = false;
    if (filters.minPrice && q.price < parseFloat(filters.minPrice)) match = false;
    if (filters.maxPrice && q.price > parseFloat(filters.maxPrice)) match = false;
    if (startDate || endDate) {
      const queryDate = new Date(q.timestamp);
      if (startDate) if (queryDate < new Date(startDate)) match = false;
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        if (queryDate > end) match = false;
      }
    }
    return match;
  });
  
  const totalLoaded = queries.length;
  const filteredCount = filteredQueries.length;
  const totalPages = Math.ceil(filteredCount / itemsPerPage);
  const displayedQueries = filteredQueries
    .slice(0)
    .reverse()
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  if (totalPages > maxPageButtons) {
    if (currentPage <= 3) {
      startPage = 1;
      endPage = maxPageButtons;
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - maxPageButtons + 1;
      endPage = totalPages;
    }
  } else {
    startPage = 1;
    endPage = totalPages;
  }
  const paginationNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    paginationNumbers.push(i);
  }
  const handlePrevious = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePageClick = num => setCurrentPage(num);
  
  const downloadCSV = () => {
    const headers = ["Query","Timestamp","Category","Price","Min Price","Max Price","Type","Entity"];
    const rows = filteredQueries.map(q =>
      [
        `"₪{(q.query || "").replace(/"/g, '""')}"`,
        `"₪{new Date(q.timestamp).toLocaleString()}"`,
        `"₪{Array.isArray(q.category) ? q.category.join(", ") : (q.category || "")}"`,
        `"₪{q.price || ""}"`,
        `"₪{q.minPrice || ""}"`,
        `"₪{q.maxPrice || ""}"`,
        `"₪{q.type || ""}"`,
        `"₪{q.entity || ""}"`
      ].join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "queries.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate cart conversion metrics
  const cartMetrics = useMemo(() => {
    if (!cartAnalytics.length || !filteredQueries.length) return { 
      conversionRate: 0, 
      totalCartItems: 0,
      topQueries: []
    };

    // Filter cart analytics based on the same time period as queries
    const filteredCartAnalytics = cartAnalytics.filter(item => {
      if (!startDate && !endDate) return true;
      
      const itemDate = new Date(item.timestamp || item.created_at);
      if (startDate && itemDate < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        if (itemDate > end) return false;
      }
      return true;
    });

    const totalCartItems = filteredCartAnalytics.length;
    const conversionRate = ((totalCartItems / filteredQueries.length) * 100).toFixed(2);
    
    // Group by search query to find top converting queries
    const queryGroups = {};
    filteredCartAnalytics.forEach(item => {
      if (!item.search_query) return;
      
      if (!queryGroups[item.search_query]) {
        queryGroups[item.search_query] = {
          query: item.search_query,
          count: 0,
          products: new Set(),
          revenue: 0
        };
      }
      
      queryGroups[item.search_query].count += 1;
      queryGroups[item.search_query].products.add(item.product_id);
      
      // Calculate revenue if price is available
      if (item.product_price) {
        const price = parseFloat(item.product_price.replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          queryGroups[item.search_query].revenue += price * (item.quantity || 1);
        }
      }
    });
    
    // Convert to array and sort by count
    const topQueries = Object.values(queryGroups)
      .map(group => ({
        ...group,
        products: Array.from(group.products).length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Get top 10
    
    return {
      conversionRate,
      totalCartItems,
      topQueries
    };
  }, [cartAnalytics, filteredQueries, startDate, endDate]);

  return (
    <div className="w-full">
      {/* Page Header with Card-like Design */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="relative p-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">לוח בקרה</h1>
              <p className="text-indigo-100">
                ברוך שובך, {session?.user?.name || "משתמש"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
              <div className="relative">
                <button 
                  onClick={() => setTimePeriodOpen(!timePeriodOpen)}
                  className="flex items-center justify-center px-2 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white backdrop-blur-sm"
                >
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">{getCurrentTimePeriodLabel()}</span>
                  <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2 transition-transform ₪{timePeriodOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {timePeriodOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setTimePeriodOpen(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden" style={{ direction: 'rtl' }}>
                      {timePeriods.map((period) => (
                        <button
                          key={period.value}
                          onClick={() => handleTimePeriodChange(period)}
                          className={`w-full px-4 py-3 text-right hover:bg-gray-50 transition-colors text-sm ₪{
                            selectedTimePeriod === period.value
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button onClick={downloadCSV} className="flex items-center justify-center px-2 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white backdrop-blur-sm">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">ייצא נתונים</span>
              </button>
            </div>
          </div>
          
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-white/5 backdrop-blur-sm border-t border-white/10">
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">סה"כ שאילתות</p>
              <p className="text-3xl font-bold text-white">{filteredCount.toLocaleString()}</p>
              <p className="text-white/70 text-xs mt-2">
                {getCurrentTimePeriodLabel()}
              </p>
            </div>
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">3 שאילתות מובילות היום</p>
              <div className="space-y-2">
                {(() => {
                  // Get today's date
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Use filtered queries based on selected time period
                  let queriesToAnalyze = filteredQueries;
                  let sourceLabel = getCurrentTimePeriodLabel();
                  
                  // If it's "today" specifically, also check for actual today's queries
                  if (selectedTimePeriod === "today") {
                    const actualTodayQueries = filteredQueries.filter(q => {
                      const queryDate = new Date(q.timestamp);
                      queryDate.setHours(0, 0, 0, 0);
                      return queryDate.getTime() === today.getTime();
                    });
                    queriesToAnalyze = actualTodayQueries;
                    sourceLabel = actualTodayQueries.length > 0 ? "היום" : "אין שאילתות היום";
                  }
                  
                  if (queriesToAnalyze.length === 0) {
                    return (
                      <div className="text-white/80 text-sm">
                        אין נתונים זמינים
                      </div>
                    );
                  }
                  
                  // Count query frequency
                  const queryCount = {};
                  queriesToAnalyze.forEach(q => {
                    queryCount[q.query] = (queryCount[q.query] || 0) + 1;
                  });
                  
                  // Get top 3 queries
                  const topQueries = Object.entries(queryCount)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3);
                  
                  return (
                    <div className="space-y-2">
                      {topQueries.map(([query, count], index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <span className="text-white/90 font-bold text-sm bg-white/20 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm leading-tight truncate">
                              {query}
                            </p>
                            <p className="text-white/60 text-xs">
                              {count} פעמים
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <p className="text-white/60 text-xs">
                          {queriesToAnalyze.length} שאילתות {sourceLabel === "היום" ? "היום" : `ב₪{sourceLabel}`}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* New cart conversion rate metric */}
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">המרת עגלה</p>
              <p className="text-3xl font-bold text-white">
                {cartMetrics.conversionRate}%
              </p>
              <p className="text-white/70 text-xs mt-2">
                {cartMetrics.totalCartItems} פריטים נוספו לעגלה
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Section - Card Design */}
      <section className="bg-white rounded-xl shadow-md p-0 mb-8 overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-indigo-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">
              סנן נתוני אנליטיקה
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                קטגוריה
              </label>
              <div className="relative">
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                  className="w-full p-3 pl-4 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white appearance-none shadow-sm text-gray-600"
                >
                  <option value="">כל הקטגוריות</option>
                  {categoryOptions.map((cat, idx) => (
                    <option key={idx} value={cat.toLowerCase()}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            {/* Other filter options */}
          </div>
        </div>
        
        <div className="bg-gray-50 py-4 px-6 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div className="flex flex-col sm:flex-row sm:space-x-8 mb-4 sm:mb-0">
            <p className="text-gray-600 font-medium flex items-center">
              <span className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
              סה"כ נטען: <span className="text-indigo-600 font-bold ml-1">{totalLoaded}</span>
            </p>
            <p className="text-gray-600 font-medium flex items-center mt-2 sm:mt-0">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
              תואם לסינון: <span className="text-purple-600 font-bold ml-1">{filteredCount}</span>
            </p>
          </div>
          {/* Download CSV Button */}
          {filteredCount > 0 && (
            <button
              onClick={downloadCSV}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              הורד CSV
            </button>
          )}
        </div>
      </section>

      {/* Cart Analytics Section */}
      {cartAnalytics.length > 0 && (
        <section className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 text-indigo-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">
                המרות מחיפוש לעגלה
              </h2>
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="text-md font-medium text-gray-700 mb-4">שאילתות החיפוש המובילות להמרה</h3>
            
            {loadingCart ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : cartError ? (
              <div className="text-center text-red-500 p-4">{cartError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        שאילתת חיפוש
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        הוספות לעגלה
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        מוצרים ייחודיים
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        הכנסות משוערות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cartMetrics.topQueries.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                          {item.query}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                            {item.count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.products}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          ₪{item.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {cartMetrics.topQueries.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-700 mb-4">תרשים המרות</h3>
                <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-end justify-around">
                  {cartMetrics.topQueries.slice(0, 5).map((item, index) => {
                    // Calculate relative height (50% to 100% of container)
                    const maxCount = Math.max(...cartMetrics.topQueries.slice(0, 5).map(q => q.count));
                    const height = 50 + ((item.count / maxCount) * 50);
                    
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div 
                          className="bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-md w-16 shadow-md"
                          style={{ height: `₪{height}%` }}
                        >
                          <div className="text-white text-center font-bold py-2">
                            {item.count}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 max-w-[80px] truncate text-center" title={item.query}>
                          {item.query}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Table Section - Enhanced Design */}
      {filteredQueries.length > 0 && (
        <section className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-800">
              תוצאות שאילתות ({filteredCount})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    שאילתה
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    זמן
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    קטגוריה
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedQueries.map((query, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium text-right">
                      {query.query}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {new Date(query.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {Array.isArray(query.category) 
                        ? query.category.map((cat, i) => (
                            <span key={i} className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full mr-1 mb-1">{cat}</span>
                          ))
                        : <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">{query.category}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <nav className="flex items-center justify-between">
                <div className="hidden sm:block">
                  <p className="text-sm text-gray-700">
                    מציג <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> עד{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredCount)}
                    </span>{" "}
                    מתוך <span className="font-medium">{filteredCount}</span> תוצאות
                  </p>
                </div>
                <div className="flex-1 flex justify-center sm:justify-end">
                  <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ₪{
                      currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    } mr-4`}
                  >
                    קודם
                  </button>
                  
                  <div className="hidden md:flex">
                    {paginationNumbers.map(num => (
                      <button
                        key={num}
                        onClick={() => handlePageClick(num)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium mx-1 rounded-md ₪{
                          currentPage === num
                            ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ₪{
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    } ml-4`}
                  >
                    הבא
                  </button>
                </div>
              </nav>
            </div>
          )}
        </section>
      )}
    </div>
  );
}



function SettingsPanel({ session, onboarding, handleDownload: externalDownload }) {
  
  // Debug what we receive in props
  console.log("🔍 SETTINGS PANEL PROPS:");
  console.log("onboarding:", onboarding);
  console.log("onboarding?.credentials:", onboarding?.credentials);
  
  // Use the onboarding payload to populate initial state.
  const [dbName, setDbName] = useState(onboarding?.credentials?.dbName || "");
  const [categories, setCategories] = useState(
    onboarding?.credentials?.categories
      ? Array.isArray(onboarding.credentials.categories)
          ? onboarding.credentials.categories.join(", ")
          : onboarding.credentials.categories
      : ""
  );
  const [productTypes, setProductTypes] = useState(
    onboarding?.credentials?.type
      ? Array.isArray(onboarding.credentials.type)
          ? onboarding.credentials.type.join(", ")
          : onboarding.credentials.type
      : ""
  );
  const [aiExplanationMode, setAiExplanationMode] = useState(
    onboarding?.explain ?? false
  );
  const [context, setContext] = useState(onboarding?.context || "");
  const [platform] = useState(onboarding?.platform || "shopify");
  const [softCategories, setSoftCategories] = useState(
    onboarding?.credentials?.softCategories
      ? Array.isArray(onboarding.credentials.softCategories)
          ? onboarding.credentials.softCategories.join(", ")
          : onboarding.credentials.softCategories
      : ""
  );
  const [cred, setCred] = useState(
    platform === "shopify"
      ? {
          shopifyDomain: onboarding?.credentials?.shopifyDomain || "",
          shopifyToken: onboarding?.credentials?.shopifyToken || "",
          wooUrl: "",
          wooKey: "",
          wooSecret: ""
        }
      : {
          shopifyDomain: "",
          shopifyToken: "",
          wooUrl: onboarding?.credentials?.wooUrl || "",
          wooKey: onboarding?.credentials?.wooKey || "",
          wooSecret: onboarding?.credentials?.wooSecret || ""
        }
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [targetCategory, setTargetCategory] = useState(""); // For category-specific reprocessing
  const [missingSoftCategoryOnly, setMissingSoftCategoryOnly] = useState(false); // For products missing softCategory field
  
  // Advanced reprocessing options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [reprocessHardCategories, setReprocessHardCategories] = useState(true);
  const [reprocessSoftCategories, setReprocessSoftCategories] = useState(true);
  const [reprocessTypes, setReprocessTypes] = useState(true);
  const [reprocessVariants, setReprocessVariants] = useState(true);
  const [reprocessEmbeddings, setReprocessEmbeddings] = useState(false);
  const [reprocessDescriptions, setReprocessDescriptions] = useState(false);
  const [reprocessAll, setReprocessAll] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const canDownload = true;

  const syncState = useSyncStatus(dbName, resyncing || reprocessing);

  // new analyzer state for CSS selector analysis
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const [selectorResult, setSelectorResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");



  // Resync handler – triggers full sync via external API (fetches all products from store and processes from scratch)
  async function handleResync() {
    setResyncing(true);
    setMsg("");
    
    try {
      // Get API key from onboarding credentials
      const apiKey = onboarding?.apiKey;
      
      if (!apiKey) {
        throw new Error("API key not found. Please regenerate your API key in the API Key panel.");
      }

      // Fetch latest user credentials from database using session
      const onboardingRes = await fetch("/api/get-onboarding");
      if (!onboardingRes.ok) {
        throw new Error("Failed to fetch user credentials");
      }
      const { onboarding: userData } = await onboardingRes.json();
      
      if (!userData) {
        throw new Error("User not found. Please complete onboarding first.");
      }

      // Get credentials from database
      const userCredentials = userData.credentials || {};
      const userPlatform = userData.platform || platform;
      const userDbName = userData.dbName || dbName;
      
      if (!userDbName) {
        throw new Error("Store name is required. Please save your settings first.");
      }

      // Prepare the data arrays from database (or fallback to state if not in DB)
      const categoriesArray = Array.isArray(userCredentials.categories) 
        ? userCredentials.categories 
        : (userCredentials.categories ? [userCredentials.categories] : categories.split(",").map(s => s.trim()).filter(Boolean));
      const typesArray = Array.isArray(userCredentials.type)
        ? userCredentials.type
        : (userCredentials.type ? [userCredentials.type] : productTypes.split(",").map(s => s.trim()).filter(Boolean));
      const softCategoriesArray = Array.isArray(userCredentials.softCategories)
        ? userCredentials.softCategories
        : (userCredentials.softCategories ? [userCredentials.softCategories] : softCategories.split(",").map(s => s.trim()).filter(Boolean));
      
      // Format Shopify domain if platform is shopify
      let shopifyDomain = userCredentials.shopifyDomain || cred.shopifyDomain;
      if (userPlatform === "shopify" && shopifyDomain) {
        shopifyDomain = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!shopifyDomain.includes('.myshopify.com')) {
          shopifyDomain = `${shopifyDomain}.myshopify.com`;
        }
      }

      // Prepare platform-specific credentials from database
      const platformCredentials = userPlatform === "shopify" 
        ? {
            shopifyDomain: shopifyDomain || userCredentials.shopifyDomain,
            shopifyToken: userCredentials.shopifyToken || cred.shopifyToken,
          }
        : {
            wooUrl: userCredentials.wooUrl || cred.wooUrl,
            wooKey: userCredentials.wooKey || cred.wooKey,
            wooSecret: userCredentials.wooSecret || cred.wooSecret,
          };

      // Validate credentials are present
      if (userPlatform === "shopify" && (!platformCredentials.shopifyDomain || !platformCredentials.shopifyToken)) {
        throw new Error("Shopify credentials are missing. Please update your settings.");
      }
      if (userPlatform === "woocommerce" && (!platformCredentials.wooUrl || !platformCredentials.wooKey || !platformCredentials.wooSecret)) {
        throw new Error("WooCommerce credentials are missing. Please update your settings.");
      }

      // Build payload for external API - full sync (onboarding)
      // The external API will use these credentials to fetch all products from store
      const payload = {
        platform: userPlatform,
        dbName: userDbName,
        categories: categoriesArray,
        type: typesArray,
        softCategories: softCategoriesArray,
        syncMode: userData.syncMode || onboarding?.syncMode || "text",
        explain: userData.explain ?? aiExplanationMode,
        context: userData.context || context || "",
        ...platformCredentials
      };
      
      console.log('🔄 ⚡ RESYNC BUTTON: Sending to EXTERNAL endpoint https://onboarding-lh63.onrender.com/api/onboarding');
      console.log('📦 Sync payload:', { ...payload, shopifyToken: payload.shopifyToken ? '***' : undefined, wooSecret: payload.wooSecret ? '***' : undefined });

      const res = await fetch("https://onboarding-lh63.onrender.com/api/onboarding", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to start resync");
      }

      setMsg("🔄 Resync started successfully! This will fetch and process all products from scratch. " + (data.message || ""));
      console.log('✅ Resync response:', data);
    } catch (err) {
      console.error("Resync error:", err);
      setMsg(`❌ ${err.message || "Error starting resync"}`);
    } finally {
      setResyncing(false);
      setTimeout(() => setMsg(""), 5000);
    }
  }

  useEffect(() => {
    if (syncState === 'running') {
      setMsg("🔄 Sync in progress...");
    } else if (syncState === 'done') {
      setMsg("✅ Sync complete!");
    } else if (syncState === 'error') {
      setMsg("❌ Sync failed.");
    }
  }, [syncState]);

  // Save handler – update settings using the data from state.
  async function handleSave(e) {
    e.preventDefault();
    
    // Validate dbName before proceeding
    if (!dbName) {
      setMsg("❌ Store name is required");
      setTimeout(() => setMsg(""), 2000);
      return;
    }
    
    setSaving(true);
    setMsg("");
    try {
      // Prepare the categories array
      const categoriesArray = categories.split(",").map(s => s.trim()).filter(Boolean);
      const typesArray = productTypes.split(",").map(s => s.trim()).filter(Boolean);
      const softCategoriesArray = softCategories.split(",").map(s => s.trim()).filter(Boolean);
      
      // Format Shopify domain if platform is shopify
      let formattedCred = { ...cred };
      if (platform === "shopify" && formattedCred.shopifyDomain) {
        let domain = formattedCred.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/₪/, '');
        if (!domain.includes('.myshopify.com')) {
          domain = `₪{domain}.myshopify.com`;
        }
        formattedCred.shopifyDomain = domain;
      }

      // Prepare platform-specific credentials
      const platformCredentials = platform === "shopify" 
        ? {
            shopifyDomain: formattedCred.shopifyDomain,
            shopifyToken: formattedCred.shopifyToken,
          }
        : {
            wooUrl: formattedCred.wooUrl,
            wooKey: formattedCred.wooKey,
            wooSecret: formattedCred.wooSecret,
          };

      const payload = {
        platform,
        dbName,
        categories: categoriesArray,
        type: typesArray,
        softCategories: softCategoriesArray,
        syncMode: onboarding?.syncMode || "text",
        explain: aiExplanationMode,
        context: context,
        ...platformCredentials
      };

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to save settings");
      }
      
      setMsg("✅ Saved!");
      setEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      setMsg(`❌ ₪{err.message || "Error saving"}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2000);
    }
  }

  const handleReprocess = async () => {
    setReprocessing(true);
    setMsg("");
    try {
      // Get API key from onboarding credentials
      const apiKey = onboarding?.apiKey;
      
      if (!apiKey) {
        throw new Error("API key not found. Please regenerate your API key in the API Key panel.");
      }
      
      // Debug the raw state values
      console.log("🔍 RAW STATE VALUES:");
      console.log("categories:", categories);
      console.log("productTypes:", productTypes);
      console.log("softCategories:", softCategories);
      
      // Prepare the data arrays
      const categoriesArray = categories.split(",").map(s => s.trim()).filter(Boolean);
      const typesArray = productTypes.split(",").map(s => s.trim()).filter(Boolean);
      const softCategoriesArray = softCategories.split(",").map(s => s.trim()).filter(Boolean);
      
      console.log("🔍 PREPARED ARRAYS:");
      console.log("categoriesArray:", categoriesArray);
      console.log("typesArray:", typesArray);
      console.log("softCategoriesArray:", softCategoriesArray);
      
      const payload = {};
      
      // Optional overrides (leave empty to use stored values on server)
      if (categoriesArray.length) payload.categories = categoriesArray;
      if (typesArray.length) payload.type = typesArray;
      if (softCategoriesArray.length) payload.softCategories = softCategoriesArray;
      
      // Reprocess options
      if (reprocessAll) {
        payload.reprocessAll = true;
      } else {
        payload.reprocessHardCategories = reprocessHardCategories;
        payload.reprocessSoftCategories = reprocessSoftCategories;
        payload.reprocessTypes = reprocessTypes;
        payload.reprocessVariants = reprocessVariants;
        payload.reprocessEmbeddings = reprocessEmbeddings;
        payload.reprocessDescriptions = reprocessDescriptions;
      }
      
      console.log("🔍 PAYLOAD TO SEND:", payload);
      console.log("🔑 ⚡ REPROCESS BUTTON: Sending to EXTERNAL endpoint https://onboarding-lh63.onrender.com/api/reprocess");
      
      const res = await fetch("https://onboarding-lh63.onrender.com/api/reprocess", {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to start reprocessing.");
      
      setMsg("✅ Began reprocessing all products. " + (data.message || ""));
      console.log("✅ Reprocess response:", data);
    } catch (err) {
      console.error("Reprocess error:", err);
      setMsg(`❌ ${err.message}`);
    } finally {
      setReprocessing(false);
    }
  };

  const handleStopReprocess = async () => {
    setStopping(true);
    setMsg("");
    try {
      // Get API key from onboarding
      const apiKey = onboarding?.apiKey;
      
      if (!apiKey) {
        throw new Error("API key not found. Please regenerate your API key in the API Key panel.");
      }
      
      console.log('🛑 Sending stop signal to external endpoint');
      
      const res = await fetch('https://onboarding-lh63.onrender.com/api/reprocess/stop', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to stop reprocessing.");
      
      setMsg("🛑 Stopped reprocessing. " + (data.message || ""));
      console.log('✅ Stop response:', data);
    } catch (err) {
      console.error("Stop reprocess error:", err);
      setMsg(`❌ ${err.message}`);
    } finally {
      setStopping(false);
    }
  };

  // function to run analysis
  const runSelectorAnalysis = async () => {
    if (!analyzeUrl) return;
    setAnalyzeError("");
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/analyze-search-bar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyzeUrl, includeSnapshot: true })
      });
      if (!res.ok) throw new Error(`HTTP ₪{res.status}`);
      const json = await res.json();
      setSelectorResult(json.analysis);
    } catch (err) {
      console.error(err);
      setAnalyzeError(err.message || "Failed to analyze selector");
    } finally {
      setAnalyzing(false);
    }
  };

  // New Download Plugin function added to the component:
  async function handleDownload() {
    if (!canDownload) return;
    try {
      if (platform === "shopify") {
        // For Shopify, use the direct installation URL
        const SHOPIFY_INSTALL_URL = "";
        window.location.href = SHOPIFY_INSTALL_URL;
        return;
      }
      
      // For WooCommerce, download the plugin as before
      const res = await fetch("/api/download-plugin", { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ₪{res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "semantix-plugin.zip";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      setBanner("❌ Couldn't generate the plugin or install the app.");
    }
  }



  const addSoftCategory = () => {
    if (newSoftCategory.trim() && !softCategories.split(",").map(s => s.trim()).includes(newSoftCategory.trim())) {
      const currentSoftCategories = softCategories.split(",").map(s => s.trim()).filter(Boolean);
      setSoftCategories([...currentSoftCategories, newSoftCategory.trim()].join(", "));
      setNewSoftCategory('');
    }
  };

  const removeSoftCategory = (categoryToRemove) => {
    const currentSoftCategories = softCategories.split(",").map(s => s.trim()).filter(Boolean);
    const updatedSoftCategories = currentSoftCategories.filter(cat => cat !== categoryToRemove);
    setSoftCategories(updatedSoftCategories.join(", "));
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <header className="mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Settings className="h-7 w-7 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">הגדרות התוסף</h1>
              <p className="text-gray-600 mt-1">
                ניהול הגדרות החיבור והקונפיגורציה של המערכת
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            הגדרות קישור למערכת
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            הערה: לא מומלץ לשנות הגדרות אלה אלא אם כן זה הכרחי לחלוטין.
          </p>
        </div>
        
        {syncState === 'running' && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Processing Logs</h3>
            <div className="h-64 bg-gray-900 text-white font-mono text-sm p-4 rounded-lg overflow-y-auto">
              <p>Logs will appear here...</p>
            </div>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="ml-3 text-gray-600">טוען הגדרות נוכחיות…</p>
            </div>
          ) : editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם בסיס הנתונים
                  </label>
                  <input
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={dbName}
                    onChange={e => setDbName(e.target.value)}
                    placeholder="myStoreDB"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    קטגוריות (מופרדות בפסיקים)
                  </label>
                  <input
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={categories}
                    onChange={e => setCategories(e.target.value)}
                    placeholder="יין אדום, יין לבן"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סוגי מוצרים (מופרדים בפסיקים)
                </label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={productTypes}
                  onChange={e => setProductTypes(e.target.value)}
                  placeholder="כשר, במבצע, חדש, אורגני"
                />
                <p className="mt-1 text-sm text-gray-500">
                  סוגי המוצרים יעזרו לקטלג ולסנן מוצרים בחיפוש
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קטגוריות רכות (מופרדות בפסיקים)
                </label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={softCategories}
                  onChange={e => setSoftCategories(e.target.value)}
                  placeholder="מתנות, אירועים מיוחדים, קיץ, חורף"
                />
                <p className="mt-1 text-sm text-gray-500">
                  קטגוריות רכות מספקות שכבת סיווג נוספת גמישה למוצרים
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מצב הסבר AI
                    </label>
                    <p className="text-sm text-gray-500">
                      כאשר מופעל, המערכת תספק הסברים מפורטים על תוצאות החיפוש
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiExplanationMode(!aiExplanationMode)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ₪{
                      aiExplanationMode ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={` relative right-4 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ₪{
                        aiExplanationMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  הקשר (מידע על החנות)
                </label>
                <textarea
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="לדוגמה: חנות יין המתמחה ביינות מאיטליה."
                  rows="3"
                ></textarea>
                <p className="mt-1 text-sm text-gray-500">
                  ספק מידע נוסף על החנות שלך כדי לשפר את תוצאות החיפוש.
                </p>
              </div>

              {platform === "shopify" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      דומיין Shopify
                    </label>
                    <input
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.shopifyDomain}
                      onChange={e => setCred({ ...cred, shopifyDomain: e.target.value })}
                      placeholder="yourshop.myshopify.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      מפתח API של אדמין
                    </label>
                    <input
                      type="password"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.shopifyToken}
                      onChange={e => setCred({ ...cred, shopifyToken: e.target.value })}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      כתובת אתר WooCommerce
                    </label>
                    <input
                      type="url"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.wooUrl}
                      onChange={e => setCred({ ...cred, wooUrl: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      מפתח צרכן
                    </label>
                    <input
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.wooKey}
                      onChange={e => setCred({ ...cred, wooKey: e.target.value })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      סוד צרכן
                    </label>
                    <input
                      type="password"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={cred.wooSecret}
                      onChange={e => setCred({ ...cred, wooSecret: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="pt-6 border-t border-gray-200 flex items-center flex-wrap gap-3">
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      שומר...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      שמור הגדרות
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditing(false)} 
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  ביטול
                </button>
                {msg && (
                  <span className={`py-2 px-4 rounded-lg text-sm font-medium border ₪{msg.startsWith("✅") ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
                    {msg}
                  </span>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">שם בסיס הנתונים</span>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    {dbName || "לא הוגדר"}
                  </div>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">קטגוריות</span>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    {categories ? categories.split(', ').map((cat, index) => (
                      <span key={index} className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full mr-1 mb-1">
                        {cat}
                      </span>
                    )) : "לא הוגדר"}
                  </div>
                </div>
              </div>
              
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">סוגי מוצרים</span>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  {productTypes ? productTypes.split(', ').map((type, index) => (
                    <span key={index} className="inline-block px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full mr-1 mb-1">
                      {type}
                    </span>
                  )) : "לא הוגדר"}
                </div>
              </div>
              
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">מצב הסבר AI</span>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ₪{
                      aiExplanationMode ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {aiExplanationMode ? '✓ מופעל' : '✗ כבוי'}
                    </span>
                    <span className="mr-2 text-sm text-gray-600">
                      {aiExplanationMode ? 'המערכת תספק הסברים מפורטים' : 'המערכת תפעל במצב רגיל'}
                    </span>
                  </div>
                </div>
              </div>
              
              {platform === "shopify" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">דומיין Shopify</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.shopifyDomain || "לא הוגדר"}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">מפתח API של אדמין</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.shopifyToken ? "••••••••••••••••" : "לא הוגדר"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">כתובת אתר WooCommerce</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooUrl || "לא הוגדר"}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">מפתח צרכן</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooKey || "לא הוגדר"}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-sm font-medium text-gray-700 mb-2">סוד צרכן</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooSecret ? "••••••••••••••••" : "לא הוגדר"}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-6 border-t border-gray-200">
                {/* Primary Actions */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button 
                    onClick={() => setEditing(true)} 
                    className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    ערוך הגדרות
                  </button>
                  <button 
                    onClick={handleResync} 
                    disabled={resyncing} 
                    className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resyncing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        מסנכרן...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        סנכרן נתונים
                      </>
                    )}
                  </button>
                {dbName && (
                  <>
                    {/* Category Selection for Reprocessing */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        עיבוד מחדש לפי קטגוריה ספציפית (אופציונלי)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={targetCategory}
                          onChange={(e) => setTargetCategory(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={reprocessing || stopping}
                        >
                          <option value="">כל הקטגוריות (עיבוד מחדש רגיל)</option>
                          {categories.split(',').map(cat => cat.trim()).filter(Boolean).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <div className="text-xs text-gray-500 sm:self-end sm:pb-2">
                          {targetCategory ? `יעבד רק מוצרים מקטגוריה: ${targetCategory}` : 'יעבד את כל המוצרים'}
                        </div>
                      </div>
                    </div>

                    {/* Missing Soft Category Option */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <label className="flex items-center space-x-3 rtl:space-x-reverse">
                        <input
                          type="checkbox"
                          checked={missingSoftCategoryOnly}
                          onChange={(e) => setMissingSoftCategoryOnly(e.target.checked)}
                          disabled={reprocessing || stopping}
                          className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700">
                            עיבד רק מוצרים עם קטגוריות קשות אבל ללא שדה צבעי-רכות
                          </span>
                          <span className="text-xs text-gray-500">
                            יתמקד במוצרים שיש להם קטגוריות אבל חסר להם לגמרי שדה צבעי-רכות (לא מערך ריק)
                          </span>
                        </div>
                      </label>
                    </div>
                    
                    {/* Advanced Reprocessing Options Toggle */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="flex items-center justify-between w-full text-right"
                      >
                        <span className="text-sm font-medium text-blue-800">
                          אפשרויות מתקדמות לעיבוד מחדש
                        </span>
                        <svg 
                          className={`w-5 h-5 transition-transform ${showAdvancedOptions ? 'transform rotate-180' : ''}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                      </button>
                      
                      {showAdvancedOptions && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                              <input
                                type="checkbox"
                                checked={reprocessAll}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setReprocessAll(checked);
                                  if (checked) {
                                    // Select all options when "All" is checked
                                    setReprocessHardCategories(true);
                                    setReprocessSoftCategories(true);
                                    setReprocessTypes(true);
                                    setReprocessVariants(true);
                                    setReprocessEmbeddings(true);
                                    setReprocessDescriptions(true);
                                  }
                                }}
                                disabled={reprocessing || stopping}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-sm font-bold text-blue-900">עיבוד מחדש של הכל (כולל מידע)</span>
                            </label>
                            
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                              <input
                                type="checkbox"
                                checked={reprocessHardCategories}
                                onChange={(e) => setReprocessHardCategories(e.target.checked)}
                                disabled={reprocessing || stopping || reprocessAll}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-sm text-gray-700">קטגוריות קשות</span>
                            </label>
                            
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                              <input
                                type="checkbox"
                                checked={reprocessSoftCategories}
                                onChange={(e) => setReprocessSoftCategories(e.target.checked)}
                                disabled={reprocessing || stopping || reprocessAll}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-sm text-gray-700">קטגוריות רכות/צבעים</span>
                            </label>
                            
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                              <input
                                type="checkbox"
                                checked={reprocessTypes}
                                onChange={(e) => setReprocessTypes(e.target.checked)}
                                disabled={reprocessing || stopping || reprocessAll}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-sm text-gray-700">סוגי מוצרים</span>
                            </label>
                          </div>
                          
                          <div className="space-y-3">
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                              <input
                                type="checkbox"
                                checked={reprocessVariants}
                                onChange={(e) => setReprocessVariants(e.target.checked)}
                                disabled={reprocessing || stopping || reprocessAll}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-sm text-gray-700">וריאציות מוצרים</span>
                            </label>
                            
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                              <input
                                type="checkbox"
                                checked={reprocessEmbeddings}
                                onChange={(e) => setReprocessEmbeddings(e.target.checked)}
                                disabled={reprocessing || stopping || reprocessAll}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-sm text-gray-700">אמבדינג/וקטורים</span>
                            </label>
                            
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                              <input
                                type="checkbox"
                                checked={reprocessDescriptions}
                                onChange={(e) => setReprocessDescriptions(e.target.checked)}
                                disabled={reprocessing || stopping || reprocessAll}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-sm text-gray-700">תיאור/תרגום</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleReprocess} 
                      disabled={reprocessing || stopping}
                      className="px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {reprocessing ? 'מעבד מחדש...' : (
                        // Button text reflects what's being reprocessed
                        reprocessAll ? 'עיבוד מחדש מלא של כל המידע' :
                        missingSoftCategoryOnly ? 'עבד מחדש מוצרים ללא צבעי-רכות' : 
                        targetCategory ? `עבד מחדש קטגוריה: ${targetCategory}` : 
                        (!reprocessHardCategories && !reprocessSoftCategories && !reprocessTypes) ? 
                          (reprocessEmbeddings ? 'עדכן וקטורים בלבד' : 
                           reprocessDescriptions ? 'עדכן תיאורים בלבד' : 
                           reprocessVariants ? 'עדכן וריאציות בלבד' : 'עבד מחדש את כל המוצרים') :
                          'עבד מחדש קטגוריות וסוגים'
                      )}
                    </button>
                    <button 
                      onClick={handleStopReprocess} 
                      disabled={stopping || reprocessing}
                      className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      {stopping ? 'עוצר...' : 'הפסק עיבוד מחדש'}
                    </button>
                  </>
                )}
                  <button 
                    onClick={handleDownload} 
                    className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {platform === "shopify" ? "התקן אפליקציית Shopify" : "הורד תוסף"}
                  </button>
                  
                  {platform === "shopify" && (
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/download-theme-extension", { method: "GET" });
                          if (!res.ok) throw new Error(`HTTP ₪{res.status}`);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "semantix-theme-extension.zip";
                          a.click();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error("Download theme extension failed", err);
                          setMsg("❌ Couldn't download the theme extension.");
                        }
                      }}
                      className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      הורד הרחבת ערכת נושא
                    </button>
                  )}
                </div>
                {msg && (
                  <div className={`mt-4 py-3 px-4 rounded-lg text-sm font-medium border ₪{msg.startsWith("✅") || msg.startsWith("🔄") ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
                    {msg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS Selector Analysis Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            ניתוח בוחרי CSS
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            נתח בוחרי חיפוש באתר לאופטימיזציה של הקישור
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={analyzeUrl}
                onChange={(e) => setAnalyzeUrl(e.target.value)}
                placeholder="הזן כתובת לניתוח (לדוגמה, https://example.com)"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <button
              onClick={runSelectorAnalysis}
              disabled={analyzing || !analyzeUrl}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {analyzing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                                        מנתח...
                    </span>
                  ) : "נתח"}
            </button>
          </div>
          
          {analyzeError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {analyzeError}
              </p>
            </div>
          )}
          
          {selectorResult && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">תוצאות הניתוח</h3>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {JSON.stringify(selectorResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

function ApiKeyPanel({ session, onboarding }) {
  // Try to get the API key from onboarding credentials first.
  const initialKey = onboarding?.credentials?.apiKey || "";
  const [apiKey, setApiKey] = useState(initialKey);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (apiKey) return;
    // Fallback: fetch from get-onboarding if not already in state.
    (async () => {
      try {
        const res = await fetch("/api/get-onboarding");
        const json = await res.json();
        setApiKey(json.apiKey || "");
      } catch (err) {
        console.warn("Couldn't fetch apiKey:", err);
      }
    })();
  }, [apiKey]);
  
  const regenerate = async () => {
    setWorking(true);
    setCopied(false);
    try {
      const res = await fetch("/api/api-key", { method: "POST" });
      const { key } = await res.json();
      setApiKey(key);
    } finally {
      setWorking(false);
    }
  };
  
  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="relative p-8">
            <h1 className="text-3xl font-bold text-white mb-1">ניהול מפתח API</h1>
            <p className="text-indigo-100">
              גישה מאובטחת לשירותי API של Semantix
            </p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            מפתח ה-API שלך
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            השתמש במפתח זה כדי לאמת את הבקשות שלך ל-API של Semantix
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 blur-md rounded-xl transform -translate-y-1 translate-x-1 group-hover:translate-y-0.5 group-hover:translate-x-0.5 transition-all"></div>
              <div className="relative bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-sm break-all shadow-sm">
                {apiKey || "•••••••••••••••••••••••••••••••"}
              </div>
            </div>
            <button 
              onClick={copyKey} 
              disabled={!apiKey} 
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {copied ? (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  הועתק!
                </span>
              ) : (
                <span className="flex items-center">
                  <Copy className="h-4 w-4 mr-2" />
                  העתק מפתח
                </span>
              )}
            </button>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={regenerate} 
              disabled={working} 
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {working ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מעבד...
                </span>
              ) : (
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  צור מפתח API חדש
                </span>
              )}
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0V7a1 1 0 112 0v6zm-1-9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
                </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">מידע חשוב</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    שלח ערך זה בכותרת <code className="px-1 py-0.5 bg-yellow-100 rounded font-mono text-xs">X‑API‑Key</code> מתוסף WooCommerce שלך כאשר אתה קורא ל-API של Semantix.
                  </p>
                  <p className="mt-2">
                    יצירת מפתח חדש תבטל מיידית את המפתח הקודם ועלולה להפריע לחיבורים פעילים.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mt-8">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            שיטות עבודה מומלצות לאבטחה
          </h2>
        </div>
        
        <div className="p-6">
          <ul className="space-y-4">
            <li className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  <span className="font-medium">אחסן בצורה מאובטחת</span> - לעולם אל תחשוף את מפתח ה-API שלך בקוד צד-לקוח או במאגרים ציבוריים.
                </p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  <span className="font-medium">החלף באופן קבוע</span> - הנוהג המומלץ הוא ליצור מפתח API חדש כל 90 יום.
                </p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  <span className="font-medium">השתמש ב-HTTPS</span> - תמיד העבר מפתחות API דרך חיבורים מאובטחים ומוצפנים.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* =============================================================== */
/*  ADMIN PANEL - Process products by API key (galpaz2210 only)  */
/* =============================================================== */
function AdminPanel({ session }) {
  const [apiKey, setApiKey] = useState('');
  const [userConfig, setUserConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState({
    reprocessCategories: true,
    reprocessTypes: true,
    reprocessSoftCategories: true,
    reprocessDescriptions: false,
    reprocessEmbeddings: false,
    translateBeforeEmbedding: false
  });
  
  // Editable configuration
  const [editedCategories, setEditedCategories] = useState('');
  const [editedTypes, setEditedTypes] = useState('');
  const [editedSoftCategories, setEditedSoftCategories] = useState('');
  const [missingSoftCategoryOnly, setMissingSoftCategoryOnly] = useState(false); // For products missing softCategory field

  // Check if user is admin
  const isAdmin = session?.user?.email === 'galpaz2210@gmail.com';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-2" />
          <p className="text-red-800 font-medium">Access Denied</p>
          <p className="text-red-600 text-sm mt-1">This panel is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  const handleLookup = async () => {
    if (!apiKey.trim()) {
      setMessage('❌ Please enter an API key');
      return;
    }

    setLoading(true);
    setMessage('');
    setUserConfig(null);

    try {
      const res = await fetch(`/api/admin/lookup-by-apikey?apiKey=${encodeURIComponent(apiKey)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to lookup user');
      }

      setUserConfig(data);
      console.log(userConfig)
      
      // Initialize editable fields with current values
      setEditedCategories(data.configuration.categories.list.join(', '));
      setEditedTypes(data.configuration.types.list.join(', '));
      setEditedSoftCategories(data.configuration.softCategories.list.join(', '));
      
      setMessage('✅ User found!');
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!userConfig) {
      setMessage('❌ Please lookup a user first');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      // Parse comma-separated strings into arrays
      const categories = editedCategories.split(',').map(s => s.trim()).filter(Boolean);
      const types = editedTypes.split(',').map(s => s.trim()).filter(Boolean);
      const softCategories = editedSoftCategories.split(',').map(s => s.trim()).filter(Boolean);

      const res = await fetch('/api/admin/update-user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          categories,
          types,
          softCategories
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      // Update local state with saved values
      setUserConfig({
        ...userConfig,
        configuration: {
          ...userConfig.configuration,
          categories: { count: categories.length, list: categories },
          types: { count: types.length, list: types },
          softCategories: { count: softCategories.length, list: softCategories }
        }
      });

      setMessage('✅ Configuration saved successfully!');
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!userConfig) {
      setMessage('❌ Please lookup a user first');
      return;
    }

    setSyncing(true);
    setMessage('');

    try {
      // Get user credentials
      const user = await fetch(`/api/get-user-credentials?apiKey=${encodeURIComponent(apiKey)}`);
      const userData = await user.json();
      
      if (!user.ok) {
        throw new Error('Failed to fetch user credentials');
      }

      const { credentials } = userData;
      
      // Build payload for initial sync (onboarding)
      const payload = {
        platform: userConfig.configuration.platform,
        dbName: userConfig.configuration.dbName,
        categories: userConfig.configuration.categories.list,
        type: userConfig.configuration.types.list,
        softCategories: userConfig.configuration.softCategories.list,
        syncMode: userConfig.configuration.syncMode,
        context: userConfig.configuration.context || '',
        explain: userConfig.configuration.explain || false,
        
        // Platform-specific credentials
        ...(userConfig.configuration.platform === 'shopify' ? {
          shopifyDomain: credentials.shopifyDomain,
          shopifyToken: credentials.shopifyToken
        } : {
          wooUrl: credentials.wooUrl,
          wooKey: credentials.wooKey,
          wooSecret: credentials.wooSecret
        })
      };

      console.log('🔄 Admin triggering initial sync with payload:', {
        ...payload,
        shopifyToken: payload.shopifyToken ? '***' : undefined,
        wooSecret: payload.wooSecret ? '***' : undefined
      });

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to start sync');
      }

      setMessage('✅ Initial sync started! This will fetch and process all products from scratch.');
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleProcess = async () => {
    if (!userConfig) {
      setMessage('❌ Please lookup a user first');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      // Get user credentials from the lookup
      const user = await fetch(`/api/get-user-credentials?apiKey=${encodeURIComponent(apiKey)}`);
      const userData = await user.json();
      
      if (!user.ok) {
        throw new Error('Failed to fetch user credentials');
      }

      const { credentials } = userData;
      
      // Build payload for internal reprocess endpoint
      const payload = {
        platform: userConfig.configuration.platform,
        dbName: userConfig.configuration.dbName,
        categories: userConfig.configuration.categories.list,
        type: userConfig.configuration.types.list,
        softCategories: userConfig.configuration.softCategories.list,
        syncMode: userConfig.configuration.syncMode,
        context: userConfig.configuration.context || '',
        explain: userConfig.configuration.explain || false,
        
        // Add reprocess options
        reprocessAll: options.reprocessAll || false,
        reprocessCategories: options.reprocessCategories,
        reprocessTypes: options.reprocessTypes,
        reprocessSoftCategories: options.reprocessSoftCategories,
        reprocessDescriptions: options.reprocessDescriptions,
        reprocessEmbeddings: options.reprocessEmbeddings,
        translateBeforeEmbedding: options.translateBeforeEmbedding,
        missingSoftCategoryOnly: missingSoftCategoryOnly, // Filter products with hard categories but without soft categories
        
        // Platform-specific credentials
        ...(userConfig.configuration.platform === 'shopify' ? {
          shopifyDomain: credentials.shopifyDomain,
          shopifyToken: credentials.shopifyToken
        } : {
          wooUrl: credentials.wooUrl,
          wooKey: credentials.wooKey,
          wooSecret: credentials.wooSecret
        })
      };

      console.log('🚀 Admin triggering reprocess with payload:', {
        ...payload,
        shopifyToken: payload.shopifyToken ? '***' : undefined,
        wooSecret: payload.wooSecret ? '***' : undefined
      });

      const res = await fetch('/api/reprocess-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start processing');
      }

      setMessage('✅ Reprocessing started in background!');
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Shield className="h-8 w-8 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          <p className="text-sm text-gray-500">Process products for any user by API key</p>
        </div>
      </div>

      {/* API Key Lookup */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">1. Lookup User by API Key</h3>
        
        <div className="flex gap-3">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter user API key..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={handleLookup}
            disabled={loading || !apiKey.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}
      </div>

      {/* User Configuration Display */}
      {userConfig && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">User Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{userConfig.user.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Platform</p>
                <p className="font-medium">{userConfig.configuration.platform}</p>
              </div>
              <div>
                <p className="text-gray-500">Database</p>
                <p className="font-medium">{userConfig.configuration.dbName}</p>
              </div>
              <div>
                <p className="text-gray-500">Sync Mode</p>
                <p className="font-medium">{userConfig.configuration.syncMode}</p>
              </div>
              <div>
                <p className="text-gray-500">Product Count</p>
                <p className="font-medium">{userConfig.configuration.productCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Store URL</p>
                <p className="font-medium text-xs">{userConfig.configuration.storeUrl}</p>
              </div>
            </div>

          </div>

          {/* Editable Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">2. Edit Categories & Types</h3>
              <button
                onClick={handleSaveConfiguration}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories ({editedCategories.split(',').filter(s => s.trim()).length})
                </label>
                <textarea
                  value={editedCategories}
                  onChange={(e) => setEditedCategories(e.target.value)}
                  placeholder="Category1, Category2, Category3..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated values</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Types ({editedTypes.split(',').filter(s => s.trim()).length})
                </label>
                <textarea
                  value={editedTypes}
                  onChange={(e) => setEditedTypes(e.target.value)}
                  placeholder="Type1, Type2, Type3..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated values</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Soft Categories ({editedSoftCategories.split(',').filter(s => s.trim()).length})
                </label>
                <textarea
                  value={editedSoftCategories}
                  onChange={(e) => setEditedSoftCategories(e.target.value)}
                  placeholder="SoftCat1, SoftCat2, SoftCat3..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated values</p>
              </div>
            </div>
          </div>

          {/* Missing Soft Category Filter */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={missingSoftCategoryOnly}
                  onChange={(e) => setMissingSoftCategoryOnly(e.target.checked)}
                  disabled={processing || syncing}
                  className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    Process only products with hard categories but without soft category field
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    Focuses on products that have categories but are completely missing the softCategory field (not an empty array)
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Processing Options */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">3. Select Processing Options</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.reprocessCategories}
                  onChange={(e) => setOptions({...options, reprocessCategories: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Reprocess Categories</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.reprocessTypes}
                  onChange={(e) => setOptions({...options, reprocessTypes: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Reprocess Types</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.reprocessSoftCategories}
                  onChange={(e) => setOptions({...options, reprocessSoftCategories: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Reprocess Soft Categories</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.reprocessDescriptions}
                  onChange={(e) => setOptions({...options, reprocessDescriptions: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Reprocess Descriptions (translate & enrich)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.reprocessEmbeddings}
                  onChange={(e) => setOptions({...options, reprocessEmbeddings: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Reprocess Embeddings</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.translateBeforeEmbedding}
                  onChange={(e) => setOptions({...options, translateBeforeEmbedding: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Translate Before Embedding</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                onClick={handleSync}
                disabled={syncing || processing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {syncing ? 'Starting Sync...' : '🔄 Initial Sync'}
              </button>
              
              <button
                onClick={handleProcess}
                disabled={syncing || processing}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Reprocessing...' : '🚀 Reprocess'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-1">🔄 Initial Sync:</p>
          <p className="text-sm text-blue-800">
            Fetches ALL products from the store and processes them from scratch. 
            Uses <code className="bg-blue-100 px-1 rounded">processWoo</code> or <code className="bg-blue-100 px-1 rounded">processShopify</code> modules.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-1">🚀 Reprocess:</p>
          <p className="text-sm text-blue-800">
            Updates existing products based on selected options (categories, types, descriptions, embeddings). 
            Uses <code className="bg-blue-100 px-1 rounded">reprocess-products</code> module. Only affects <strong>in-stock products</strong>.
          </p>
        </div>
        <p className="text-xs text-blue-700 pt-2 border-t border-blue-200">
          All credentials and configuration are automatically fetched from the user's account.
        </p>
      </div>
    </div>
  );
}

/* -------- tiny helper so sidebar labels & panels stay together ---- */
const PANELS = [
  { id: "analytics", label: "אנליטיקות", component: AnalyticsPanel, icon: BarChart3 },
  { id: "products", label: "מוצרים", component: ProductsPanel, icon: Package },
  { id: "settings", label: "הגדרות התוסף", component: SettingsPanel, icon: Settings },
  { id: "apikey", label: "מפתח API", component: ApiKeyPanel, icon: ListTodo },
  { id: "admin", label: "Admin", component: AdminPanel, icon: Shield },
  { id: "subscription", label: "מנוי", component: SubscriptionPanel, icon: CreditCard }
];

/* =================================================================== */
/*  MAIN PAGE – handles auth & panel switching                         */
/* =================================================================== */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [active, setActive] = useState("analytics");
  const [onboarding, setOnboarding] = useState(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "אינטגרציה חדשה זמינה",
      description: "אינטגרציית Shopify עודכנה עם תכונות חדשות.",
      time: "לפני שעתיים",
      unread: true
    },
    {
      id: 2,
      title: "תחזוקת מערכת",
      description: "תחזוקה מתוכננת ב-25 במאי 2025 בשעה 2:00 לפנות בוקר UTC.",
      time: "אתמול",
      unread: false
    }
  ]);

  // Check if user is admin
  const isAdmin = session?.user?.email === 'galpaz2210@gmail.com';
  
  // Filter panels based on user role - hide subscription and admin panels for non-admin users
  const visiblePanels = PANELS.filter(panel => {
    if (panel.id === 'subscription' || panel.id === 'admin') {
      return isAdmin;
    }
    return true;
  });

  // Debug loading states
  useEffect(() => {
    console.log('Session status:', status);
    console.log('Loading onboarding:', loadingOnboarding);
  }, [status, loadingOnboarding]);

  // Add global debug function - moved here to maintain hook order
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Make this function available globally so it can be called from anywhere
      window.openMobileMenu = () => {
        console.log('Opening mobile menu via global function');
        setMobileMenuOpen(true);
      };
      
      window.closeMobileMenu = () => {
        console.log('Closing mobile menu via global function');
        setMobileMenuOpen(false);
      };
      
      window.toggleMobileMenu = () => {
        setMobileMenuOpen(prev => {
          const newState = !prev;
          console.log('Menu state toggled via global function to:', newState);
          return newState;
        });
      };
      
      // Add event listener to the document for a custom event
      document.addEventListener('toggleMobileMenu', () => {
        window.toggleMobileMenu();
      });
      
      document.addEventListener('openMobileMenu', () => {
        window.openMobileMenu();
      });
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.toggleMobileMenu;
        delete window.openMobileMenu;
        delete window.closeMobileMenu;
        document.removeEventListener('toggleMobileMenu', window.toggleMobileMenu);
        document.removeEventListener('openMobileMenu', window.openMobileMenu);
      }
    };
  }, []);

  // Check URL parameters for panel selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const panelParam = params.get('panel');
    const tabParam = params.get('tab');
    
    // Handle both 'panel' and 'tab' parameters
    if (panelParam && visiblePanels.some(p => p.id === panelParam)) {
      setActive(panelParam);
    } else if (tabParam && visiblePanels.some(p => p.id === tabParam)) {
      setActive(tabParam);
    }
  }, [visiblePanels]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session?.user?.onboardingComplete === false) {
      router.push("/onboarding");
      return;
    }
  }, [status, session, router]);

  // Fetch onboarding data
  useEffect(() => {
    let mounted = true;

    const fetchOnboarding = async () => {
      try {
        const res = await fetch("/api/get-onboarding");
        const json = await res.json();
        
        if (!mounted) return;
        
        if (json?.onboarding) {
          setOnboarding(json.onboarding);
        }
      } catch (err) {
        console.warn("Error fetching onboarding:", err);
      } finally {
        if (mounted) {
          setLoadingOnboarding(false);
        }
      }
    };

    if (session?.user) {
      fetchOnboarding();
    } else {
      setLoadingOnboarding(false);
    }

    return () => {
      mounted = false;
    };
  }, [session]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
      if (window.innerWidth >= 640) {
        setMobileDropdownOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(note => ({ ...note, unread: false })));
  };

  const unreadCount = notifications.filter(note => note.unread).length;

  // Show loading state only if session is loading or onboarding is loading and session exists
  if (status === "loading" || (loadingOnboarding && session)) {
    console.log('Showing loading state');
    return <FullScreenMsg>טוען את הפעלת המשתמש...</FullScreenMsg>;
  }

  // Return null if no session
  if (!session) {
    console.log('No session, returning null');
    return null;
  }

  // Redirect to analytics if user tries to access a locked panel
  const activePanel = PANELS.find(p => p.id === active);
  const isActivePanelVisible = visiblePanels.some(p => p.id === active);
  
  if (activePanel && !isActivePanelVisible) {
    // User is trying to access a restricted panel, redirect to analytics
    if (typeof window !== 'undefined') {
      setActive('analytics');
    }
  }

  const Panel = activePanel?.component ?? (() => null);
  const ActiveIcon = activePanel?.icon || LayoutDashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating Menu Button - Alternative access to full sidebar */}
      <button
        onClick={() => {
          console.log('Mobile menu button clicked');
          setMobileMenuOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl p-3 rounded-full transition-all duration-200 hover:scale-105 lg:hidden"
        aria-label="פתח תפריט ניווט מלא"
      >
        <Menu className="h-6 w-6 text-white" />
      </button>

      {/* The MenuConnector is no longer needed as the button is self-contained */}
      {/* <MenuConnector /> */}
      
      {/* Global styling */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root {
          --semantix-primary-50: #f5f3ff;
          --semantix-primary-100: #ede9fe;
          --semantix-primary-200: #ddd6fe;
          --semantix-primary-300: #c4b5fd;
          --semantix-primary-400: #a78bfa;
          --semantix-primary-500: #8b5cf6;
          --semantix-primary-600: #7c3aed;
          --semantix-primary-700: #6d28d9;
          --semantix-primary-800: #5b21b6;
          --semantix-primary-900: #4c1d95;
          
          --semantix-secondary-50: #eef2ff;
          --semantix-secondary-100: #e0e7ff;
          --semantix-secondary-200: #c7d2fe;
          --semantix-secondary-300: #a5b4fc;
          --semantix-secondary-400: #818cf8;
          --semantix-secondary-500: #6366f1;
          --semantix-secondary-600: #4f46e5;
          --semantix-secondary-700: #4338ca;
          --semantix-secondary-800: #3730a3;
          --semantix-secondary-900: #312e81;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f9fafb;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c7d2fe;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a5b4fc;
        }
      `}</style>
      
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-800/50 backdrop-blur-sm z-[99] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div
        className={`fixed inset-y-0 right-0 z-[100] w-72 bg-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        style={{ direction: 'rtl' }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <img src="/main-logo.svg" alt="Semantix Logo" className="h-8 w-auto" />
          <button
            type="button"
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="סגור תפריט צד"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <nav className="space-y-1">
            {visiblePanels.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActive(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active === item.id
                    ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ml-4 ${
                    active === item.id ? "text-indigo-600" : "text-gray-400"
                  }`}
                />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* User profile in mobile menu */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img
                src={session.user.image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(session.user.name)}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{session.user.name}</p>
              <p className="text-xs text-gray-500">{session.user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pr-72">
        {/* Top navbar */}
        <header 
          className="fixed top-0 right-0 left-0 lg:left-72 z-[50] bg-white/80 backdrop-blur-md border-b border-gray-200"
        >
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <div className="flex items-center">
              {/* Mobile navigation dropdown */}
              <div className="relative sm:hidden">
                <button
                  onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-gray-700 mr-3"
                  aria-label="בחר עמוד"
                >
                  <ActiveIcon className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-medium max-w-[120px] truncate">
                    {visiblePanels.find(p => p.id === active)?.label || "לוח בקרה"}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown menu */}
                {mobileDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-[60]" 
                      onClick={() => setMobileDropdownOpen(false)}
                    />
                    
                    {/* Dropdown content */}
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-[70]" style={{ direction: 'rtl' }}>
                      <div className="py-2">
                        {visiblePanels.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActive(item.id);
                              setMobileDropdownOpen(false);
                            }}
                            className={`flex items-center w-full px-4 py-3 text-right hover:bg-gray-50 transition-colors ${
                              active === item.id
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-gray-700"
                            }`}
                          >
                            <item.icon
                              className={`h-5 w-5 ml-3 ${
                                active === item.id ? "text-indigo-600" : "text-gray-400"
                              }`}
                            />
                            <span className="text-sm font-medium">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Desktop title */}
              <div className="hidden sm:flex items-center ml-2">
                <ActiveIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-800">
                  {visiblePanels.find(p => p.id === active)?.label || "לוח בקרה"}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-16 p-4 md:p-8 max-w-7xl mx-auto">
          <Panel session={session} onboarding={onboarding} />
        </main>
      </div>
    </div>
  );
}

function useSyncStatus(dbName, enabled) {
  const [state, set] = useState("idle"); // idle | running | done | error
  useEffect(() => {
    if (!enabled || !dbName) return;
    let t;
    const poll = async () => {
      try {
        const r = await fetch(`/api/sync-status?dbName=₪{encodeURIComponent(dbName)}`);
        const j = await r.json();
        const nxt = j.state ?? "done";
        set(nxt);
        if (nxt === "running" || nxt === "reprocessing") t = setTimeout(poll, 3_000);
      } catch {
        t = setTimeout(poll, 8_000);
      }
    };
    poll();
    return () => clearTimeout(t);
  }, [dbName, enabled]);
  return state;
}

