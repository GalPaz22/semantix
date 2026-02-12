import React from 'react';

export default function SearchSaverAnimationLight() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="search-saver-orbit">
        <svg
          className="search-saver-ring-light"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <defs>
            <path
              id="searchSaverRingPathLight"
              d="M 100,100 m -50,0 a 50,50 0 1,1 100,0 a 50,50 0 1,1 -100,0"
            />
            <filter id="searchSaverGlowLight" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Shadow ring */}
          <g transform="translate(6 8)" opacity="0.45">
            <circle
              cx="100"
              cy="100"
              r="50"
              fill="none"
              stroke="#c8b8f0"
              strokeWidth="60"
            />
          </g>

          {/* Main ring */}
          <g filter="url(#searchSaverGlowLight)">
            <circle
              cx="100"
              cy="100"
              r="50"
              fill="none"
              stroke="white"
              strokeWidth="60"
            />
          </g>

          {/* Text on ring */}
          <text fill="#7c3aed" fontSize="12" fontWeight="600" letterSpacing="2">
            <textPath
              href="#searchSaverRingPathLight"
              startOffset="0%"
              textLength="130"
              lengthAdjust="spacing"
            >
              SEARCH SAVER ·
            </textPath>
          </text>
          <text fill="#7c3aed" fontSize="12" fontWeight="600" letterSpacing="2">
            <textPath
              href="#searchSaverRingPathLight"
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
