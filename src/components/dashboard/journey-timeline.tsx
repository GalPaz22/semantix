import type { CustomerJourneyStep } from "@/lib/dashboard/types";

import { formatCompactCurrency, formatDate } from "@/lib/dashboard/format";

const stepStyles = {
  search: "bg-[#f1ecff] text-[#6c49ea]",
  click: "bg-[#eef2ff] text-[#4362f0]",
  cart: "bg-[#eefbf3] text-[#1ca85c]",
  purchase: "bg-[#fff2f4] text-[#d65771]"
};

export function JourneyTimeline({ journey }: { journey: CustomerJourneyStep[] }) {
  if (!journey.length) {
    return <p className="text-sm text-muted">No journey steps are available for this profile.</p>;
  }

  return (
    <div className="grid gap-4">
      {journey.map((step, index) => (
        <div key={step.id} className="grid grid-cols-[48px_minmax(0,1fr)] gap-4">
          <div className="flex flex-col items-center">
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ${stepStyles[step.type]}`}>
              {index + 1}
            </span>
            {index < journey.length - 1 ? <span className="mt-2 h-full w-px bg-[#e5dcff]" /> : null}
          </div>
          <div className="rounded-panel border border-line/70 bg-[#fcfbff] p-4">
            <p className="text-sm font-semibold text-ink">{step.label}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
              {step.timestamp ? <span>{formatDate(step.timestamp)}</span> : null}
              {step.product ? <span>{step.product}</span> : null}
              {step.value != null ? <span>{formatCompactCurrency(step.value)}</span> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
