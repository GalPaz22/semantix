'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import DashboardCard from './DashboardCard';
import RevenueAttribution from './RevenueAttribution';
import LiveQueryStream from './LiveQueryStream';
import InsightsCard from './InsightsCard';

const segments = [
  { id: 'metrics', duration: 4000 },
  { id: 'revenue', duration: 4000 },
  { id: 'queries', duration: 5000 },
  { id: 'insights', duration: 4000 },
];

function useBrainPulse(isVisible) {
  const [currentSegment, setCurrentSegment] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isVisible) {
      setCurrentSegment(0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const segment = segments[currentSegment];
    
    timeoutRef.current = setTimeout(() => {
      setCurrentSegment((prev) => (prev + 1) % segments.length);
    }, segment.duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, currentSegment]);

  return currentSegment;
}

export default function BrainContainer() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const currentSegment = useBrainPulse(isVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-white rounded-2xl border border-gray-100 shadow-lg p-4 sm:p-6 min-h-[300px] sm:min-h-[400px]"
      dir="rtl"
    >
      <AnimatePresence mode="wait">
        {/* Segment 1: Metrics */}
        {currentSegment === 0 && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="h-full"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">מדדים מרכזיים</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <DashboardCard
                label="סך החיפושים"
                value={8234}
                delay={0}
                isMain={true}
              />
              <DashboardCard
                label="המרה לעגלה"
                value={32.4}
                suffix="%"
                delay={0.1}
              />
              <DashboardCard
                label="ממוצע הזמנה"
                value={456}
                prefix="₪"
                delay={0.2}
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 text-right">3 החיפושים המובילים היום</h4>
              <div className="space-y-2">
                {[
                  { query: 'יין אדום לארוחת סטייק', conversions: 127 },
                  { query: 'שעון ריצה עם GPS', conversions: 89 },
                  { query: 'מתנה ליום הולדת לבת', conversions: 76 },
                ].map((item, index) => (
                  <div
                    key={item.query}
                    className="flex items-center justify-between p-2 bg-white rounded-lg text-sm"
                  >
                    <span className="text-purple-600 font-semibold ml-2">{item.conversions}</span>
                    <span className="text-gray-900 truncate flex-1 text-right">{item.query}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Segment 2: Revenue */}
        {currentSegment === 1 && (
          <motion.div
            key="revenue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="h-full"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">ייחוס הכנסות</h3>
            <RevenueAttribution />
          </motion.div>
        )}

        {/* Segment 3: Live Queries */}
        {currentSegment === 2 && (
          <motion.div
            key="queries"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="h-full"
          >
            <LiveQueryStream />
          </motion.div>
        )}

        {/* Segment 4: Insights */}
        {currentSegment === 3 && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="h-full"
          >
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-6">
              Semantix Brain הופך נתוני חיפוש לתובנות פעולה.
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InsightsCard
                title="שעות שיא"
                data="14:00-16:00, 19:00-21:00"
                description="פעילות חיפוש הגבוהה ביותר"
                delay={0}
              />
              <InsightsCard
                title="פעילות יומית"
                data="+23% לעומת שבוע שעבר"
                description="נפח חיפוש גדל"
                delay={0.1}
              />
              <InsightsCard
                title="המרה לפי שעה"
                data="שיא: 20:00 (42%)"
                description="חלון ההמרה הטוב ביותר"
                delay={0.2}
              />
              <InsightsCard
                title="זמנים הטובים ביותר"
                data="שעות הערב"
                description="תקופות עם AOV גבוה"
                delay={0.3}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

