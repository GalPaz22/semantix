import type { CollectionHealth } from "@/lib/dashboard/types";

import { formatDate } from "@/lib/dashboard/format";

export function SourceHealthGrid({ collections }: { collections: CollectionHealth[] }) {
  if (!collections.length) {
    return <p className="text-sm text-muted">עדיין אין נתוני דיאגנוסטיקה לקולקציות.</p>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {collections.map((collection) => (
        <article key={collection.collection} className="rounded-panel border border-line/70 bg-[#fcfbff] p-5 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7b63c8]">קולקציה</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] text-ink">
                {collection.collection}
              </h3>
            </div>
            <p className="text-sm text-muted">{collection.estimatedCount.toLocaleString("he-IL")} רשומות</p>
          </div>
          <dl className="mt-5 grid gap-3 text-sm text-ink sm:grid-cols-2">
            <div>
              <dt className="text-muted">שדה זמן</dt>
              <dd>{collection.timestampField ?? "לא זוהה"}</dd>
            </div>
            <div>
              <dt className="text-muted">שדה סטטוס</dt>
              <dd>{collection.statusField ?? "לא זוהה"}</dd>
            </div>
            <div>
              <dt className="text-muted">פעילות אחרונה</dt>
              <dd>{formatDate(collection.latestTimestamp)}</dd>
            </div>
            <div>
              <dt className="text-muted">שיעור Null</dt>
              <dd>{(collection.nullRate * 100).toFixed(1)}%</dd>
            </div>
          </dl>
          <div className="mt-5 grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">ממדים</p>
            <p className="text-sm text-ink">
              {collection.dimensionFields.length ? collection.dimensionFields.join(", ") : "לא זוהו ממדים מוכרים"}
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">שדות לדוגמה</p>
            <p className="text-sm text-muted">{collection.sampleFields.join(", ") || "לא זוהו"}</p>
          </div>
          {collection.warning ? <p className="mt-4 text-sm text-danger">{collection.warning}</p> : null}
        </article>
      ))}
    </div>
  );
}
