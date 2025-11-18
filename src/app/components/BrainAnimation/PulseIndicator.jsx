'use client';

import { motion } from 'framer-motion';

export default function PulseIndicator() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-[#9C4FFF] to-[#6E46FF] opacity-20"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.1, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-[#9C4FFF] to-[#6E46FF] opacity-30"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.15, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3,
        }}
      />
    </div>
  );
}

