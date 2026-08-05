import { DASHBOARD_METRICS, METRICS_ATTRIBUTION } from '../../lib/marketing-copy';

export default function SearchSaverMetricStrip() {
  return (
    <div className="mt-10 border-t border-gray-200 pt-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {DASHBOARD_METRICS.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-center sm:text-left"
          >
            <p className="text-2xl font-semibold text-gray-900 sm:text-3xl">{metric.value}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-700">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-gray-500 sm:text-left">{METRICS_ATTRIBUTION}</p>
    </div>
  );
}
