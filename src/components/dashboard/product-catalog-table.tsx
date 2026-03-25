"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";

import type { BoostLevel, BoostProductRow } from "@/lib/dashboard/types";

import { formatCurrency } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils/cn";

type ProductCatalogTableProps = {
  rows: BoostProductRow[];
  editable?: boolean;
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

function statusTone(status?: string) {
  if (!status) return "bg-slate-100 text-slate-700";
  if (/in stock|available|active/i.test(status)) return "bg-emerald-100 text-emerald-700";
  if (/out|inactive|disabled/i.test(status)) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function formatProductStatus(status?: string) {
  if (!status) return status;
  if (/^in stock$/i.test(status)) return "במלאי";
  if (/^out of stock$/i.test(status)) return "אזל מהמלאי";
  if (/^available$/i.test(status)) return "זמין";
  if (/^active$/i.test(status)) return "פעיל";
  if (/^inactive$/i.test(status)) return "לא פעיל";
  if (/^disabled$/i.test(status)) return "מושבת";
  return status;
}

function BoostControl({
  value,
  productId,
  onChange,
  disabled
}: {
  value: BoostLevel;
  productId: string;
  onChange: (productId: string, nextBoost: BoostLevel) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BOOST_OPTIONS.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(productId, option.value)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
              active
                ? "border-[#7c3aed] bg-[#f5f3ff] text-[#6d28d9]"
                : "border-line bg-white text-muted hover:bg-[#faf7ff] hover:text-ink",
              disabled ? "cursor-not-allowed opacity-70" : ""
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProductCatalogTable({ rows, editable = false }: ProductCatalogTableProps) {
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
    if (!editable) {
      return;
    }

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, boost: nextBoost })
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
    <div className="grid gap-3">
      <div className="grid gap-3 xl:hidden">
        {localRows.map((row) => {
          const state = rowState[row.id];
          const categoryItems = [row.category, ...row.softCategories]
            .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index)
            .slice(0, 4);

          return (
            <article
              key={row.id}
              className={cn(
                "rounded-2xl border border-line bg-white p-3.5 shadow-[0_8px_24px_rgba(84,55,167,0.05)]",
                row.currentBoost > 0 ? "ring-1 ring-[#e9ddff]" : ""
              )}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[15px] font-semibold leading-6 text-ink">{row.name}</p>
                    {row.currentBoost > 0 ? (
                      <span className="rounded-full bg-[#f3e8ff] px-2 py-0.5 text-[11px] font-semibold text-[#7c3aed]">
                        בוסט {row.currentBoost}
                      </span>
                    ) : null}
                    {row.status ? (
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusTone(row.status))}>
                        {formatProductStatus(row.status)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted">מזהה {row.id}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold text-ink">
                      {row.price != null ? formatCurrency(row.price) : "-"}
                    </span>
                    <span className="text-muted">{row.clicks.toLocaleString("he-IL")} קליקים</span>
                    <span className="text-muted">{row.carts.toLocaleString("he-IL")} עגלות</span>
                  </div>

                  {categoryItems.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {categoryItems.map((item, index) => (
                        <span
                          key={`${row.id}-${item}`}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            index === 0 ? "bg-[#eef2ff] text-[#4f46e5]" : "bg-[#f8fafc] text-[#64748b]"
                          )}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {row.imageUrl ? (
                  <img src={row.imageUrl} alt={row.name} className="h-14 w-10 rounded-xl object-cover sm:h-16 sm:w-12" />
                ) : (
                  <div className="flex h-14 w-10 items-center justify-center rounded-xl bg-[#f5f3ff] text-sm font-bold text-[#6d28d9] sm:h-16 sm:w-12">
                    {row.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-1.5">
                {editable ? (
                  <>
                        <BoostControl value={row.currentBoost} productId={row.id} onChange={updateBoost} disabled={!editable} />
                        <p className="text-[11px] text-muted">
                          {row.currentBoost > 0
                            ? `במעקב: ${row.clicks.toLocaleString("he-IL")} קליקים ו-${row.carts.toLocaleString("he-IL")} עגלות`
                            : "אין בוסט פעיל"}
                        </p>
                      </>
                    ) : (
                  <p className="text-sm font-semibold text-ink">{row.currentBoost > 0 ? `בוסט ${row.currentBoost}` : "ללא בוסט"}</p>
                )}

                {state?.status === "saving" ? <p className="text-[11px] font-semibold text-[#7c3aed]">שומר...</p> : null}
                {state?.status === "saved" ? <p className="text-[11px] font-semibold text-emerald-600">נשמר</p> : null}
                {state?.status === "failed" ? <p className="text-[11px] font-semibold text-danger">{state.error ?? "נכשל"}</p> : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-auto xl:block">
        <table className="min-w-full border-separate border-spacing-y-2 text-right text-sm">
          <thead className="sticky top-0 z-10 bg-[#fcfbff] text-xs uppercase tracking-[0.18em] text-muted">
            <tr>
              <th className="pb-2 pr-4">מוצר</th>
              <th className="pb-2 pr-4">קטגוריה</th>
              <th className="pb-2 pr-4">מחיר</th>
              <th className="pb-2 pr-4">ביצועים</th>
              <th className="pb-2">בוסט</th>
            </tr>
          </thead>
          <tbody>
            {localRows.map((row) => {
              const state = rowState[row.id];
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "rounded-2xl bg-white shadow-[0_8px_24px_rgba(84,55,167,0.05)]",
                    row.currentBoost > 0 ? "ring-1 ring-[#e9ddff]" : ""
                  )}
                >
                  <td className="rounded-r-2xl px-4 py-2.5">
                    <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-ink">{row.name}</p>
                        {row.currentBoost > 0 ? (
                          <span className="rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[11px] font-semibold text-[#7c3aed]">
                            בוסט {row.currentBoost}
                          </span>
                        ) : null}
                        {row.status ? (
                          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone(row.status))}>
                            {formatProductStatus(row.status)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">מזהה {row.id}</p>
                      {state?.status === "saving" ? <p className="mt-1 text-xs font-semibold text-[#7c3aed]">שומר...</p> : null}
                      {state?.status === "saved" ? <p className="mt-1 text-xs font-semibold text-emerald-600">נשמר</p> : null}
                      {state?.status === "failed" ? <p className="mt-1 text-xs font-semibold text-danger">{state.error ?? "נכשל"}</p> : null}
                    </div>
                    {row.imageUrl ? (
                      <img src={row.imageUrl} alt={row.name} className="h-14 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-10 items-center justify-center rounded-xl bg-[#f5f3ff] text-sm font-bold text-[#6d28d9]">
                        {row.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex max-w-[16rem] flex-wrap gap-1.5">
                      {[row.category, ...row.softCategories]
                        .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index)
                        .slice(0, 6)
                        .map((item, index) => (
                          <span
                            key={`${row.id}-${item}`}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              index === 0 ? "bg-[#eef2ff] text-[#4f46e5]" : "bg-[#f8fafc] text-[#64748b]"
                            )}
                          >
                            {item}
                          </span>
                        ))}
                      {!row.category && !row.softCategories.length ? <span className="text-muted">-</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {row.price != null ? formatCurrency(row.price) : "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="grid gap-1">
                      <p className="font-semibold text-ink">{row.clicks.toLocaleString("he-IL")} קליקים</p>
                      <p className="text-xs text-muted">{row.carts.toLocaleString("he-IL")} עגלות</p>
                    </div>
                  </td>
                  <td className="rounded-l-2xl px-4 py-2.5">
                    {editable ? (
                      <div className="grid gap-2">
                        <BoostControl value={row.currentBoost} productId={row.id} onChange={updateBoost} disabled={!editable} />
                        <p className="text-xs text-muted">
                          {row.currentBoost > 0
                            ? `במעקב: ${row.clicks.toLocaleString("he-IL")} קליקים ו-${row.carts.toLocaleString("he-IL")} עגלות`
                            : "אין בוסט פעיל"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-ink">
                        {row.currentBoost > 0 ? `בוסט ${row.currentBoost}` : "ללא בוסט"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
