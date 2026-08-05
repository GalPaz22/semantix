'use client';

import { motion } from 'framer-motion';

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function ProductCard({ product, delay = 0, visible, showBadge = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : 10,
        boxShadow: showBadge
          ? '0 0 0 1px rgba(124,58,237,0.25), 0 8px 24px rgba(124,58,237,0.12)'
          : '0 1px 2px rgba(0,0,0,0.04)',
      }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay }}
      className="relative bg-white border border-gray-200 rounded-2xl p-4"
    >
      {showBadge && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="absolute -top-2 right-4 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
        >
          ההתאמה המובילה
        </motion.span>
      )}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{product.name}</p>
          <p className="text-xs text-gray-600 mt-1 leading-snug">
            {product.description}
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-2">
            {product.price}
          </p>
        </div>
      </div>
    </motion.div>
  );
}




