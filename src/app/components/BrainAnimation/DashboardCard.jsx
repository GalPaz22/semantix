'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function DashboardCard({ label, value, prefix = '', suffix = '', delay = 0, isMain = false }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      delay: delay,
      ease: 'easeOut',
    });

    return controls.stop;
  }, [value, delay, count]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayValue(latest);
    });

    return () => unsubscribe();
  }, [rounded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.6, ease: 'easeOut' }}
      className={`rounded-2xl p-4 sm:p-6 shadow-lg ${
        isMain
          ? 'bg-gradient-to-br from-[#9C4FFF] to-[#6E46FF] text-white'
          : 'bg-white border border-gray-100'
      }`}
      dir="rtl"
    >
      <p className={`text-xs sm:text-sm font-medium mb-2 text-right ${isMain ? 'text-white/80' : 'text-gray-600'}`}>
        {label}
      </p>
      <p
        className={`text-2xl sm:text-3xl lg:text-4xl font-bold text-right ${isMain ? 'text-white' : 'text-gray-900'}`}
      >
        {prefix}
        {displayValue.toLocaleString()}
        {suffix}
      </p>
    </motion.div>
  );
}

