'use client';

import { useEffect, useState } from 'react';

function ProductThumb({ id, hue = '#a78bfa', variant = 'bottle' }) {
  // Inline SVG “mock photo” for wine/spirits without external assets.
  // `id` is used to keep gradient/filter IDs unique per card.
  const glass = 'rgba(255,255,255,0.22)';

  return (
    <svg viewBox="0 0 120 80" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={hue} stopOpacity="0.22" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur" />
          <feOffset dx="0" dy="2" result="off" />
          <feColorMatrix
            in="off"
            type="matrix"
            values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.28 0"
            result="shadow"
          />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="120" height="80" rx="10" fill={`url(#${id}-bg)`} />

      {/* soft “photo” vignette */}
      <ellipse cx="60" cy="70" rx="38" ry="10" fill="#000000" opacity="0.10" />

      {/* product */}
      <g filter={`url(#${id}-shadow)`}>
        {variant === 'bottle' && (
          <>
            {/* bottle neck */}
            <rect x="54" y="10" width="12" height="12" rx="4" fill="#0b0616" opacity="0.45" />
            {/* bottle body */}
            <path
              d="M44 22
                 C44 18, 48 16, 52 16
                 L68 16
                 C72 16, 76 18, 76 22
                 L76 62
                 C76 66, 72 68, 68 68
                 L52 68
                 C48 68, 44 66, 44 62
                 Z"
              fill="#0b0616"
              opacity="0.40"
            />
            {/* liquid */}
            <path
              d="M46 40 L74 40 L74 62 C74 64,72 66,70 66 L50 66 C48 66,46 64,46 62 Z"
              fill={hue}
              opacity="0.30"
            />
            {/* label */}
            <rect x="48" y="36" width="24" height="18" rx="4" fill="#ffffff" opacity="0.14" />
            <rect x="51" y="40" width="18" height="2.6" rx="1.3" fill="#ffffff" opacity="0.20" />
            <rect x="51" y="45" width="12" height="2.6" rx="1.3" fill="#ffffff" opacity="0.16" />
            {/* highlight */}
            <path d="M52 18 C50 26,50 56,52 66" stroke={`url(#${id}-shine)`} strokeWidth="6" opacity="0.6" />
          </>
        )}

        {variant === 'can' && (
          <>
            <rect x="46" y="18" width="28" height="50" rx="10" fill="#0b0616" opacity="0.36" />
            <rect x="48" y="22" width="24" height="42" rx="8" fill={hue} opacity="0.18" />
            <rect x="50" y="34" width="20" height="18" rx="5" fill="#ffffff" opacity="0.12" />
            <path d="M54 22 C52 34,52 54,54 66" stroke={`url(#${id}-shine)`} strokeWidth="6" opacity="0.55" />
            <rect x="49" y="18" width="22" height="6" rx="3" fill={glass} />
          </>
        )}

        {variant === 'box' && (
          <>
            <rect x="40" y="24" width="40" height="44" rx="10" fill="#0b0616" opacity="0.33" />
            <rect x="44" y="28" width="32" height="36" rx="8" fill={hue} opacity="0.16" />
            <rect x="46" y="34" width="28" height="14" rx="5" fill="#ffffff" opacity="0.10" />
            <path d="M50 28 C48 40,48 54,50 66" stroke={`url(#${id}-shine)`} strokeWidth="6" opacity="0.5" />
          </>
        )}
      </g>
    </svg>
  );
}

export default function SearchSaverHowItWorks() {
  const [showRescue, setShowRescue] = useState(false);
  const [showCleanResults, setShowCleanResults] = useState(false);
  const query = 'non-alcoholic aperitif';
  const noisyQuery = 'sparkling red wine';

  useEffect(() => {
    const rescueTimeout = setTimeout(() => setShowRescue(true), 1200);
    const cleanTimeout = setTimeout(() => setShowCleanResults(true), 1400);

    return () => {
      clearTimeout(rescueTimeout);
      clearTimeout(cleanTimeout);
    };
  }, []);

  return (
    <section className="bg-[#120a22] text-white py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="max-w-4xl mb-10">
          <p className="text-sm uppercase tracking-[0.35em] text-white/40 mb-3">
            Search Saver (Powered by Semantix)
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold mb-4">How Search Saver works: 2 operating modes</h2>
          <p className="text-white/70 text-lg mb-4">
            Search Saver is an intelligent revenue-recovery layer that sits on top of existing
            e-commerce search. Its goal is simple: make sure search never fails — even when the
            original search does.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="flex flex-col gap-4">
              <p className="text-sm uppercase tracking-[0.3em] text-white/40">Mode 1</p>
              <h3 className="text-2xl font-semibold">No-Results Recovery</h3>
              <p className="text-white/70 text-sm">
                When a search returns zero results, Search Saver activates automatically. It
                understands the user’s intent and instantly suggests the most relevant alternatives,
                turning “no results” into a saved purchase.
              </p>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/60">
                  🔍
                </div>
                <div className="flex-1 text-white/80">{query}</div>
                <div className="text-white/30">⏎</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 min-h-[300px] relative overflow-hidden">
                <div className={`transition-opacity duration-300 ${showRescue ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="text-sm text-white/50 mb-2">No results</div>
                  <div className="text-white/70 text-sm">
                    We couldn’t find matches for “{query}”.
                  </div>
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-40">
                    {[...Array(6)].map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="h-20 rounded-lg bg-white/10 mb-3" />
                        <div className="h-3 rounded bg-white/10 mb-2" />
                        <div className="h-3 w-2/3 rounded bg-white/10" />
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`absolute inset-0 p-5 transition-opacity duration-500 ${
                    showRescue ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-white/50">Search Saver is on</div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                      Recovery mode
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { title: 'Aperitif Spritz', price: '$22', hue: '#a78bfa', variant: 'bottle' },
                      { title: 'Zero-proof Negroni', price: '$24', hue: '#f97316', variant: 'bottle' },
                      { title: 'Citrus Tonic', price: '$18', hue: '#38bdf8', variant: 'can' },
                      { title: 'Herbal Mixer', price: '$16', hue: '#34d399', variant: 'can' },
                      { title: 'Grapefruit Soda', price: '$14', hue: '#fb7185', variant: 'can' },
                      { title: 'Bitter Orange', price: '$19', hue: '#f59e0b', variant: 'bottle' },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-white/10 bg-white/10 p-3"
                      >
                        <div className="h-20 rounded-lg bg-white/10 mb-3 overflow-hidden">
                          <ProductThumb
                            id={`mode1-${item.title.replace(/\s+/g, '-')}`}
                            hue={item.hue}
                            variant={item.variant}
                          />
                        </div>
                        <div className="text-sm text-white/80">{item.title}</div>
                        <div className="text-xs text-white/50">{item.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="flex flex-col gap-4">
              <p className="text-sm uppercase tracking-[0.3em] text-white/40">Mode 2</p>
              <h3 className="text-2xl font-semibold">Noise Filtering &amp; Result Correction</h3>
              <p className="text-white/70 text-sm">
                When search returns results that are technically correct but semantically wrong,
                Search Saver steps in. It filters out irrelevant noise and re-ranks products based
                on real intent and personalization — delivering clean, accurate results that convert.
              </p>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/60">
                  🔍
                </div>
                <div className="flex-1 text-white/80">{noisyQuery}</div>
                <div className="text-white/30">⏎</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 min-h-[300px] relative overflow-hidden">
                <div className={`transition-opacity duration-300 ${showCleanResults ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="text-sm text-white/50 mb-2">Low-quality results</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-60">
                    {[
                      { title: 'Sweet red blend', price: '$9' },
                      { title: 'Merlot reserve', price: '$42' },
                      { title: 'Rose sampler', price: '$15' },
                      { title: 'Dessert wine', price: '$18' },
                      { title: 'Red sangria', price: '$12' },
                      { title: 'Random accessory', price: '$8' },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="h-20 rounded-lg bg-white/10 mb-3 overflow-hidden">
                          <ProductThumb
                            id={`noise-${item.title.replace(/\s+/g, '-')}`}
                            hue="#9ca3af"
                            variant="bottle"
                          />
                        </div>
                        <div className="text-sm text-white/70">{item.title}</div>
                        <div className="text-xs text-white/40">{item.price}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`absolute inset-0 p-5 transition-opacity duration-500 ${
                    showCleanResults ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-white/50">Search Saver refined</div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                      Noise filtered
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { title: 'Light sparkling red', price: '$21', hue: '#a78bfa', variant: 'bottle' },
                      { title: 'Chilled red spritz', price: '$19', hue: '#38bdf8', variant: 'can' },
                      { title: 'Fruity red bubbles', price: '$23', hue: '#fb7185', variant: 'bottle' },
                      { title: 'Low-tannin red', price: '$18', hue: '#34d399', variant: 'bottle' },
                      { title: 'Berry sparkle', price: '$20', hue: '#f97316', variant: 'can' },
                      { title: 'Red spritz pack', price: '$27', hue: '#f59e0b', variant: 'box' },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-white/10 bg-white/10 p-3"
                      >
                        <div className="h-20 rounded-lg bg-white/10 mb-3 overflow-hidden">
                          <ProductThumb
                            id={`mode2-${item.title.replace(/\s+/g, '-')}`}
                            hue={item.hue}
                            variant={item.variant}
                          />
                        </div>
                        <div className="text-sm text-white/80">{item.title}</div>
                        <div className="text-xs text-white/50">{item.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-white/70 text-sm">
            Search Saver turns failed and low-quality searches into revenue, without replacing existing search.
          </p>
        </div>
      </div>
    </section>
  );
}
