'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const mockQueries = [
  { query: 'יין אדום לארוחת סטייק', time: '14:02', category: 'מורכב', cart: true, purchase: true },
  { query: 'קברנה', time: '14:05', category: 'פשוט', cart: true, purchase: false },
  { query: 'יין כשר לפסח', time: '14:09', category: 'מורכב', cart: true, purchase: true },
  { query: 'מרלו', time: '14:11', category: 'פשוט', cart: false, purchase: false },
  { query: 'סט מתנה להורים', time: '14:15', category: 'מורכב', cart: true, purchase: true },
  { query: 'רוזה אורגני לפיקניק', time: '14:18', category: 'מורכב', cart: true, purchase: false },
  { query: 'יין לערב פסטה', time: '14:22', category: 'מורכב', cart: true, purchase: true },
  { query: 'פינו נואר', time: '14:25', category: 'פשוט', cart: false, purchase: false },
];

export default function LiveQueryStream() {
  const [visibleQueries, setVisibleQueries] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= mockQueries.length) return;

    const timer = setTimeout(() => {
      setVisibleQueries((prev) => [...prev, mockQueries[currentIndex]]);
      setCurrentIndex((prev) => prev + 1);
    }, 700);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  return (
    <div className="h-full flex flex-col" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <span className="text-xs text-green-600 font-semibold flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          לייב
        </span>
        <h3 className="text-lg font-semibold text-gray-900">זרם חיפושים בזמן אמת</h3>
      </motion.div>

      <div className="flex-1 overflow-hidden bg-gray-50 rounded-2xl border border-gray-100 p-3 sm:p-4">
        {/* Desktop Table Headers */}
        <div className="hidden sm:grid grid-cols-5 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
          <div className="text-center">רכישה</div>
          <div className="text-center">עגלה</div>
          <div>קטגוריה</div>
          <div>שעה</div>
          <div className="text-right">חיפוש</div>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[300px] sm:max-h-[400px]">
          <AnimatePresence>
            {visibleQueries.map((item, index) => (
              <motion.div
                key={`${item.query}-${index}`}
                initial={{ opacity: 0, y: 20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`p-3 rounded-xl text-sm ${
                  item.purchase
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-white border border-gray-100'
                }`}
              >
                {/* Mobile Layout */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {item.purchase && <span className="text-green-600 font-semibold text-xs">✓ רכישה</span>}
                      {item.cart && <span className="text-green-600 font-semibold text-xs">✓ עגלה</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-medium truncate text-right">{item.query}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1 text-right">{item.time}</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.category === 'מורכב'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>
                
                {/* Desktop Layout */}
                <div className="hidden sm:grid grid-cols-5 gap-4">
                  <div className="text-center">
                    {item.purchase ? (
                      <span className="text-green-600 font-semibold">✓</span>
                    ) : (
                      <span className="text-gray-300">–</span>
                    )}
                  </div>
                  <div className="text-center">
                    {item.cart ? (
                      <span className="text-green-600 font-semibold">✓</span>
                    ) : (
                      <span className="text-gray-300">–</span>
                    )}
                  </div>
                  <div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.category === 'מורכב'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <div className="text-gray-600 font-mono text-xs">{item.time}</div>
                  <div className="text-gray-900 font-medium truncate text-right">{item.query}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

