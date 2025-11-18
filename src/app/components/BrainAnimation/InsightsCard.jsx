'use client';

import { motion } from 'framer-motion';

export default function InsightsCard({ title, data, description, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.6, ease: 'easeOut' }}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 10px 25px -5px rgba(156, 79, 255, 0.2)',
      }}
      className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-md hover:shadow-lg transition-all"
      dir="rtl"
    >
      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 text-right">{title}</h4>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 text-right">{data}</p>
      <p className="text-xs sm:text-sm text-gray-600 text-right">{description}</p>
    </motion.div>
  );
}

