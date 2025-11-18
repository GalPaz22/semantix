'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

const mainBook = {
  title: 'ספיינס: תולדות האנושות',
  author: 'יובל נח הררי',
  description:
    'חקר פורץ דרך של האנושות, מהאבות הקדומים ועד לעידן המודרני.',
  price: '₪89',
  cover: 'https://images-na.ssl-images-amazon.com/images/I/713jIoMO3UL.jpg',
};

const upsellItems = [
  {
    title: 'הומו דאוס',
    author: 'יובל נח הררי',
    price: '₪99',
    description: 'המשך מכוון עתיד שמדמיין את הפרק הבא של האנושות.',
    cover: '/books/homo-deus.jpg',
  },
  {
    title: 'רובים, חיידקים ופלדה',
    author: 'ג\'ארד דיאמונד',
    price: '₪79',
    description: 'היסטוריה מקיפה שמסבירה כיצד חברות עולות, מסתגלות ונופלות.',
    cover: '/books/guns-germs-steel.jpg',
  },
  {
    title: 'הגן',
    author: 'סידהרתה מוקרג\'י',
    price: '₪115',
    description: 'היסטוריה אינטימית של הגן וכיצד הוא מעצב כל סיפור אנושי.',
    cover: '/books/the-gene.jpg',
  },
];

const tagStages = {
  ai: { title: 'זיהוי כוונה באמצעות AI', tone: 'signals' },
  inline: { title: 'המלצות מותאמות בתוך התוצאות', tone: 'social' },
};

function useUpsellSequence(isVisible) {
  const [bubbleStage, setBubbleStage] = useState('hidden');
  const [showUpsells, setShowUpsells] = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setBubbleStage('hidden');
      setShowUpsells(false);
      setShowTagline(false);
      return;
    }

    const timers = [
      setTimeout(() => setBubbleStage('ai'), 800),
      setTimeout(() => setBubbleStage('hidden'), 2000),
      setTimeout(() => {
        setShowUpsells(true);
      }, 2200),
      setTimeout(() => setShowTagline(true), 3000),
    ];

    return () => {
      timers.forEach((id) => clearTimeout(id));
    };
  }, [isVisible]);

  return {
    bubbleStage,
    showUpsells,
    showTagline,
  };
}

function AITag({ stage }) {
  return (
    <div className="pointer-events-none absolute -top-12 left-1/2 z-10 flex -translate-x-1/2 justify-center">
      <AnimatePresence mode="wait">
        {stage !== 'hidden' && (
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-lg shadow-gray-200/60"
            dir="rtl"
          >
            <motion.span
              className={`h-2.5 w-2.5 rounded-full ${
                tagStages[stage].tone === 'signals' ? 'bg-purple-500' : 'bg-gray-300'
              }`}
              animate={
                tagStages[stage].tone === 'signals'
                  ? { opacity: [0.35, 1, 0.35], scale: [0.9, 1.2, 0.9] }
                  : { opacity: 1, scale: 1 }
              }
              transition={{
                duration: 1.6,
                repeat: tagStages[stage].tone === 'signals' ? Infinity : 0,
                ease: 'easeInOut',
              }}
            />
            {tagStages[stage].title}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MainProductCard({ book }) {
  return (
    <motion.div
      className="flex w-full flex-col gap-3.5 rounded-[18px] border border-gray-100 bg-white px-3.5 py-3.5 shadow-xl shadow-gray-900/5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div className="h-48 w-36 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-inner flex items-center justify-center">
          <img src={book.cover} alt={book.title} className="max-h-full max-w-full object-contain" loading="lazy" />
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-400 text-right">
              מערכת Upsell של Semantix
            </p>
            <h3 className="mt-1 text-[1.05rem] font-semibold leading-tight text-gray-900 text-right">{book.title}</h3>
            <p className="text-xs text-gray-600 text-right">{book.description}</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] justify-end">
            <span className="text-gray-500">כריכה קשה</span>
            <span className="text-base font-semibold text-gray-900">{book.price}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-1.5 text-[10px] font-medium text-gray-600">
        <span className="text-gray-400">זמין באופן מיידי</span>
        <span>מאת {book.author}</span>
      </div>
    </motion.div>
  );
}

function UpsellCard({ item, delay, show }) {
  return (
    <motion.div
      className="group flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-lg shadow-gray-900/5"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 24 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      dir="rtl"
    >
      <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 p-3 shadow-inner">
        <img src={item.cover} alt={item.title} className="h-28 w-20 object-contain" loading="lazy" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold leading-tight text-gray-900 text-right">{item.title}</p>
        <p className="text-xs text-gray-500 text-right">{item.author}</p>
        <p className="text-xs text-gray-600 leading-relaxed text-right">{item.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between text-xs font-semibold text-gray-900">
        <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400">הוסף</span>
        <span>{item.price}</span>
      </div>
    </motion.div>
  );
}

function ConnectorLine({ isActive }) {
  return (
    <motion.svg
      width="320"
      height="140"
      viewBox="0 0 320 140"
      fill="none"
      className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2"
    >
      <motion.path
        d="M32 18 C 140 30, 200 90, 290 120"
        stroke="rgba(139, 92, 246, 0.35)"
        strokeWidth="2"
        strokeDasharray="6 10"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: isActive ? 1 : 0 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

function UpsellExperience({ animationState }) {
  const { bubbleStage, showUpsells, showTagline } = animationState;

  return (
    <div className="relative flex flex-col items-center gap-8">
      <div className="relative w-full max-w-[280px] text-center">
        <AITag stage={bubbleStage} />
        <MainProductCard book={mainBook} />
        <p className="mt-4 text-xs font-medium text-gray-500" dir="rtl">
          הקונה חיפש "{mainBook.title}" — Semantix מזריק כותרים משלימים ישירות לתוך התוצאות.
        </p>
      </div>

      <div className="relative w-full max-w-2xl pt-10">
        <ConnectorLine isActive={showUpsells} />
        <motion.div
          className="relative z-10 mb-3 text-center text-sm font-medium text-gray-600"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: showUpsells ? 1 : 0, y: showUpsells ? 0 : 6 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          dir="rtl"
        >
          Semantix מוסיף כותרים משלימים ישירות בתוצאות, ללא חלונות קופצים, ללא כללים ידניים
        </motion.div>
        <div className="relative z-10 grid gap-3 sm:grid-cols-3">
          {upsellItems.map((item, index) => (
            <UpsellCard key={item.title} item={item} delay={0.15 * index + 0.2} show={showUpsells} />
          ))}
        </div>
      </div>

      <motion.p
        className="text-center text-base font-medium text-gray-700"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: showTagline ? 1 : 0, y: showTagline ? 0 : 6 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        dir="rtl"
      >
        יותר רלוונטיות. יותר הכנסות.
      </motion.p>
    </div>
  );
}

export default function UpsellSuiteAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const animationState = useUpsellSequence(isVisible);

  return (
    <section 
      ref={sectionRef}
      className="relative flex w-full items-center justify-center rounded-[28px] border border-gray-200 bg-white/95 p-4 shadow-2xl shadow-gray-900/10"
    >
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#F2EAFE] via-white to-white" />
      <div className="relative w-full max-w-2xl">
        <UpsellExperience animationState={animationState} />
      </div>
    </section>
  );
}

