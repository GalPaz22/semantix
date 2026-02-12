import React from 'react';

export default function SearchSaverAnimation() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="search-saver-orbit">
        <svg
          className="search-saver-ring"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <defs>
            <path
              id="searchSaverRingPath"
              d="M 100,100 m -50,0 a 50,50 0 1,1 100,0 a 50,50 0 1,1 -100,0"
            />
            <filter id="searchSaverGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="searchSaverHighlight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g transform="translate(6 8)" opacity="0.6">
            <circle
              cx="100"
              cy="100"
              r="50"
              fill="none"
              stroke="#b9a6ef"
              strokeWidth="60"
            />
          </g>

          <g filter="url(#searchSaverGlow)">
            <circle
              cx="100"
              cy="100"
              r="50"
              fill="none"
              stroke="white"
              strokeWidth="60"
            />
            <circle
              cx="100"
              cy="100"
              r="50"
              fill="none"
              stroke="url(#searchSaverHighlight)"
              strokeWidth="10"
            />
          </g>

          <text fill="#e9ddff" fontSize="12" fontWeight="600" letterSpacing="2">
            <textPath
              href="#searchSaverRingPath"
              startOffset="100%"
              textLength="130"
              lengthAdjust="spacing"
            >
              SEARCH SAVER ·
            </textPath>
          </text>
          <text fill="#e9ddff" fontSize="12" fontWeight="600" letterSpacing="2">
            <textPath
              href="#searchSaverRingPath"
              startOffset="50%"
              textLength="130"
              lengthAdjust="spacing"
            >
              SEARCH SAVER ·
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}
