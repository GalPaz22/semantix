'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';
import { GripVertical, Pin } from 'lucide-react';

const initialProducts = [
  { id: 'summer-rose', title: 'Summer Rose', price: '$18', pinned: false },
  { id: 'aperitif-spritz', title: 'Aperitif Spritz', price: '$22', pinned: false },
  { id: 'reserve-cab', title: 'Reserve Cab', price: '$35', pinned: false },
  { id: 'organic-pinot', title: 'Organic Pinot', price: '$28', pinned: false },
];

const boostedProducts = [
  { id: 'reserve-cab', title: 'Reserve Cab', price: '$35', pinned: true },
  { id: 'summer-rose', title: 'Summer Rose', price: '$18', pinned: false },
  { id: 'aperitif-spritz', title: 'Aperitif Spritz', price: '$22', pinned: false },
  { id: 'organic-pinot', title: 'Organic Pinot', price: '$28', pinned: false },
];

function ProductRow({ item, index, isBoosted }) {
  const isPinned = item.pinned && isBoosted;

  return (
    <motion.li
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        isPinned
          ? 'border-purple-200 bg-purple-50 shadow-sm shadow-purple-100/50'
          : 'border-gray-100 bg-white'
      }`}
    >
      <GripVertical className="w-4 h-4 text-gray-300 flex-none" />

      <div className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border text-[11px] font-semibold ${
        isPinned
          ? 'border-purple-200 bg-purple-100 text-purple-700'
          : 'border-gray-200 bg-gray-50 text-gray-600'
      }`}>
        {index}
      </div>

      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold text-gray-900">{item.title}</div>
        <div className="truncate text-xs text-gray-500">{item.price}</div>
      </div>

      <div className="flex items-center gap-2 flex-none">
        {isPinned && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700"
          >
            Boosted
          </motion.span>
        )}
        <Pin
          className={`w-4 h-4 transition-colors duration-300 ${
            isPinned ? 'text-purple-600 fill-purple-600' : 'text-gray-300'
          }`}
        />
      </div>
    </motion.li>
  );
}

export default function ProductBoostDemo() {
  const [isBoosted, setIsBoosted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const runCycle = useCallback(() => {
    setIsBoosted(false);
    const t1 = setTimeout(() => setIsBoosted(true), 1800);
    const t2 = setTimeout(() => setIsBoosted(false), 5500);
    const t3 = setTimeout(() => runCycle(), 7000);
    return [t1, t2, t3];
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const timers = runCycle();
    return () => timers.forEach(clearTimeout);
  }, [isVisible, runCycle]);

  const products = isBoosted ? boostedProducts : initialProducts;

  return (
    <div
      ref={ref}
      className="relative w-full rounded-[20px] border border-gray-200 bg-white p-5 sm:p-6 shadow-xl shadow-gray-200/60"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">Manage Results</span>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Admin
        </span>
      </div>

      {/* Search context */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 mb-4 text-xs text-gray-500">
        Query: <span className="font-medium text-gray-700">&ldquo;cabernet&rdquo;</span>
      </div>

      {/* Boost applied toast */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: isBoosted ? 1 : 0, y: isBoosted ? 0 : -8 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 mb-4"
      >
        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
        <span className="text-xs font-medium text-purple-700">Boost applied — Reserve Cab pinned to #1</span>
      </motion.div>

      {/* Product list */}
      <motion.ul layout className="space-y-2" initial={false}>
        {products.map((item, idx) => (
          <ProductRow
            key={item.id}
            item={item}
            index={idx + 1}
            isBoosted={isBoosted}
          />
        ))}
      </motion.ul>
    </div>
  );
}
