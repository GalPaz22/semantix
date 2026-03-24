"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 15_000;

export function CustomersAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const startPolling = () => {
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          router.refresh();
        }
      }, REFRESH_INTERVAL_MS);
    };

    startPolling();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [router]);

  return null;
}
