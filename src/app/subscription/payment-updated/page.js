'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PaymentMethodUpdated() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <motion.div
        className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 text-center"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Method Updated</h1>
        <p className="text-gray-600 mb-6">
          Your payment method has been successfully updated. Your subscription will continue using the new payment method.
        </p>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">Powered by Paddle • Secure payments</p>
      </motion.div>
    </div>
  );
} 