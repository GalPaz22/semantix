'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function SearchBarAnimation({ placeholder, typingSpeed = 50, onSequenceComplete, shouldStart = true }) {
  const [displayText, setDisplayText] = useState('');
  const [loadingVisible, setLoadingVisible] = useState(false);
  const sequenceCompleteRef = useRef(onSequenceComplete);

  useEffect(() => {
    sequenceCompleteRef.current = onSequenceComplete;
  }, [onSequenceComplete]);

  const sequenceDuration = useMemo(() => placeholder.length * typingSpeed, [placeholder.length, typingSpeed]);

  useEffect(() => {
    if (!shouldStart) {
      setDisplayText('');
      setLoadingVisible(false);
      return;
    }

    setDisplayText('');
    setLoadingVisible(false);

    let index = 0;
    let loaderTimeoutId;
    let completionTimeoutId;

    const intervalId = setInterval(() => {
      setDisplayText(placeholder.slice(0, index + 1));
      index += 1;

      if (index === placeholder.length) {
        clearInterval(intervalId);

        loaderTimeoutId = setTimeout(() => {
          setLoadingVisible(true);

          completionTimeoutId = setTimeout(() => {
            setLoadingVisible(false);
            sequenceCompleteRef.current?.();
          }, 900);
        }, 200);
      }
    }, typingSpeed);

    return () => {
      clearInterval(intervalId);
      if (loaderTimeoutId) clearTimeout(loaderTimeoutId);
      if (completionTimeoutId) clearTimeout(completionTimeoutId);
    };
  }, [placeholder, typingSpeed, shouldStart]);

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-900 font-medium tracking-tight text-right">{displayText || '\u00A0'}</p>
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              ease: 'easeInOut',
              delay: sequenceDuration / 1000,
            }}
            className="text-gray-400 text-lg"
          >
            ▌
          </motion.span>
        </div>
      </motion.div>

      {loadingVisible && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs text-gray-500 text-center tracking-wide uppercase"
        >
          טוען תוצאות...
        </motion.p>
      )}

      <p className="text-[11px] text-gray-400 text-center tracking-[0.3em] uppercase">Powered by Semantix</p>
    </div>
  );
}

