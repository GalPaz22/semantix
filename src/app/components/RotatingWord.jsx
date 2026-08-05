'use client';

import { useState, useEffect } from 'react';

export default function RotatingWord() {
  const words = ['Smarter.', 'Profitable.', 'Insightful.'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setFade(false);
    }, 2000);

    const changeWordTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
      setFade(true);
    }, 2300);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(changeWordTimer);
    };
  }, [currentIndex]);

  return (
    <span
      className={`text-purple-600 animate-shimmer transition-opacity duration-300 ${
        fade ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {words[currentIndex]}
    </span>
  );
}
