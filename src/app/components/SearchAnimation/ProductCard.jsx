'use client';

import { motion } from 'framer-motion';

export default function ProductCard({ product, delay = 0, visible }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
      dir="rtl"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 text-right">{product.name}</p>
          <p className="text-xs text-gray-600 mt-1 leading-snug text-right">
            {product.description}
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-2 text-right">
            {product.price}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

