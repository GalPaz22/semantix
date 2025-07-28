'use client'
import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  ChevronDown,
  Calendar,
  Filter,
  LogOut,
  Copy,
  Shield,
  RefreshCw,
  CreditCard, // Add this icon
  Crown,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";

// Re‑usable fullscreen message with improved styling
const FullScreenMsg = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
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
        setMessage('Subscription updated successfully!');
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
      setMessage('Please sign in to subscribe');
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
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/cancele`,
        customer: {
          email: session.user.email,
          id: session.user.id
        },
        business: {
          name: session.user.name || undefined
        }
      });

    } catch (err) {
      console.error('Subscription error:', err);
      setMessage(`Failed to start checkout: ${err.message}`);
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
        throw new Error(data.message || 'Failed to cancel subscription');
      }

      setCancelModalOpen(false);
      setMessage(immediate 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the billing period'
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
        throw new Error(data.message || 'Failed to reactivate subscription');
      }

      setMessage('Subscription reactivated successfully');
      setTimeout(refreshUserDetails, 1000);

    } catch (error) {
      console.error('Reactivation error:', error);
      setMessage('Failed to reactivate subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  // Format date helper
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
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
        badgeText = 'Active';
        badgeClass = 'bg-green-100 text-green-800';
        break;
      case 'paused':
        badgeText = 'Paused';
        badgeClass = 'bg-yellow-100 text-yellow-800';
        break;
      case 'canceled':
        badgeText = 'Canceled';
        badgeClass = 'bg-red-100 text-red-800';
        break;
      case 'past_due':
        badgeText = 'Past Due';
        badgeClass = 'bg-orange-100 text-orange-800';
        break;
      default:
        badgeText = 'Free';
        badgeClass = 'bg-gray-100 text-gray-600';
        break;
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
        {badgeText}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
              <h1 className="text-3xl font-bold text-white mb-1">Subscription Management</h1>
              <p className="text-indigo-100">
                Manage your subscription and billing preferences
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white/80 text-sm">Current Plan</p>
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
        <div className={`p-4 rounded-xl ${
          message.includes('Failed') || message.includes('error')
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="text-sm underline opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Current Subscription Status */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Current Subscription</h2>
              <p className="text-gray-600 mt-1">Your active plan and billing information</p>
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
                        {currentTierConfig.price > 0 ? `$${currentTierConfig.price}/month` : 'Free forever'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Plan Features</h4>
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
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Billing Information</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Status</span>
                    {getSubscriptionStatusBadge()}
                  </div>
                  
                  {nextBillDate && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Next billing</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(nextBillDate)}
                      </span>
                    </div>
                  )}

                  {paddleSubscriptionId && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Subscription ID</span>
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
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Reactivate Subscription
                      </>
                    )}
                  </button>
                ) : isActiveSubscription ? (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Cancel Subscription
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
          <h2 className="text-xl font-semibold text-gray-800">Available Plans</h2>
          <p className="text-gray-600 mt-1">Choose the plan that fits your needs</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(SUBSCRIPTION_TIERS).map(([key, plan]) => (
              <div
                key={key}
                className={`relative rounded-xl border-2 p-6 transition-all ${
                  plan.tier === currentTier
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                }`}
              >
                {plan.tier === currentTier && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    Current Plan
                  </div>
                )}

                {plan.tier === 'pro' && plan.tier !== currentTier && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500">/month</span>
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
                      Your Current Plan
                    </div>
                  ) : plan.tier === 'free' ? (
                    <div className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium text-sm">
                      Free Forever
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.tier)}
                      disabled={upgradeLoading === plan.tier}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                        plan.tier === 'pro'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      } ${
                        upgradeLoading === plan.tier ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {upgradeLoading === plan.tier ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 mr-2 inline" />
                          {currentTier === 'free' ? 'Get Started' : 'Upgrade'}
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
          <h2 className="text-xl font-semibold text-gray-800">Billing History</h2>
          <p className="text-gray-600 mt-1">Your recent subscription transactions</p>
        </div>

        <div className="p-6">
          {isActiveSubscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{currentTierConfig?.name} Plan</p>
                  <p className="text-sm text-gray-500">
                    {nextBillDate && `Next billing: ${formatDate(nextBillDate)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${currentTierConfig?.price}</p>
                  <p className="text-sm text-green-600">Active</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Complete billing history will be available soon</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No billing history available</p>
              <p className="text-sm mt-1">Upgrade to a paid plan to see billing history</p>
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
        `"${(q.query || "").replace(/"/g, '""')}"`,
        `"${new Date(q.timestamp).toLocaleString()}"`,
        `"${Array.isArray(q.category) ? q.category.join(", ") : (q.category || "")}"`,
        `"${q.price || ""}"`,
        `"${q.minPrice || ""}"`,
        `"${q.maxPrice || ""}"`,
        `"${q.type || ""}"`,
        `"${q.entity || ""}"`
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
              <h1 className="text-3xl font-bold text-white mb-1">Analytics Dashboard</h1>
              <p className="text-indigo-100">
                Welcome back, {session?.user?.name || "User"}
              </p>
            </div>
            <div className="flex space-x-4">
              <button className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white backdrop-blur-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Last 30 Days
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
              <button onClick={downloadCSV} className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white backdrop-blur-sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>
          
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/5 backdrop-blur-sm border-t border-white/10">
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">Total Queries</p>
              <p className="text-3xl font-bold text-white">{totalLoaded.toLocaleString()}</p>
              <p className="text-white/70 text-xs mt-2">
             
              </p>
            </div>
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">Categories</p>
              <p className="text-3xl font-bold text-white">{categoryOptions.length}</p>
              <p className="text-white/70 text-xs mt-2">
              
              </p>
            </div>
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">Avg. Price</p>
              <p className="text-3xl font-bold text-white">
                {queries.length 
                  ? `$${(queries.reduce((sum, q) => sum + (q.price || 0), 0) / queries.filter(q => q.price).length).toFixed(2)}`
                  : "$0.00"}
              </p>
              <p className="text-white/70 text-xs mt-2">
        
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
              Filter Analytics Data
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative">
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                  className="w-full p-3 pl-4 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white appearance-none shadow-sm text-gray-600"
                >
                  <option value="">All Categories</option>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <input
                type="text"
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                placeholder="Filter by type"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-gray-600 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Price
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minPrice: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full p-3 pl-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-gray-600 placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Price
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full p-3 pl-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-gray-600 placeholder-gray-400"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-gray-600"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 py-4 px-6 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div className="flex flex-col sm:flex-row sm:space-x-8 mb-4 sm:mb-0">
            <p className="text-gray-600 font-medium flex items-center">
              <span className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
              Total loaded: <span className="text-indigo-600 font-bold ml-1">{totalLoaded}</span>
            </p>
            <p className="text-gray-600 font-medium flex items-center mt-2 sm:mt-0">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
              Matching filters: <span className="text-purple-600 font-bold ml-1">{filteredCount}</span>
            </p>
          </div>
          {/* Download CSV Button */}
          {filteredCount > 0 && (
            <button
              onClick={downloadCSV}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </button>
          )}
        </div>
      </section>

      {/* Table Section - Enhanced Design */}
      {filteredQueries.length > 0 && (
        <section className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-800">
              Query Results ({filteredCount})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Query
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Min Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Max Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedQueries.map((query, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                      {query.query}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(query.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {Array.isArray(query.category) 
                        ? query.category.map((cat, i) => (
                            <span key={i} className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full mr-1 mb-1">{cat}</span>
                          ))
                        : <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">{query.category}</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {query.price ? `$${query.price}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {query.minPrice ? `$${query.minPrice}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {query.maxPrice ? `$${query.maxPrice}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {query.type ? (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full">{query.type}</span>
                      ) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {query.entity || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls - Enhanced Design */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 bg-gray-50 p-4 flex justify-center items-center">
              <nav className="flex items-center space-x-1">
                <button
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-indigo-500 hover:text-indigo-600 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-colors"
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {startPage > 1 && (
                  <>
                    <button
                      className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                      onClick={() => handlePageClick(1)}
                    >
                      1
                    </button>
                    {startPage > 2 && (
                      <span className="text-gray-400 px-2">...</span>
                    )}
                  </>
                )}
                
                {paginationNumbers.map((number) => (
                  <button
                    key={number}
                    className={`w-10 h-10 rounded-lg ${
                      number === currentPage 
                        ? "bg-indigo-600 text-white border-indigo-600" 
                        : "border border-gray-200 bg-white text-gray-600 hover:border-indigo-500 hover:text-indigo-600"
                    } transition-colors`}
                    onClick={() => handlePageClick(number)}
                  >
                    {number}
                  </button>
                ))}
                
                {endPage < totalPages && (
                  <>
                    {endPage < totalPages - 1 && (
                      <span className="text-gray-400 px-2">...</span>
                    )}
                    <button
                      className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                      onClick={() => handlePageClick(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                
                <button
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-indigo-500 hover:text-indigo-600 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-colors"
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SettingsPanel({ session, onboarding, handleDownload: externalDownload }) {
  // Use the onboarding payload to populate initial state.
  const [dbName, setDbName] = useState(onboarding?.dbName || "");
  const [categories, setCategories] = useState(
    onboarding?.credentials?.categories
      ? Array.isArray(onboarding.credentials.categories)
          ? onboarding.credentials.categories.join(", ")
          : onboarding.credentials.categories
      : ""
  );
  const [platform] = useState(onboarding?.platform || "shopify");
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
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const canDownload = true;

  // new analyzer state for CSS selector analysis
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const [selectorResult, setSelectorResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  // Resync handler – uses the onboard data from props.
  async function handleResync() {
    setResyncing(true);
    setMsg("");
    try {
      // Use the onboarding payload as the POST body.
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboarding)
      });
      let json = {};
      try {
        json = await res.json();
      } catch (err) {
        json = { success: true };
      }
      setMsg(json.success ? "🔄 Resync started!" : "❌ Error starting resync");
    } catch (err) {
      setMsg("❌ Error starting resync");
    } finally {
      setResyncing(false);
      setTimeout(() => setMsg(""), 2000);
    }
  }

  // Save handler – update settings using the data from state.
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const ok = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          dbName,
          categories: categories.split(",").map(s => s.trim()).filter(Boolean),
          shopifyDomain: cred.shopifyDomain,
          shopifyToken: cred.shopifyToken,
          wooUrl: cred.wooUrl,
          wooKey: cred.wooKey,
          wooSecret: cred.wooSecret,
          shopifyToken: cred.shopifyToken,
          wooUrl: cred.wooUrl,
          wooKey: cred.wooKey,
          wooSecret: cred.wooSecret
        })
      }).then(r => r.ok);
      setMsg(ok ? "✅ Saved!" : "❌ Error saving");
      if (ok) setEditing(false);
    } catch (err) {
      setMsg("❌ Error saving");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2000);
    }
  }

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
            <h1 className="text-3xl font-bold text-white mb-1">Plugin Settings</h1>
            <p className="text-indigo-100">
              Configure your integration settings and preferences
            </p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            Integration Configuration
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Disclaimer: Changing these settings is not recommended unless absolutely necessary.
          </p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="ml-3 text-gray-600">Loading current settings…</p>
            </div>
          ) : editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database name
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
                    Categories (comma‑separated)
                  </label>
                  <input
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={categories}
                    onChange={e => setCategories(e.target.value)}
                    placeholder="יין אדום, יין לבן"
                  />
                </div>
              </div>
              
              {platform === "shopify" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shopify Domain
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
                      Admin API Token
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
                      WooCommerce Site URL
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
                      Consumer Key
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
                      Consumer Secret
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
              
              <div className="pt-4 flex items-center flex-wrap gap-4">
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : "Save Settings"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditing(false)} 
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                {msg && (
                  <span className={`ml-3 py-2 px-4 rounded-lg text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {msg}
                  </span>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">Database name</span>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    {dbName || "Not set"}
                  </div>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">Categories</span>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    {categories ? categories.split(', ').map((cat, index) => (
                      <span key={index} className="inline-block px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full mr-1 mb-1">
                        {cat}
                      </span>
                    )) : "Not set"}
                  </div>
                </div>
              </div>
              
              {platform === "shopify" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Shopify Domain</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.shopifyDomain || "Not set"}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Admin API Token</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.shopifyToken ? "••••••••••••••••" : "Not set"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">WooCommerce Site URL</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooUrl || "Not set"}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Consumer Key</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooKey || "Not set"}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-sm font-medium text-gray-700 mb-2">Consumer Secret</span>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {cred.wooSecret ? "••••••••••••••••" : "Not set"}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-5 flex flex-wrap items-center gap-4">
                <button 
                  onClick={() => setEditing(true)} 
                  className="px-5 py-2.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-all shadow-sm flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Settings
                </button>
                <button 
                  onClick={handleResync} 
                  disabled={resyncing} 
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resyncing ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resyncing...
                    </span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Resync Data
                    </>
                  )}
                </button>
                <button 
                  onClick={handleDownload} 
                  className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {platform === "shopify" ? "Install Shopify App" : "Download Plugin"}
                </button>
                
                {platform === "shopify" && (
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/download-theme-extension", { method: "GET" });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Theme Extension
                  </button>
                )}
                {msg && (
                  <span className={`py-2 px-4 rounded-lg text-sm font-medium ${msg.startsWith("✅") || msg.startsWith("🔄") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {msg}
                  </span>
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
            CSS Selector Analysis
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyze website search selectors for integration optimization
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={analyzeUrl}
                onChange={(e) => setAnalyzeUrl(e.target.value)}
                placeholder="Enter URL for analysis (e.g., https://example.com)"
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
                  Analyzing...
                </span>
              ) : "Analyze"}
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
              <h3 className="text-lg font-medium text-gray-800 mb-3">Analysis Results</h3>
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
            <h1 className="text-3xl font-bold text-white mb-1">API Key Management</h1>
            <p className="text-indigo-100">
              Secure access to the Semantix API services
            </p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            Your API Key
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Use this key to authenticate your requests to the Semantix API
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
                  Copied!
                </span>
              ) : (
                <span className="flex items-center">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Key
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
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate API Key
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
                <h3 className="text-sm font-medium text-yellow-800">Important Information</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Send this value in the <code className="px-1 py-0.5 bg-yellow-100 rounded font-mono text-xs">X‑API‑Key</code> header from your WooCommerce plugin when calling the Semantix API.
                  </p>
                  <p className="mt-2">
                    Regenerating this key will immediately invalidate the previous key and may disrupt active connections.
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
            Security Best Practices
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
                  <span className="font-medium">Store securely</span> - Never expose your API key in client-side code or public repositories.
                </p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  <span className="font-medium">Rotate regularly</span> - Best practice is to regenerate your API key every 90 days.
                </p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  <span className="font-medium">Use HTTPS</span> - Always transmit API keys over secure, encrypted connections.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* -------- tiny helper so sidebar labels & panels stay together ---- */
const PANELS = [
  { id: "analytics", label: "Analytics", component: AnalyticsPanel, icon: BarChart3 },
  { id: "settings", label: "Plugin Settings", component: SettingsPanel, icon: Settings },
  { id: "apikey", label: "API Key", component: ApiKeyPanel, icon: ListTodo },
  { id: "subscription", label: "Subscription", component: SubscriptionPanel, icon: CreditCard }
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New integration available",
      description: "Shopify integration has been updated with new features.",
      time: "2 hours ago",
      unread: true
    },
    {
      id: 2,
      title: "System maintenance",
      description: "Scheduled maintenance on May 25, 2025 at 2:00 AM UTC.",
      time: "Yesterday",
      unread: false
    }
  ]);

  // Check URL parameters for panel selection
  useEffect(() => {
    // Get the panel parameter from the URL
    const params = new URLSearchParams(window.location.search);
    const panelParam = params.get('panel');
    
    // Check if it's a valid panel ID
    if (panelParam && PANELS.some(p => p.id === panelParam)) {
      setActive(panelParam);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (session?.user?.onboardingComplete === false) router.push("/onboarding");
  }, [status, session, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/get-onboarding");
        const json = await res.json();
        if (json?.onboarding) {
          setOnboarding(json.onboarding);
        }
      } catch (err) {
        console.warn("Error fetching onboarding:", err);
      } finally {
        setLoadingOnboarding(false);
      }
    })();
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(note => ({ ...note, unread: false })));
  };

  const unreadCount = notifications.filter(note => note.unread).length;

  if (status === "loading" || loadingOnboarding) return <FullScreenMsg>Loading session…</FullScreenMsg>;
  if (!session) return null;

  const Panel = PANELS.find(p => p.id === active)?.component ?? (() => null);
  const ActiveIcon = PANELS.find(p => p.id === active)?.icon || LayoutDashboard;

  return (
    <div className="min-h-screen bg-gray-50">
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
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col rounded-r-3xl shadow-2xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 py-8">
          <div className="flex items-center">
           <Link href="/">
                         <img src="/semantix black-cutout.svg" alt="לוגו סמנטיקס - חיפוש סמנטי לעסק שלך" width={250} height={150} />
                       </Link>
          </div>
          <button
            className="lg:hidden p-2 rounded-full hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="mb-8">
            <h2 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Main
            </h2>
            <nav className="mt-2 space-y-2">
              {PANELS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActive(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    active === item.id
                      ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 mr-3 ${
                      active === item.id
                        ? "text-indigo-600"
                        : "text-gray-400"
                    }`}
                  />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          
        
        </div>

        {/* User profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium shadow">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 border-2 border-white rounded-full"></span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                {session?.user?.name || "User"}
              </div>
              <div className="text-xs text-gray-500">
                {session?.user?.email || "user@example.com"}
              </div>
            </div>
            <div className="ml-auto flex">
              <button 
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top navbar */}
        <header className="fixed top-0 right-0 left-0 lg:left-72 z-30 bg-white backdrop-blur-md bg-opacity-80 border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <div className="flex items-center">
              <button
                className="lg:hidden p-2 rounded-full hover:bg-gray-100 mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6 text-gray-500" />
              </button>

              <div className="hidden md:flex items-center">
                <ActiveIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-800">
                  {PANELS.find(p => p.id === active)?.label || "Dashboard"}
                </h2>
              </div>
            </div>

      
              {/* Help button */}
              <button className="hidden md:flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>

      
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