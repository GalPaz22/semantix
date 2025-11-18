'use client';

import BrainContainer from './BrainAnimation/BrainContainer';

export default function SemantixBrainDemo() {
  return (
    <div className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-[32px] opacity-70 blur-xl" />
      <div className="relative rounded-[32px] border border-gray-200 bg-white/80 backdrop-blur-lg p-6 shadow-xl shadow-gray-200/40">
        <BrainContainer />
      </div>
    </div>
  );
}

