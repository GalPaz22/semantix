export default function ProductThumb({ id, hue = '#a78bfa', variant = 'bottle' }) {
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

      <ellipse cx="60" cy="70" rx="38" ry="10" fill="#000000" opacity="0.10" />

      <g filter={`url(#${id}-shadow)`}>
        {variant === 'bottle' && (
          <>
            <rect x="54" y="10" width="12" height="12" rx="4" fill="#0b0616" opacity="0.45" />
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
            <path
              d="M46 40 L74 40 L74 62 C74 64,72 66,70 66 L50 66 C48 66,46 64,46 62 Z"
              fill={hue}
              opacity="0.30"
            />
            <rect x="48" y="36" width="24" height="18" rx="4" fill="#ffffff" opacity="0.14" />
            <rect x="51" y="40" width="18" height="2.6" rx="1.3" fill="#ffffff" opacity="0.20" />
            <rect x="51" y="45" width="12" height="2.6" rx="1.3" fill="#ffffff" opacity="0.16" />
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
