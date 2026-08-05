'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Cycles through a list of queries, lighting up each pipeline stage in turn,
// then reveals the matched result — a small, reusable way to show "this query
// goes through these layers and lands on this result."
export default function MultiLayerPipeline({ stages, queries }) {
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [queryIndex, setQueryIndex] = useState(0);
  const [step, setStep] = useState(0);
  const totalSteps = stages.length + 1;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const interval = setInterval(() => {
      setStep((prev) => {
        const next = prev + 1;
        if (next >= totalSteps + 1) {
          setQueryIndex((qi) => (qi + 1) % queries.length);
          return 0;
        }
        return next;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [inView, totalSteps, queries.length]);

  const activeStage = Math.min(step, stages.length - 1);
  const showResult = step >= stages.length;
  const query = queries[queryIndex];

  return (
    <div
      ref={containerRef}
      className="rounded-[28px] border border-gray-200 bg-white p-6 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Live query</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={query.text}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
        >
          <p className="mt-1 text-lg font-medium text-gray-900">"{query.text}"</p>
          <p className="text-sm text-purple-600">{query.tag}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-wrap gap-2 sm:flex-nowrap sm:items-center sm:gap-0">
        {stages.map((stage, i) => (
          <div key={stage} className="flex items-center sm:flex-1 sm:last:flex-none">
            <motion.div
              animate={{
                opacity: activeStage >= i ? 1 : 0.35,
                scale: activeStage === i && !showResult ? 1.06 : 1,
              }}
              transition={{ duration: 0.25 }}
              className={[
                'rounded-full border px-2.5 py-1.5 text-[11px] font-semibold sm:whitespace-nowrap sm:px-3 sm:text-sm',
                activeStage >= i
                  ? 'border-purple-300 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-400',
              ].join(' ')}
            >
              {stage}
            </motion.div>
            {i < stages.length - 1 && (
              <div className="mx-2 hidden h-px flex-1 bg-gray-200 sm:mx-3 sm:block" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 min-h-[76px]">
        <AnimatePresence mode="wait">
          {showResult && (
            <motion.div
              key={query.resultName}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-green-200 bg-green-50 p-4"
            >
              <p className="text-sm font-semibold text-gray-900">{query.resultName}</p>
              <p className="text-xs text-gray-600">{query.resultNote}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
