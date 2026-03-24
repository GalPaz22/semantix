import type { QueryTermStat } from "@/lib/dashboard/types";

export function QueryTermCloud({ terms }: { terms: QueryTermStat[] }) {
  if (!terms.length) {
    return <p className="text-sm text-muted">No popular query terms are available yet.</p>;
  }

  const maxValue = Math.max(...terms.map((term) => term.value), 1);

  return (
    <div className="flex flex-wrap gap-3">
      {terms.map((term) => {
        const scale = 0.9 + term.value / maxValue;
        return (
          <span
            key={term.term}
            className="rounded-full bg-[#f3efff] px-4 py-2 font-bold text-[#5d44ef]"
            style={{ fontSize: `${scale}rem` }}
          >
            {term.term}
          </span>
        );
      })}
    </div>
  );
}
