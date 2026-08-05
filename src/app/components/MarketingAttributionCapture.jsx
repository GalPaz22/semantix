'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureMarketingAttribution } from '../lib/marketing-attribution';

/** Runs once on mount to persist campaign params from the landing URL. */
export default function MarketingAttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/dashboard')) return;
    captureMarketingAttribution();
  }, [pathname]);

  return null;
}
