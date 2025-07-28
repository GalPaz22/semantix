/* File: app/subscription/success/page.jsx */

"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Loading component for Suspense
function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main component content
function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  // Extract checkout details from query string
  const checkoutId = searchParams.get('checkout_id');
  const plan = searchParams.get('plan');

  useEffect(() => {
    // Paddle checkout success
    console.log('✅ Paddle subscription successful!', { checkoutId, plan });
    // Simulate waiting for your backend webhook or data refresh
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, [checkoutId, plan]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-lg text-gray-600">Processing your subscription...</p>
          <p className="text-sm text-gray-500 mt-2">Setting up your premium features</p>
        </div>
      </div>
    );
  }

  return (
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div
          className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Premium!</h1>
        <p className="text-gray-600 mb-6">Your subscription has been activated successfully.</p>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            You now have access to all premium features. Check your email for detailed setup instructions.
          </p>
          
          <Link
            href="/dashboard"
            className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function PaddleSubscriptionSuccess() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}