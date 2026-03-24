"use client";

import Link from "next/link";

import { JourneyTimeline } from "@/components/dashboard/journey-timeline";
import type { CustomerSearchProfile } from "@/lib/dashboard/types";
import { formatCompactCurrency, formatDate } from "@/lib/dashboard/format";

function preferenceTone(topic: string) {
  const tones = [
    "bg-[#ede9fe] text-[#5b34da]",
    "bg-[#e0f2fe] text-[#0369a1]",
    "bg-[#dcfce7] text-[#15803d]",
    "bg-[#fef3c7] text-[#b45309]"
  ] as const;

  let hash = 0;
  for (const char of topic) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return tones[hash % tones.length];
}

function DrawerMetric({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#faf7ff] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f769f]">{label}</p>
      <p className="mt-1.5 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function ProfileInitials({ profile }: { profile: CustomerSearchProfile }) {
  const initials = profile.label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold ${
        profile.activeNow ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"
      }`}
    >
      {initials}
    </span>
  );
}

export function CustomerProfileDrawer({
  profile,
  open,
  onClose
}: {
  profile?: CustomerSearchProfile;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#1f123f]/25 backdrop-blur-[1px] transition ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-x-3 bottom-3 z-50 max-h-[82vh] overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_30px_80px_rgba(24,14,53,0.22)] transition md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[420px] ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100 md:translate-x-0"
            : "pointer-events-none translate-y-6 opacity-0 md:translate-x-8"
        }`}
        aria-hidden={!open}
      >
        {profile ? (
          <div className="flex h-full flex-col">
            <header className="border-b border-line px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <ProfileInitials profile={profile} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">
                      {profile.activeNow ? "Active now" : "Customer profile"}
                    </p>
                    <h3 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-ink">{profile.label}</h3>
                    <p className="mt-1 truncate font-mono text-xs text-muted" title={profile.identifier}>
                      {profile.identifier}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-[#faf7ff] hover:text-ink"
                >
                  Close
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <DrawerMetric label="Session value" value={formatCompactCurrency(profile.totalSessionValue)} />
                <DrawerMetric label="Avg cart value" value={formatCompactCurrency(profile.averageCartValue)} />
                <DrawerMetric label="Clicks" value={profile.totalClicks.toLocaleString("en-US")} />
                <DrawerMetric label="Searches" value={profile.totalSearches.toLocaleString("en-US")} />
                <DrawerMetric label="Add to cart" value={profile.totalAddToCarts.toLocaleString("en-US")} />
                <DrawerMetric label="Last seen" value={formatDate(profile.lastSeen)} />
              </div>

              <div className="rounded-2xl border border-line bg-[#fcfbff] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f769f]">Top query</p>
                <p className="mt-2 text-base font-semibold text-ink">{profile.topQuery ?? "-"}</p>
              </div>

              {profile.preferredTopics.length ? (
                <div className="rounded-2xl border border-line bg-[#fcfbff] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f769f]">
                    Preference signals
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.preferredTopics.map((topic) => (
                      <span
                        key={`${profile.id}-${topic}`}
                        dir="auto"
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${preferenceTone(topic)}`}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <section>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">
                      Journey
                    </p>
                    <h4 className="mt-1 text-lg font-bold tracking-[-0.03em] text-ink">Customer timeline</h4>
                  </div>
                  <Link
                    href={`/dashboard/customers/${encodeURIComponent(profile.id)}`}
                    className="inline-flex items-center rounded-xl bg-[#7c3aed] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
                  >
                    Open full profile
                  </Link>
                </div>
                <JourneyTimeline journey={profile.journey} />
              </section>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
