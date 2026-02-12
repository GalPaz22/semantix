'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import ProductThumb from '../search-saver/ProductThumb';

const query = 'non-alcoholic aperitif';

const rescueProducts = [
  { title: 'Aperitif Spritz', price: '$22', hue: '#a78bfa', variant: 'bottle' },
  { title: 'Zero-proof Negroni', price: '$24', hue: '#f97316', variant: 'bottle' },
  { title: 'Citrus Tonic', price: '$18', hue: '#38bdf8', variant: 'can' },
  { title: 'Herbal Mixer', price: '$16', hue: '#34d399', variant: 'can' },
  { title: 'Grapefruit Soda', price: '$14', hue: '#fb7185', variant: 'can' },
  { title: 'Bitter Orange', price: '$19', hue: '#f59e0b', variant: 'bottle' },
];

export default function ZeroResultRecoveryDemo() {
  const [showRescue, setShowRescue] = useState(false);
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
    setShowRescue(false);
    const t1 = setTimeout(() => setShowRescue(true), 1500);
    const t2 = setTimeout(() => {
      setShowRescue(false);
      // small gap before next loop
    }, 5500);
    const t3 = setTimeout(() => runCycle(), 7000);
    return [t1, t2, t3];
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const timers = runCycle();
    return () => timers.forEach(clearTimeout);
  }, [isVisible, runCycle]);

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
        <div className="flex-1 text-sm text-gray-700 font-medium">{query}</div>
        <div className="text-gray-300 text-xs">⏎</div>
      </div>

      {/* Results area */}
      <div className="min-h-[280px] relative overflow-hidden rounded-xl">
        {/* Empty state */}
        <div className={`transition-opacity duration-400 ${showRescue ? 'opacity-0' : 'opacity-100'}`}>
          <div className="text-sm text-gray-400 mb-1">No results</div>
          <div className="text-sm text-gray-500 mb-5">
            We couldn&apos;t find matches for &ldquo;{query}&rdquo;.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-40">
            {[...Array(6)].map((_, i) => (
              <div key={`empty-${i}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="h-16 rounded-lg bg-gray-200 mb-3" />
                <div className="h-2.5 rounded bg-gray-200 mb-2" />
                <div className="h-2.5 w-2/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Rescue state */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            showRescue ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">Search Saver is on</div>
            <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700">
              Recovery mode
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rescueProducts.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="h-16 rounded-lg bg-gray-50 mb-3 overflow-hidden">
                  <ProductThumb
                    id={`zr-${item.title.replace(/\s+/g, '-')}`}
                    hue={item.hue}
                    variant={item.variant}
                    theme="light"
                  />
                </div>
                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                <div className="text-xs text-gray-500">{item.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
