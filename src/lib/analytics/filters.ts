import type { DashboardFilters } from "@/lib/dashboard/types";

import { getEnv } from "@/lib/config/env";

const FALLBACK_DATE_RANGE_DAYS = 30;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildDefaultFilters(): DashboardFilters {
  let defaultRangeDays = FALLBACK_DATE_RANGE_DAYS;

  try {
    defaultRangeDays = getEnv().DEFAULT_DATE_RANGE_DAYS;
  } catch {
    defaultRangeDays = FALLBACK_DATE_RANGE_DAYS;
  }

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - defaultRangeDays);

  return {
    from: toIsoDate(from),
    to: toIsoDate(to)
  };
}

export function parseFilters(input: URLSearchParams | Record<string, string | string[] | undefined>) {
  const defaults = buildDefaultFilters();
  const getValue = (key: keyof DashboardFilters) => {
    if (input instanceof URLSearchParams) {
      return input.get(key) ?? undefined;
    }

    const value = input[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    from: getValue("from") ?? defaults.from,
    to: getValue("to") ?? defaults.to,
    region: getValue("region"),
    status: getValue("status"),
    channel: getValue("channel"),
    product: getValue("product"),
    team: getValue("team")
  } satisfies DashboardFilters;
}
