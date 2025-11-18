'use client';

import { useState, useEffect, useRef } from 'react';
import SearchBarAnimation from './SearchBarAnimation';
import ProductCard from './ProductCard';

const products = [
  {
    name: 'שאטו דה לה סלב — פטיט סלב',
    description:
      'יין אדום קל ופירותי — מושלם לשתייה עם חברים, עם נגיעות תבליניות מרעננות.',
    price: '₪89',
    image: '/wine1.png',
  },
  {
    name: 'לוסטיג — לולו דולצ\'טו',
    description:
      'דולצ\'טו קל ונעים עם נגיעות של פירות יער ותנינים רכים — אידיאלי לאווירה צעירה וסלחנית.',
    price: '₪135',
    image: '/wine2.png',
  },
  {
    name: 'דומיין דניזוט — סאנסר רוז\' ביורגה',
    description:
      'פינו נואר אלגנטי ומאוזן, בעל גוף בינוני ומשיי — מצוין לערב משפחתי רגוע.',
    price: '₪289',
    image: '/wine3.png',
  },
];

export default function SearchAnimationContainer() {
  const [cardsVisible, setCardsVisible] = useState(false);
  const [shouldStart, setShouldStart] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldStart(true);
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto">
      <SearchBarAnimation
        placeholder="יין אדום קל לשתייה עם חברים"
        onSequenceComplete={() => setCardsVisible(true)}
        shouldStart={shouldStart}
      />
      <div className="mt-8 space-y-4">
        {products.map((product, index) => (
          <ProductCard
            key={product.name}
            product={product}
            visible={cardsVisible && shouldStart}
            delay={0.6 + index * 0.2}
          />
        ))}
      </div>
    </div>
  );
}

