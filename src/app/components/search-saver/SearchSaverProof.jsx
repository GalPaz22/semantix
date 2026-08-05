import { DASHBOARD_METRICS, METRICS_ATTRIBUTION } from '../../lib/marketing-copy';

const HOME_METRICS = [
  {
    value: '40,195',
    label: 'חיפושים שהוחזרו',
    note: 'חיפושים שהוחזרו במקום.',
  },
  {
    value: '₪40K',
    label: 'הכנסות שהוחזרו',
    note: 'הכנסות שיוחסו לביקורים בלי תוצאות שהוחזרו.',
  },
  {
    value: 'דקות',
    label: 'זמן לעלייה',
    note: 'עולים לאוויר מהר, בלי עיצוב מחדש.',
  },
];

const REVENUE_BARS = [32, 44, 38, 56, 48, 66, 60];

const RECOVERED_QUERIES = [
  { query: 'יין אדום לסטייק עד 150 ש״ח', issue: 'בלי תוצאות', revenue: '₪8,420', products: '4 יינות' },
  { query: 'wineter jacket', issue: 'בלי תוצאות', revenue: '₪6,180', products: 'מעילי חורף' },
  { query: 'chianti clasico riserva', issue: 'בלי תוצאות', revenue: '₪10,940', products: 'יינות Chianti Riserva' },
  { query: 'קרם ליובש ורגישות', issue: 'בלי תוצאות', revenue: '₪7,360', products: 'מוצרי טיפוח' },
];

function DashboardCard() {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-[#fbfbfc] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)] sm:rounded-[32px] sm:p-8">
      <p className="mb-4 text-xs text-gray-500">{METRICS_ATTRIBUTION}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {DASHBOARD_METRICS.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-700">{metric.label}</p>
            <p className="mt-2 text-xs leading-5 text-gray-600">{metric.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-700">הכנסות שהוחזרו</p>
            <p className="mt-1 text-sm text-gray-500">חיפושים והכנסות שהוחזרו ב־7 הימים האחרונים.</p>
          </div>
          <span className="w-fit shrink-0 rounded-full border border-gray-200 bg-[#f8f8f9] px-3 py-1 text-[11px] font-medium text-gray-500">
            7 ימים אחרונים
          </span>
        </div>

        <div className="mt-6 grid grid-cols-7 items-end gap-1.5 sm:gap-3">
          {REVENUE_BARS.map((height, index) => (
            <div key={`bar-${index}`} className="space-y-2 text-center">
              <div className="flex h-28 items-end justify-center rounded-xl bg-[#f6f6f8] px-1 pb-2 sm:h-36 sm:px-2">
                <div
                  className="w-full rounded-lg bg-[linear-gradient(180deg,#a855f7_0%,#c084fc_100%)]"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-400">י{index + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-700">חיפושים מובילים בלי תוצאות</p>
            <p className="mt-1 text-sm text-gray-500">
              מה חיפשו כשקיבלו ריק — ומה הוחזר.
            </p>
          </div>
        </div>

        <div className="mt-5 -mx-1 overflow-x-auto px-1">
          <table className="min-w-[640px] w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-[0.16em] text-gray-400">
                <th className="pb-3 pr-4 font-semibold">חיפוש</th>
                <th className="pb-3 pr-4 font-semibold">בעיה</th>
                <th className="pb-3 pr-4 font-semibold">הכנסות שהוחזרו</th>
                <th className="pb-3 font-semibold">מוצרים שהוחזרו</th>
              </tr>
            </thead>
            <tbody>
              {RECOVERED_QUERIES.map((row) => (
                <tr key={row.query} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-3 pr-4 text-sm font-medium text-gray-900">{row.query}</td>
                  <td className="py-3 pr-4 text-sm text-gray-600">{row.issue}</td>
                  <td className="py-3 pr-4 text-sm font-semibold text-gray-900">{row.revenue}</td>
                  <td className="py-3 text-sm text-gray-600">{row.products}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SearchSaverProof({ variant = 'landing' }) {
  if (variant === 'home') {
    return (
      <section dir="rtl" id="business-impact" className="border-t border-gray-100 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
              השפעה על ההכנסות
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
              חיפוש שהוחזר = הכנסה שאפשר למדוד.
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-600">
              Search Saver מחזיר חיפושים בלי תוצאות — ואז מראה בדיוק
              כמה כסף חזר לחנות.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {HOME_METRICS.map((metric, index) => (
              <div key={metric.label} className="rounded-3xl border border-gray-200 bg-[#fbfbfc] p-6">
                <p className="text-3xl font-semibold text-gray-900">{metric.value}</p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-purple-700">
                  {metric.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">{metric.note}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="metric-fill h-full rounded-full bg-[linear-gradient(90deg,#a855f7_0%,#c084fc_100%)]"
                    style={{
                      width:
                        metric.label === 'חיפושים שהוחזרו'
                          ? '78%'
                          : metric.label === 'הכנסות שהוחזרו'
                            ? '64%'
                            : '42%',
                      animationDelay: `${index * 0.35}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" className="bg-[#fafafb] py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 sm:px-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">
            דשבורד הכנסות שהוחזרו
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            רואים אילו חיפושים הוחזרו וכמה הכנסות חזרו.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            Search Saver לא מדרג מחדש ולא מזריק. הוא מראה אילו חיפושים בלי תוצאות
            הוחזרו ואיזה הכנסות הם יצרו.
          </p>
          <div className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
            <p>חיפושים שהוחזרו, שיעור החזרה והכנסות שהוחזרו — לפי חיפוש.</p>
            <p>חיפושים מובילים בלי תוצאות ומוצרים שהוחזרו — במבט אחד.</p>
          </div>
        </div>

        <DashboardCard />
      </div>
    </section>
  );
}
