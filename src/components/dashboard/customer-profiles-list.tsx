import Link from "next/link";

import type { CustomerSearchProfile } from "@/lib/dashboard/types";
import { formatCompactCurrency, formatDate } from "@/lib/dashboard/format";

const iconTone = {
  user: "bg-violet-100 text-violet-700",
  session: "bg-blue-100 text-blue-700",
  ip: "bg-emerald-100 text-emerald-700"
} as const;

function ProfileIcon({ profile }: { profile: CustomerSearchProfile }) {
  const initials = profile.label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ${iconTone[profile.identifierType]}`}
    >
      {initials}
    </span>
  );
}

function ProfileCard({ profile, featured = false }: { profile: CustomerSearchProfile; featured?: boolean }) {
  return (
    <Link
      href={`/dashboard/customers/${encodeURIComponent(profile.id)}`}
      className={`group rounded-2xl border border-line bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-[#d9cffd] ${featured ? "border-[#d9cffd] bg-[linear-gradient(180deg,#ffffff_0%,#fcfaff_100%)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <ProfileIcon profile={profile} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b63c8]">
              {profile.identifierType}
            </p>
            <h3 className="mt-2 truncate font-display text-[1.75rem] font-bold tracking-[-0.04em] text-ink">
              {profile.label}
            </h3>
            <p
              className="mt-1 truncate font-mono text-xs text-muted"
              title={profile.identifier}
            >
              {profile.identifier}
            </p>
          </div>
        </div>
        {featured ? (
          <span className="shrink-0 rounded-full bg-[#f4f0ff] px-3 py-1 text-xs font-bold text-[#5d44ef]">
            פרופיל מוביל
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#faf7ff] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f769f]">שווי כולל</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatCompactCurrency(profile.totalSessionValue)}</p>
        </div>
        <div className="rounded-2xl bg-[#faf7ff] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f769f]">שווי ממוצע</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatCompactCurrency(profile.averageCartValue)}</p>
        </div>
        <div className="rounded-2xl bg-[#faf7ff] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f769f]">קליקים</p>
          <p className="mt-2 text-xl font-bold text-ink">{profile.totalClicks}</p>
        </div>
        <div className="rounded-2xl bg-[#faf7ff] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f769f]">עגלות / חיפושים</p>
          <p className="mt-2 text-xl font-bold text-ink">
            {profile.totalAddToCarts} / {profile.totalSearches}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 border-t border-line pt-4 text-sm text-muted">
        <p className="truncate">
          שאילתה מובילה: <span className="font-semibold text-ink">{profile.topQuery ?? "-"}</span>
        </p>
        <p>
          נראה לאחרונה: <span className="font-semibold text-ink">{formatDate(profile.lastSeen)}</span>
        </p>
      </div>
    </Link>
  );
}

export function CustomerProfilesList({ profiles }: { profiles: CustomerSearchProfile[] }) {
  if (!profiles.length) {
    return <p className="text-sm text-muted">עדיין אין פרופילי לקוחות זמינים.</p>;
  }

  const featured = profiles.slice(0, 3);
  const remaining = profiles.slice(3);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 xl:grid-cols-3">
        {featured.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} featured />
        ))}
      </section>

      {remaining.length ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {remaining.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
