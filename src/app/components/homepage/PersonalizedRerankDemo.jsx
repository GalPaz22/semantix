'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';

const defaultResults = [
  { id: 'merlot', title: 'Merlot Reserve', note: 'Best seller', emoji: '🍷' },
  { id: 'cab-sauv', title: 'Cabernet Sauvignon', note: 'Premium', emoji: '🍇' },
  { id: 'pinot', title: 'Pinot Noir Light', note: 'Light-bodied', emoji: '🥂' },
  { id: 'chianti', title: 'Chianti Classico', note: 'Italian blend', emoji: '🍷' },
];

const personalizedResults = [
  { id: 'pinot', title: 'Pinot Noir Light', note: 'Matches preference + history', emoji: '🥂' },
  { id: 'chianti', title: 'Chianti Classico', note: 'Light, under budget', emoji: '🍷' },
  { id: 'merlot', title: 'Merlot Reserve', note: 'Popular but heavy', emoji: '🍷' },
  { id: 'cab-sauv', title: 'Cabernet Sauvignon', note: 'Over budget', emoji: '🍇' },
];

const profileChips = ['Prefers light-bodied', 'Budget: under $30', 'Past purchase: Pinot Noir'];

function ResultRow({ index, item, highlight }) {
  return (
    <motion.li
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
      className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 ${
        highlight ? 'border-emerald-200 shadow-sm shadow-emerald-100/50' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border text-[11px] font-semibold ${
            highlight
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}
        >
          {index}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">{item.title}</div>
          <div className="truncate text-xs text-gray-500">{item.note}</div>
        </div>
      </div>
      {highlight && (
        <span className="flex-none rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
          Matched
        </span>
      )}
    </motion.li>
  );
}

export default function PersonalizedRerankDemo() {
  const [phase, setPhase] = useState('default'); // 'default' | 'profile' | 'reranked'
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
    setPhase('default');
    const t1 = setTimeout(() => setPhase('profile'), 1800);
    const t2 = setTimeout(() => setPhase('reranked'), 3200);
    const t3 = setTimeout(() => runCycle(), 7500);
    return [t1, t2, t3];
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const timers = runCycle();
    return () => timers.forEach(clearTimeout);
  }, [isVisible, runCycle]);

  const results = phase === 'reranked' ? personalizedResults : defaultResults;
  const showProfile = phase === 'profile' || phase === 'reranked';

  return (
    <div
      ref={ref}
      className="relative w-full rounded-[20px] border border-gray-200 bg-white p-5 sm:p-6 shadow-xl shadow-gray-200/60"
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-5">
        <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex-1 text-sm text-gray-700 font-medium">red wine</div>
        <div className="text-gray-300 text-xs">⏎</div>
      </div>

      {/* Shopper profile card */}
      <motion.div
        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
        animate={{
          opacity: showProfile ? 1 : 0,
          height: showProfile ? 'auto' : 0,
          marginBottom: showProfile ? 16 : 0,
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-white px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">
              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700/70">
              Shopper Profile
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profileChips.map((chip, i) => (
              <motion.span
                key={chip}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: showProfile ? 1 : 0, scale: showProfile ? 1 : 0.9 }}
                transition={{ duration: 0.3, delay: 0.1 * i, ease: 'easeOut' }}
                className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-medium text-purple-700"
              >
                {chip}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Status line */}
      <motion.div
        className="text-center text-sm font-medium text-gray-500 mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'reranked' ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        Results reranked for this shopper
      </motion.div>

      {/* Results list */}
      <motion.ul layout className="space-y-2" initial={false}>
        {results.map((item, idx) => (
          <ResultRow
            key={item.id}
            index={idx + 1}
            item={item}
            highlight={phase === 'reranked' && idx < 2}
          />
        ))}
      </motion.ul>
    </div>
  );
}
