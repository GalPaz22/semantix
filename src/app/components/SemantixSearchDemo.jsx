'use client';

import SearchAnimationContainer from './SearchAnimation/SearchAnimationContainer';

export default function SemantixSearchDemo() {
  return (
    <div className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50 rounded-[32px] opacity-70 blur-xl" />
      <div className="relative rounded-[24px] border border-gray-200 bg-white/70 p-3 shadow-xl shadow-gray-200/40 backdrop-blur-lg sm:rounded-[32px] sm:p-6">
        <SearchAnimationContainer />
      </div>
    </div>
  );
}




