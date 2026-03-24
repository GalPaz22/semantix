import type { MetricValue } from "@/lib/dashboard/types";

export function formatMetric(metric: MetricValue) {
  if (metric.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(metric.value);
  }

  if (metric.format === "percent") {
    return `${(metric.value * 100).toFixed(1)}%`;
  }

  if (metric.format === "duration") {
    return `${metric.value.toFixed(1)}h`;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(metric.value);
}

export function formatDelta(delta?: number) {
  if (delta == null) {
    return "No comparison";
  }

  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);

  return `₪${compact}`;
}

export function formatCurrency(value: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value);

  return `₪${formatted}`;
}

export function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
