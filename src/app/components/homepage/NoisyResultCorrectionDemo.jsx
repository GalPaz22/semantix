'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import ProductThumb from '../search-saver/ProductThumb';

const query = 'sparkling red wine';

const noisyProducts = [
  { title: 'Sweet red blend', price: '$9' },
  { title: 'Merlot reserve', price: '$42' },
  { title: 'Rose sampler', price: '$15' },
  { title: 'Dessert wine', price: '$18' },
  { title: 'Red sangria', price: '$12' },
  { title: 'Random accessory', price: '$8' },
];

const cleanProducts = [
  { title: 'Light sparkling red', price: '$21', hue: '#a78bfa', variant: 'bottle' },
  { title: 'Chilled red spritz', price: '$19', hue: '#38bdf8', variant: 'can' },
  { title: 'Fruity red bubbles', price: '$23', hue: '#fb7185', variant: 'bottle' },
  { title: 'Low-tannin red', price: '$18', hue: '#34d399', variant: 'bottle' },
  { title: 'Berry sparkle', price: '$20', hue: '#f97316', variant: 'can' },
  { title: 'Red spritz pack', price: '$27', hue: '#f59e0b', variant: 'box' },
];

export default function NoisyResultCorrectionDemo() {
  const [showClean, setShowClean] = useState(false);
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
    setShowClean(false);
    const t1 = setTimeout(() => setShowClean(true), 1500);
    const t2 = setTimeout(() => setShowClean(false), 5500);
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
        {/* Noisy state */}
        <div className={`transition-opacity duration-400 ${showClean ? 'opacity-0' : 'opacity-100'}`}>
          <div className="text-sm text-gray-400 mb-4">Low-quality results</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-60">
            {noisyProducts.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3"
              >
                <div className="h-16 rounded-lg bg-gray-200 mb-3 overflow-hidden">
                  <ProductThumb
                    id={`noise-${item.title.replace(/\s+/g, '-')}`}
                    hue="#9ca3af"
                    variant="bottle"
                    theme="light"
                  />
                </div>
                <div className="text-sm text-gray-500">{item.title}</div>
                <div className="text-xs text-gray-400">{item.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clean state */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            showClean ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">Search Saver refined</div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
              Noise filtered
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cleanProducts.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="h-16 rounded-lg bg-gray-50 mb-3 overflow-hidden">
                  <ProductThumb
                    id={`clean-${item.title.replace(/\s+/g, '-')}`}
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
