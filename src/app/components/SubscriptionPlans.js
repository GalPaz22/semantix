"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useUserDetails } from '../hooks/useUserDetails';
import { SUBSCRIPTION_TIERS } from '/lib/paddle-config';
import { motion, AnimatePresence } from 'framer-motion';
import CancellationModal from './CancellationModal';
import UpdatePaymentMethodButton from './UpdatePaymentMethodButton';

export default function PaddleSubscriptionPlans() {
  const { data: session, status: sessionStatus } = useSession();
  const { 
    tier: currentTier, 
    subscriptionStatus, 
    nextBillDate,
    paddleSubscriptionId,
    loading: userLoading,
    error: userError,
    fullUser,
    refreshUserDetails 
  } = useUserDetails();
  
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [cancelError, setCancelError] = useState(null); // Add this line

  // Debug function (only in development)
  const addDebugInfo = (info) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(info);
      setDebugInfo(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + info);
    }
  };
  const handleSubscribe = async (tier) => {
    if (!session) {
      setMessage('Please sign in to subscribe');
      return;
    }
  
    setLoading(tier);
    setMessage('');
  
    try {
      // 1. Load Paddle.js if needed
      if (!window.Paddle) {
        const script = document.createElement('script');
        script.src   = 'https://cdn.paddle.com/paddle/v2/paddle.js';
        script.async = true;
        document.head.appendChild(script);
        await new Promise(res => script.onload = res);
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
        
        settings: {
          displayMode: "overlay",
          theme: "light",
          locale: "en",
          successUrl: "https://www.semantix-ai.com/subscription/success",
        },
        customer: {
          email: session.user.email,
          id:    session.user.id
        },
        business: {
          name: session.user.name || undefined
        }
      });
  
    } catch (err) {
      console.error('Subscription error:', err);
      setMessage(`Failed to start checkout: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };
  
  const handleCancellation = async (isImmediate, cancellationDetails) => {
    setLoading('cancel');
    setCancelError(null);
    
    try {
      const response = await fetch('/api/cancel-paddle-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: paddleSubscriptionId,
          immediate: isImmediate,
          ...cancellationDetails
        })
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription');
      }
  
      setShowCancelModal(false);
      setMessage('Subscription cancelled successfully. You will retain access until the end of your billing period.');
      addDebugInfo('Cancellation successful');
      
      // Refresh user details after a short delay
      setTimeout(() => refreshUserDetails(), 2000);
  
    } catch (error) {
      console.error('Cancellation error:', error);
      setCancelError(error.message);
      addDebugInfo(`Cancellation failed: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const getSubscriptionStatusBadge = () => {
    if (!subscriptionStatus || subscriptionStatus === 'active') return null;
    
    const statusConfig = {
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', text: 'Past Due' },
      trialing: { color: 'bg-blue-100 text-blue-800', text: 'Trial' },
    };

    const config = statusConfig[subscriptionStatus] || { color: 'bg-gray-100 text-gray-800', text: subscriptionStatus };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading skeleton
  if (userLoading) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="text-center mb-12">
              <div className="h-10 bg-gray-200 rounded w-80 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-200 rounded-2xl h-96"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Debug Toggle (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 right-4 z-50">
            <button 
              onClick={() => setDebugMode(!debugMode)}
              className="px-3 py-1 bg-gray-800 text-white rounded text-xs opacity-50 hover:opacity-100"
            >
              Debug
            </button>
          </div>
        )}

        {/* Debug Panel */}
        {debugMode && process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-16 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-40 max-h-96 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">Debug Info</h4>
              <button 
                onClick={() => setDebugMode(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="text-xs space-y-1">
              <p><strong>Session:</strong> {sessionStatus}</p>
              <p><strong>Email:</strong> {session?.user?.email || 'none'}</p>
              <p><strong>Tier:</strong> {currentTier}</p>
              <p><strong>Status:</strong> {subscriptionStatus || 'none'}</p>
              <p><strong>Sub ID:</strong> {paddleSubscriptionId || 'none'}</p>
              <button 
                onClick={refreshUserDetails}
                className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
              >
                Refresh Data
              </button>
              {debugInfo && (
                <div className="mt-2">
                  <pre className="text-xs bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                    {debugInfo}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4"
          >
            Choose Your Plan
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-3 text-xl text-gray-600"
          >
            <span>Current Plan: <span className="font-semibold capitalize">{currentTier}</span></span>
            {getSubscriptionStatusBadge()}
          </motion.div>
        </div>

        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-8 p-4 rounded-lg ${
                message.includes('Failed') || message.includes('failed') || message.includes('error')
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-green-50 text-green-800 border border-green-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="flex-1">{message}</p>
                <button
                  onClick={() => setMessage('')}
                  className="ml-4 text-sm underline opacity-75 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscription Management Card */}
        {currentTier !== 'free' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manage Your Subscription
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="text-lg font-medium text-gray-900">
                      {SUBSCRIPTION_TIERS[currentTier]?.name} Plan
                    </h4>
                    {getSubscriptionStatusBadge()}
                  </div>
                  <p className="text-gray-600 mb-2">
                    ${SUBSCRIPTION_TIERS[currentTier]?.price}/month
                  </p>
                  {nextBillDate && subscriptionStatus === 'active' && (
                    <p className="text-sm text-gray-500 mb-2">
                      Next billing: {formatDate(nextBillDate)}
                    </p>
                  )}
                  {paddleSubscriptionId && (
                    <p className="text-xs text-gray-400">
                      Subscription ID: {paddleSubscriptionId}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={refreshUserDetails}
                    disabled={userLoading}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {userLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                  
                  {subscriptionStatus === 'active' && (
                    <div className="flex gap-3">
                      <UpdatePaymentMethodButton />
                      <button
                        onClick={() => setShowCancelModal(true)}
                        disabled={loading === 'cancel'}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {loading === 'cancel' ? 'Processing...' : 'Cancel Plan'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.entries(SUBSCRIPTION_TIERS).map(([key, plan], index) => {
            const isCurrentPlan = plan.tier === currentTier;
            const isFreePlan = plan.tier === 'free';
            const isPro = plan.tier === 'pro';
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 ${
                  isCurrentPlan ? 'ring-2 ring-green-500 shadow-green-100' : ''
                } ${isPro ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                {/* Popular Badge */}
                {isPro && !isCurrentPlan && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-2 text-sm font-medium z-10">
                    Most Popular
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-2 text-sm font-medium z-10">
                    Your Current Plan
                  </div>
                )}
                
                <div className={`bg-white ${isCurrentPlan || isPro ? 'pt-12' : 'pt-8'} pb-8 px-8 h-full flex flex-col`}>
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-5xl font-extrabold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-xl text-gray-500">
                        {isFreePlan ? '' : '/month'}
                      </span>
                    </div>
                    {!isFreePlan && (
                      <p className="text-sm text-gray-500">
                        Billed monthly, cancel anytime
                      </p>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index * 0.1) + (featureIndex * 0.05) }}
                        className="flex items-center"
                      >
                        <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <div className="text-center">
                    {isCurrentPlan ? (
                      <div className="bg-green-100 text-green-700 py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Your Current Plan
                      </div>
                    ) : isFreePlan ? (
                      <div className="bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium">
                        Free Forever
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan.tier)}
                        disabled={loading === plan.tier}
                        className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                          isPro
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        } ${
                          loading === plan.tier ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                        }`}
                      >
                        {loading === plan.tier ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </div>
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
      {/* Cancel Subscription Modal */}
      {showCancelModal && (
  <CancellationModal
    isOpen={showCancelModal}
    onClose={() => {
      setShowCancelModal(false);
      setCancelError(null);
    }}
    onConfirm={handleCancellation}
    currentTier={currentTier}
    loading={loading === 'cancel'}
    error={cancelError}
  />
)}
    </div>
  );
}