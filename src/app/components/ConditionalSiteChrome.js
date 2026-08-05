'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { PRIMARY_CTA, PRIMARY_CTA_HREF } from '../lib/marketing-copy';
import HeaderAuthButton from '../HeaderAuthButton';
import WhatWeDoDropdown from './WhatWeDoDropdown';
import MobileMenu from './MobileMenu';

function isFocusedFlow(pathname) {
  return pathname?.startsWith('/dashboard');
}

export function ConditionalMarketingNav() {
  const pathname = usePathname();

  if (isFocusedFlow(pathname)) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-lg" dir="rtl">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-1.5 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="flex shrink-0 items-center">
            <img src="/main-logo.svg" alt="Semantix" className="h-7 w-auto sm:h-11" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <WhatWeDoDropdown />
            <Link
              href="/case-studies"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              פרויקטים
            </Link>
            <Link
              href="/learn"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              למידה
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              אודות
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">
          <Link
            href={PRIMARY_CTA_HREF}
            className="animate-white-glow relative flex items-center overflow-visible rounded-full border-2 border-purple-500 bg-gradient-to-r from-purple-600 to-purple-500 px-2 py-1 text-[11px] font-medium leading-none text-white shadow-lg shadow-purple-500/40 transition-all duration-300 hover:from-purple-700 hover:to-purple-600 hover:shadow-2xl hover:shadow-purple-500/70 sm:px-4 sm:py-1.5 sm:text-sm sm:leading-normal"
          >
            <span>{PRIMARY_CTA}</span>
          </Link>
          <HeaderAuthButton />
          <MobileMenu />
        </div>
      </div>
    </nav>
  );
}

export function ConditionalMainPadding({ children }) {
  const pathname = usePathname();

  return (
    <div className={isFocusedFlow(pathname) ? 'flex-grow relative' : 'relative flex-grow overflow-x-hidden pt-12 sm:pt-16'}>
      {children}
    </div>
  );
}
