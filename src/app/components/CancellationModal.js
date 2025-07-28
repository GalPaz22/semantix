"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUBSCRIPTION_TIERS } from '/lib/paddle-config';

export default function CancellationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  currentTier, 
  loading,
  error 
}) {
  const [cancellationType, setCancellationType] = useState('end_of_period');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentTierConfig = SUBSCRIPTION_TIERS[currentTier];

  const reasons = [
    'Too expensive',
    'Not using enough features',
    'Found a better alternative',
    'Technical issues',
    'Temporary cancellation',
    'Other'
  ];

  const handleConfirm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await onConfirm(cancellationType === 'immediate', { 
        reason, 
        feedback,
        cancellationDate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Cancellation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loading || submitting;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancellation-modal-title"
        >
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative inline-block w-full max-w-2xl p-8 my-8 text-left align-middle bg-white shadow-xl rounded-3xl"
            >
              <form onSubmit={handleConfirm}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 
                      id="cancellation-modal-title"
                      className="text-2xl font-bold text-gray-900"
                    >
                      Cancel Subscription
                    </h2>
                    <p className="mt-1 text-gray-600">
                      We're sorry to see you go
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* ...existing tier info section... */}

                {/* Cancellation Options */}
                <fieldset className="space-y-4 mb-6">
                  <legend className="text-lg font-semibold text-gray-900">
                    When would you like to cancel?
                  </legend>
                  
                  {/* ...existing radio buttons... */}
                </fieldset>

                {/* Feedback Section */}
                <fieldset className="space-y-4 mb-6">
                  <legend className="text-lg font-semibold text-gray-900">
                    Help us improve
                  </legend>
                  
                  <div className="space-y-4">
                    <div>
                      <label 
                        htmlFor="cancel-reason" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Why are you cancelling?
                      </label>
                      <select
                        id="cancel-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select a reason...</option>
                        {reasons.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label 
                        htmlFor="feedback"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Additional feedback
                      </label>
                      <textarea
                        id="feedback"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                        placeholder="Tell us how we could have served you better..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* Actions */}
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Keep Subscription
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !reason}
                    className={`
                      flex-1 px-6 py-3 rounded-xl font-semibold transition-colors
                      ${cancellationType === 'immediate'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                      }
                      ${isLoading || !reason ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      cancellationType === 'immediate' ? 'Cancel Now' : 'Cancel at Period End'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}