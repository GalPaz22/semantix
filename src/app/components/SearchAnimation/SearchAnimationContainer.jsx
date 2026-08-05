'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import SearchBarAnimation from './SearchBarAnimation';
import ProductCard from './ProductCard';

const EASE_OUT = [0.16, 1, 0.3, 1];

const products = [
  {
    name: 'Château de la Selve — Petite Selve',
    description:
      'יין אדום קל ופירותי — מושלם לשיתוף עם חברים, עם ניחוחות תבלינים מרעננים.',
    price: '$24',
    image: '/wine1.png',
  },
  {
    name: 'Lustig — Lulu Dolcetto',
    description:
      'דולצ׳טו קל ונעים עם רמזים של פירות יער וטאנינים רכים — אידיאלי לאווירה צעירה ומזדמנת.',
    price: '$36',
    image: '/wine2.png',
  },
  {
    name: 'Domaine Denizot — Sancerre Rouge Biorga',
    description:
      'פינו נואר אלגנטי ומאוזן, גוף בינוני ומשיי — מצוין לערב משפחתי רגוע.',
    price: '$77',
    image: '/wine3.png',
  },
];

// Phase timeline (ms), starting the moment typing finishes:
const MERGE_MS = 1000; // two unlabeled threads converge — replaces the old dead "blank + cursor" gap
const SKELETON_MS = 500; // skeleton blocks shimmer where the cards will land
const SETTLE_MS = 900; // staggered card reveal finishes settling
const TOPMATCH_MS = 400; // badge draws on after cards have settled
const HOLD_MS = 3500; // pause on the finished state before looping

function MergeThreads() {
  return (
    <div className="relative flex h-10 items-center justify-center overflow-hidden">
      <motion.span
        className="absolute h-1.5 w-10 rounded-full bg-gradient-to-r from-violet-500 to-violet-300"
        initial={{ x: -56, opacity: 0 }}
        animate={{ x: 0, opacity: [0, 1, 1, 0] }}
        transition={{ duration: MERGE_MS / 1000, ease: EASE_OUT, times: [0, 0.3, 0.75, 1] }}
      />
      <motion.span
        className="absolute h-1.5 w-10 rounded-full bg-gradient-to-r from-slate-300 to-slate-200"
        initial={{ x: 56, opacity: 0 }}
        animate={{ x: 0, opacity: [0, 1, 1, 0] }}
        transition={{ duration: MERGE_MS / 1000, ease: EASE_OUT, times: [0, 0.3, 0.75, 1] }}
      />
    </div>
  );
}

function SkeletonCard({ delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay }}
      className="flex animate-pulse items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4"
    >
      <div className="h-12 w-12 shrink-0 rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-3/4 rounded bg-gray-100" />
        <div className="h-2.5 w-full rounded bg-gray-100" />
        <div className="h-2.5 w-1/4 rounded bg-gray-100" />
      </div>
    </motion.div>
  );
}

export default function SearchAnimationContainer() {
  const [shouldStart, setShouldStart] = useState(false);
  const [phase, setPhase] = useState('typing'); // typing | merge | skeleton | reveal | settled
  const [cycleKey, setCycleKey] = useState(0);
  const containerRef = useRef(null);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldStart(true);
      },
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const handleTypingComplete = () => {
    setPhase('merge');
    timeoutsRef.current.push(
      setTimeout(() => setPhase('skeleton'), MERGE_MS),
      setTimeout(() => setPhase('reveal'), MERGE_MS + SKELETON_MS),
      setTimeout(() => setPhase('settled'), MERGE_MS + SKELETON_MS + SETTLE_MS),
      setTimeout(
        () => {
          setPhase('typing');
          setCycleKey((k) => k + 1);
        },
        MERGE_MS + SKELETON_MS + SETTLE_MS + TOPMATCH_MS + HOLD_MS
      )
    );
  };

  const showSkeleton = phase === 'skeleton';
  const showCards = phase === 'reveal' || phase === 'settled';
  const showBadge = phase === 'settled';

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto" dir="rtl">
      <SearchBarAnimation
        key={cycleKey}
        placeholder="יין אדום קל לשתות עם חברים"
        onTypingComplete={handleTypingComplete}
        shouldStart={shouldStart}
      />

      {phase === 'merge' && <MergeThreads />}

      <div className="relative mt-8 space-y-4">
        {showSkeleton &&
          products.map((product, index) => (
            <SkeletonCard key={`skeleton-${product.name}`} delay={index * 0.06} />
          ))}

        {showCards &&
          products.map((product, index) => (
            <ProductCard
              key={product.name}
              product={product}
              visible={showCards}
              delay={index * 0.1}
              showBadge={showBadge && index === 0}
            />
          ))}
      </div>
    </div>
  );
}
