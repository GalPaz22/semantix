import type { CollectionHealth } from "@/lib/dashboard/types";

import { formatDate } from "@/lib/dashboard/format";

export function SourceHealthGrid({ collections }: { collections: CollectionHealth[] }) {
  if (!collections.length) {
    return <p className="text-sm text-muted">No collection diagnostics available yet.</p>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {collections.map((collection) => (
        <article key={collection.collection} className="rounded-panel border border-line/70 bg-[#fcfbff] p-5 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7b63c8]">Collection</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] text-ink">
                {collection.collection}
              </h3>
            </div>
            <p className="text-sm text-muted">{collection.estimatedCount.toLocaleString()} records</p>
          </div>
          <dl className="mt-5 grid gap-3 text-sm text-ink sm:grid-cols-2">
            <div>
              <dt className="text-muted">Timestamp field</dt>
              <dd>{collection.timestampField ?? "Not detected"}</dd>
            </div>
            <div>
              <dt className="text-muted">Status field</dt>
              <dd>{collection.statusField ?? "Not detected"}</dd>
            </div>
            <div>
              <dt className="text-muted">Last activity</dt>
              <dd>{formatDate(collection.latestTimestamp)}</dd>
            </div>
            <div>
              <dt className="text-muted">Null rate</dt>
              <dd>{(collection.nullRate * 100).toFixed(1)}%</dd>
            </div>
          </dl>
          <div className="mt-5 grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Dimensions</p>
            <p className="text-sm text-ink">
              {collection.dimensionFields.length ? collection.dimensionFields.join(", ") : "No known dimensions detected"}
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Sample fields</p>
            <p className="text-sm text-muted">{collection.sampleFields.join(", ") || "None detected"}</p>
          </div>
          {collection.warning ? <p className="mt-4 text-sm text-danger">{collection.warning}</p> : null}
        </article>
      ))}
    </div>
  );
}
