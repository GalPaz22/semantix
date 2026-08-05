'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function SearchBarAnimation({ placeholder, typingSpeed = 42, onTypingComplete, shouldStart = true }) {
  const [displayText, setDisplayText] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const onTypingCompleteRef = useRef(onTypingComplete);

  useEffect(() => {
    onTypingCompleteRef.current = onTypingComplete;
  }, [onTypingComplete]);

  useEffect(() => {
    if (!shouldStart) {
      setDisplayText('');
      setTypingDone(false);
      return;
    }

    setDisplayText('');
    setTypingDone(false);

    let index = 0;
    let completionTimeoutId;

    const intervalId = setInterval(() => {
      setDisplayText(placeholder.slice(0, index + 1));
      index += 1;

      if (index === placeholder.length) {
        clearInterval(intervalId);
        completionTimeoutId = setTimeout(() => {
          setTypingDone(true);
          onTypingCompleteRef.current?.();
        }, 150);
      }
    }, typingSpeed);

    return () => {
      clearInterval(intervalId);
      if (completionTimeoutId) clearTimeout(completionTimeoutId);
    };
  }, [placeholder, typingSpeed, shouldStart]);

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-900 font-medium tracking-tight">{displayText || ' '}</p>
          </div>
          {!typingDone && (
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
              className="text-gray-400 text-lg"
            >
              ▌
            </motion.span>
          )}
        </div>
      </motion.div>

      <p className="text-[11px] text-gray-400 text-center tracking-[0.3em] uppercase">מופעל על ידי Semantix</p>
    </div>
  );
}
