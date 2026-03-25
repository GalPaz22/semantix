"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";

import type { BoostLevel, BoostProductRow } from "@/lib/dashboard/types";

import { cn } from "@/lib/utils/cn";

type BoostProductsTableProps = {
  rows: BoostProductRow[];
};

type SaveState = {
  status: "idle" | "saving" | "saved" | "failed";
  value: BoostLevel;
  error?: string;
};

const BOOST_OPTIONS: Array<{ label: string; value: BoostLevel }> = [
  { label: "נקה", value: 0 },
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 }
];

export function BoostProductsTable({ rows }: BoostProductsTableProps) {
  const [localRows, setLocalRows] = useState(rows);
  const [rowState, setRowState] = useState<Record<string, SaveState>>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalRows(rows);
    setRowState({});
  }, [rows]);

  if (!localRows.length) {
    return <p className="text-sm text-muted">אין מוצרים זמינים עבור הסינון שנבחר.</p>;
  }

  const updateBoost = (productId: string, nextBoost: BoostLevel) => {
    const previous = localRows.find((row) => row.id === productId)?.currentBoost ?? 0;

    setLocalRows((current) =>
      current.map((row) => (row.id === productId ? { ...row, currentBoost: nextBoost } : row))
    );
    setRowState((current) => ({
      ...current,
      [productId]: {
        status: "saving",
        value: nextBoost
      }
    }));

    startTransition(async () => {
      try {
        const response = await fetch("/api/dashboard/boost", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            productId,
            boost: nextBoost
          })
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "לא ניתן לשמור את הבוסט.");
        }

        setRowState((current) => ({
          ...current,
          [productId]: {
            status: "saved",
            value: nextBoost
          }
        }));
      } catch (error) {
        setLocalRows((current) =>
          current.map((row) => (row.id === productId ? { ...row, currentBoost: previous } : row))
        );
        setRowState((current) => ({
          ...current,
          [productId]: {
            status: "failed",
            value: previous,
            error: error instanceof Error ? error.message : "לא ניתן לשמור את הבוסט."
          }
        }));
      }
    });
  };

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-right text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="pb-2">מוצר</th>
            <th className="pb-2">קטגוריה</th>
            <th className="pb-2">בוסט</th>
            <th className="pb-2">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {localRows.map((row) => {
            const state = rowState[row.id];

            return (
              <tr key={row.id} className="rounded-2xl bg-white shadow-[0_8px_24px_rgba(84,55,167,0.05)]">
                <td className="rounded-r-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    {row.imageUrl ? (
                      <img src={row.imageUrl} alt={row.name} className="h-11 w-11 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5f3ff] text-xs font-bold text-[#6d28d9]">
                        {row.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-ink">{row.name}</p>
                      <p className="text-xs text-muted">{row.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{row.category ?? "ללא קטגוריה"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {BOOST_OPTIONS.map((option) => {
                      const active = row.currentBoost === option.value;
                      const saving = state?.status === "saving" && state.value === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateBoost(row.id, option.value)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                            active
                              ? "border-[#7c3aed] bg-[#f5f3ff] text-[#6d28d9]"
                              : "border-line bg-white text-muted hover:bg-[#faf7ff] hover:text-ink",
                            saving ? "opacity-70" : ""
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="rounded-l-2xl px-4 py-3">
                  {state?.status === "saving" ? (
                    <span className="text-xs font-semibold text-[#7c3aed]">שומר...</span>
                  ) : null}
                  {state?.status === "saved" ? (
                    <span className="text-xs font-semibold text-emerald-600">נשמר</span>
                  ) : null}
                  {state?.status === "failed" ? (
                    <span className="text-xs font-semibold text-danger">{state.error ?? "נכשל"}</span>
                  ) : null}
                  {!state || state.status === "idle" ? (
                    <span className="text-xs text-muted">
                      {row.currentBoost > 0 ? `בוסט ${row.currentBoost}` : "ללא בוסט"}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
