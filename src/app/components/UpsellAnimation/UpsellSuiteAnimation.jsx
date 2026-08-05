'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

const tagStages = {
  signals: { title: 'אותות נקלטו', tone: 'signals' },
  rerank: { title: 'הדירוג עודכן', tone: 'social' },
};

const signalChips = ['לחיצה: citrus', 'נוסף לעגלה: aperitif', 'נרכש: zero-proof'];

const resultsBefore = [
  { id: 'citrus-tonic', title: 'Citrus Tonic', note: 'התאמה כללית' },
  { id: 'sweet-red', title: 'Sweet red blend', note: 'חפיפת מילות מפתח' },
  { id: 'aperitif-spritz', title: 'Aperitif Spritz', note: 'נקבר בדירוג' },
  { id: 'zero-proof-negroni', title: 'Zero-proof Negroni', note: 'לא הוצג' },
];

const resultsAfter = [
  { id: 'aperitif-spritz', title: 'Aperitif Spritz', note: 'קידום בזכות מומנטום בעגלה' },
  { id: 'zero-proof-negroni', title: 'Zero-proof Negroni', note: 'קידום בזכות היסטוריית רכישות' },
  { id: 'citrus-tonic', title: 'Citrus Tonic', note: 'קידום בזכות לחיצות אחרונות' },
  { id: 'sweet-red', title: 'Sweet red blend', note: 'ירד בדירוג — כוונה נמוכה' },
];

function useUpsellSequence(isVisible) {
  const [bubbleStage, setBubbleStage] = useState('hidden');
  const [showSignals, setShowSignals] = useState(false);
  const [showRerank, setShowRerank] = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      // Reset when not visible
      setBubbleStage('hidden');
      setShowSignals(false);
      setShowRerank(false);
      setShowTagline(false);
      return;
    }

    const timers = [
      setTimeout(() => {
        setBubbleStage('signals');
        setShowSignals(true);
      }, 700),
      setTimeout(() => {
        setBubbleStage('rerank');
        setShowRerank(true);
      }, 1500),
      setTimeout(() => setShowTagline(true), 2300),
    ];

    return () => {
      timers.forEach((id) => clearTimeout(id));
    };
  }, [isVisible]);

  return {
    bubbleStage,
    showSignals,
    showRerank,
    showTagline,
  };
}

function AITag({ stage }) {
  return (
    <div className="pointer-events-none absolute -top-12 left-1/2 z-10 flex -translate-x-1/2 justify-center">
      <AnimatePresence mode="wait">
        {stage !== 'hidden' && (
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-lg shadow-gray-200/60"
          >
            <motion.span
              className={`h-2.5 w-2.5 rounded-full ${
                tagStages[stage].tone === 'signals' ? 'bg-purple-500' : 'bg-gray-300'
              }`}
              animate={
                tagStages[stage].tone === 'signals'
                  ? { opacity: [0.35, 1, 0.35], scale: [0.9, 1.2, 0.9] }
                  : { opacity: 1, scale: 1 }
              }
              transition={{
                duration: 1.6,
                repeat: tagStages[stage].tone === 'signals' ? Infinity : 0,
                ease: 'easeInOut',
              }}
            />
            {tagStages[stage].title}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SessionCard({ showSignals }) {
  return (
    <motion.div
      className="w-full rounded-[18px] border border-gray-100 bg-white px-4 py-4 shadow-xl shadow-gray-900/5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-400">
            Semantix Personalization
          </p>
          <h3 className="mt-1 text-[1.05rem] font-semibold leading-tight text-gray-900">
            סשן קונה בזמן אמת
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            לחיצות, עגלות ורכישות זורמות פנימה ומעדכנות את הדירוג מיד.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-50 via-white to-white px-4 py-3 shadow-inner">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-purple-700/70">
            שאילתה
          </div>
          <div className="text-[10px] font-semibold text-gray-400">⏎</div>
        </div>
        <div className="mt-1.5 text-sm sm:text-[15px] font-semibold text-gray-900">
          ״אפריטיף ללא אלכוהול״
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {signalChips.map((chip, index) => (
          <motion.span
            key={chip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: showSignals ? 1 : 0, y: showSignals ? 0 : 6 }}
            transition={{ duration: 0.35, delay: 0.08 * index, ease: 'easeOut' }}
            className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-medium text-purple-700"
          >
            {chip}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

function ResultRow({ index, item, highlight }) {
  return (
    <motion.li
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
      className={`flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm ${
        highlight ? 'border-emerald-200 shadow-emerald-100/50' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border text-[11px] font-semibold ${
            highlight
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-gray-50 text-gray-700'
          }`}
        >
          {index}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">{item.title}</div>
          <div className="truncate text-xs text-gray-500">{item.note}</div>
        </div>
      </div>
      {highlight ? (
        <span className="flex-none rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          #1
        </span>
      ) : null}
    </motion.li>
  );
}

function UpsellExperience({ animationState }) {
  const { bubbleStage, showSignals, showRerank, showTagline } = animationState;
  const results = showRerank ? resultsAfter : resultsBefore;

  return (
    <div className="relative flex flex-col items-center gap-8" dir="rtl">
      <div className="relative w-full max-w-[280px] text-center">
        <AITag stage={bubbleStage} />
        <SessionCard showSignals={showSignals} />
      </div>

      <div className="relative w-full max-w-2xl pt-10">
        <motion.div
          className="relative z-10 mb-3 text-center text-sm font-medium text-gray-600"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: showSignals ? 1 : 0, y: showSignals ? 0 : 6 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          פרסונליזציה בזמן אמת: אותות ← דירוג מחדש
        </motion.div>
        <motion.ul
          layout
          className="relative z-10 space-y-2"
          initial={false}
        >
          {results.map((item, idx) => (
            <ResultRow
              key={item.id}
              index={idx + 1}
              item={item}
              highlight={showRerank && idx === 0}
            />
          ))}
        </motion.ul>
      </div>

      <motion.p
        className="text-center text-base font-medium text-gray-700"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: showTagline ? 1 : 0, y: showTagline ? 0 : 6 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        המוצרים הנכונים הבאים עולים מיד — ככל שהכוונה משתנה.
      </motion.p>
    </div>
  );
}

export default function UpsellSuiteAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const animationState = useUpsellSequence(isVisible);

  return (
    <section 
      ref={sectionRef}
      className="relative flex w-full items-center justify-center rounded-[28px] border border-gray-200 bg-white/95 p-4 shadow-2xl shadow-gray-900/10"
    >
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#F2EAFE] via-white to-white" />
      <div className="relative w-full max-w-2xl">
        <UpsellExperience animationState={animationState} />
      </div>
    </section>
  );
}


