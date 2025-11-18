'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function RevenueAttribution() {
  const totalRevenue = useMotionValue(0);
  const semantixRevenue = useMotionValue(0);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [displaySemantix, setDisplaySemantix] = useState(0);

  useEffect(() => {
    const controls1 = animate(totalRevenue, 1523847.5, {
      duration: 2,
      ease: 'easeOut',
    });
    const controls2 = animate(semantixRevenue, 101089.2, {
      duration: 2,
      delay: 0.3,
      ease: 'easeOut',
    });

    return () => {
      controls1.stop();
      controls2.stop();
    };
  }, [totalRevenue, semantixRevenue]);

  useEffect(() => {
    const unsubscribe1 = totalRevenue.on('change', (latest) => {
      setDisplayTotal(latest);
    });
    const unsubscribe2 = semantixRevenue.on('change', (latest) => {
      setDisplaySemantix(latest);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [totalRevenue, semantixRevenue]);

  return (
    <div className="space-y-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100"
      >
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 text-right">סך הכנסות מהוספות לעגלה</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 text-right">
          ₪{displayTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
        className="relative bg-gradient-to-br from-[#9C4FFF] to-[#6E46FF] rounded-2xl p-4 sm:p-6 text-white shadow-lg overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-white/10"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="relative">
          <p className="text-xs sm:text-sm font-medium text-white/80 mb-1 text-right">הכנסות דרך Semantix (משוערות)</p>
          <p className="text-2xl sm:text-3xl font-bold text-white text-right">
            ₪{displaySemantix.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="inline-block mt-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium"
          >
            + מופעל על ידי Semantix Search
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}

