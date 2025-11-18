'use client';

import UpsellSuiteAnimation from './UpsellAnimation/UpsellSuiteAnimation';

export default function SemantixUpsellDemo() {
  return (
    <div className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-white to-slate-100 rounded-[32px] opacity-70 blur-xl" />
      <div className="relative rounded-[32px] border border-gray-200 bg-white/80 backdrop-blur-lg p-6 shadow-xl shadow-gray-200/40">
        <UpsellSuiteAnimation />
      </div>
    </div>
  );
}

