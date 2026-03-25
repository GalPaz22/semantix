"use client";

import { useEffect, useMemo, useState } from "react";

import { CustomerProfileDrawer } from "@/components/dashboard/customer-profile-drawer";
import type { CustomerFeaturedLists, CustomerSearchProfile } from "@/lib/dashboard/types";
import { formatCompactCurrency, formatDate } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils/cn";

const MOBILE_LIMIT = 40;
const DESKTOP_LIMIT = 120;

function buildInitials(label: string) {
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function InitialsBubble({
  profile,
  size = "sm"
}: {
  profile: CustomerSearchProfile;
  size?: "sm" | "md" | "lg";
}) {
  const initials = buildInitials(profile.label);
  const dimensions =
    size === "lg"
      ? "h-16 w-16 text-base"
      : size === "md"
        ? "h-12 w-12 text-sm"
        : "h-10 w-10 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold tracking-[-0.03em]",
        dimensions,
        profile.activeNow ? "bg-[#eefbf3] text-emerald-700" : "bg-[#f4f0ff] text-[#5b34da]"
      )}
    >
      {initials}
    </span>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function buildConstellationLayout(profiles: CustomerSearchProfile[], isMobile: boolean) {
  const visible = profiles.slice(0, isMobile ? MOBILE_LIMIT : DESKTOP_LIMIT);
  const minSize = isMobile ? 34 : 42;
  const maxSize = isMobile ? 72 : 104;
  const nodes: Array<CustomerSearchProfile & { left: number; top: number; size: number }> = [];

  if (!visible.length) {
    return nodes;
  }

  const sized = visible.map((profile) => ({
    ...profile,
    size: Math.round(minSize + (maxSize - minSize) * Math.min(1, profile.sizeScore))
  }));

  nodes.push({
    ...sized[0]!,
    left: 50,
    top: 50
  });

  let cursor = 1;
  let ring = 1;

  while (cursor < sized.length) {
    const radius = isMobile ? 16 + (ring - 1) * 9 : 12 + (ring - 1) * 6.7;
    const circumference = 2 * Math.PI * radius;
    const capacity = Math.max(6, Math.floor(circumference / (isMobile ? 10 : 7)));
    const chunk = sized.slice(cursor, cursor + capacity);
    const baseOffset = ((chunk[0]?.positionSeed ?? ring) % 360) * (Math.PI / 180);

    chunk.forEach((profile, index) => {
      const angle = baseOffset + (index / chunk.length) * Math.PI * 2;
      const left = 50 + radius * Math.cos(angle);
      const top = 50 + radius * Math.sin(angle);
      nodes.push({
        ...profile,
        left,
        top
      });
    });

    cursor += chunk.length;
    ring += 1;
  }

  return nodes;
}

function ConstellationNode({
  profile,
  size,
  selected
}: {
  profile: CustomerSearchProfile;
  size: number;
  selected: boolean;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 rounded-full transition",
        profile.activeNow
          ? "border border-emerald-300 bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#f0fff5_40%,#e7f9ef_100%)]"
          : "border border-[#e6ddff] bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#f8f5ff_40%,#f0ebff_100%)]",
        selected ? "ring-4 ring-[#d8c8ff]" : ""
      )}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <InitialsBubble profile={profile} size={size >= 72 ? "lg" : size >= 56 ? "md" : "sm"} />
      </span>
      <span
        className={cn(
          "absolute rounded-full",
          profile.activeNow ? "bg-emerald-400/60" : "bg-[#8b5cf6]/10"
        )}
        style={{
          width: Math.max(8, Math.round(size * 0.18)),
          height: Math.max(8, Math.round(size * 0.18)),
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)"
        }}
      />
    </span>
  );
}

function FeaturedList({
  title,
  profiles,
  onSelect
}: {
  title: string;
  profiles: CustomerSearchProfile[];
  onSelect: (profileId: string) => void;
}) {
  if (!profiles.length) {
    return (
      <section className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">{title}</p>
        <p className="mt-3 text-sm text-muted">אין עדיין פרופילים בסגמנט הזה.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">{title}</p>
      <div className="mt-3 grid gap-2">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => onSelect(profile.id)}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[#faf7ff] px-3 py-3 text-right transition hover:bg-[#f5f0ff]"
          >
            <InitialsBubble profile={profile} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{profile.label}</p>
              <p className="truncate text-xs text-muted">
                {profile.topQuery ?? "אין שאילתה מובילה"} · {formatDate(profile.lastSeen)}
              </p>
            </div>
            <span className="text-sm font-semibold text-[#5d44ef]">
              {formatCompactCurrency(profile.totalSessionValue)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function CustomerConstellation({
  profiles,
  featuredLists
}: {
  profiles: CustomerSearchProfile[];
  featuredLists: CustomerFeaturedLists;
}) {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | undefined>(profiles[0]?.id);
  const [open, setOpen] = useState(false);
  const selectableProfiles = useMemo(() => {
    const merged = new Map<string, CustomerSearchProfile>();

    for (const profile of profiles) {
      merged.set(profile.id, profile);
    }

    for (const list of [featuredLists.topActiveNow, featuredLists.topValue, featuredLists.needsAttention]) {
      for (const profile of list) {
        if (!merged.has(profile.id)) {
          merged.set(profile.id, profile);
        }
      }
    }

    return [...merged.values()];
  }, [featuredLists.needsAttention, featuredLists.topActiveNow, featuredLists.topValue, profiles]);

  useEffect(() => {
    if (!selectableProfiles.length) {
      setSelectedId(undefined);
      setOpen(false);
      return;
    }

    setSelectedId((current) =>
      current && selectableProfiles.some((profile) => profile.id === current) ? current : selectableProfiles[0]?.id
    );
  }, [selectableProfiles]);

  const nodes = useMemo(() => buildConstellationLayout(profiles, isMobile), [profiles, isMobile]);
  const selectedProfile = useMemo(
    () => selectableProfiles.find((profile) => profile.id === selectedId),
    [selectableProfiles, selectedId]
  );

  const handleSelect = (profileId: string) => {
    setSelectedId(profileId);
    setOpen(true);
  };

  if (!profiles.length) {
    return (
      <section className="rounded-2xl border border-line bg-white p-6 shadow-panel">
        <p className="text-sm text-muted">אין עדיין פרופילי לקוחות זמינים עבור טווח הזמן שנבחר.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[28px] border border-line bg-white shadow-panel">
        <div className="border-b border-line px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">מפת לקוחות</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-[-0.04em] text-ink">מפת לקוחות חיה</h2>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f4f0ff] px-3 py-1.5 text-xs font-semibold text-[#5d44ef]">
                {nodes.length.toLocaleString("he-IL")} מוצגים
              </span>
              <span className="rounded-full bg-[#eefbf3] px-3 py-1.5 text-xs font-semibold text-emerald-700">
                ירוק = פעיל ב־5 הדקות האחרונות
              </span>
            </div>
          </div>
        </div>

        <div className="relative h-[520px] overflow-hidden bg-[radial-gradient(circle_at_center,#f7f2ff_0%,#ffffff_70%)] md:h-[700px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.08)_0,rgba(124,58,237,0)_58%)]" />
          <div className="absolute inset-6 rounded-[28px] border border-dashed border-[#eadfff]" />

          {nodes.map((profile) => {
            const selected = profile.id === selectedId;

            return (
              <button
                key={profile.id}
                type="button"
                title={`${profile.label} · ${formatCompactCurrency(profile.totalSessionValue)} · ${profile.totalClicks.toLocaleString("he-IL")} קליקים · ${formatDate(profile.lastSeen)}`}
                onClick={() => handleSelect(profile.id)}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_10px_24px_rgba(63,36,123,0.12)] transition duration-200 hover:scale-[1.03]"
                )}
                style={{
                  left: `${profile.left}%`,
                  top: `${profile.top}%`,
                  width: profile.size,
                  height: profile.size
                }}
              >
                <ConstellationNode profile={profile} size={profile.size} selected={selected} />
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <FeaturedList title="פעילים עכשיו" profiles={featuredLists.topActiveNow} onSelect={handleSelect} />
        <FeaturedList title="שווי גבוה" profiles={featuredLists.topValue} onSelect={handleSelect} />
        <FeaturedList title="דורשים תשומת לב" profiles={featuredLists.needsAttention} onSelect={handleSelect} />
      </div>

      <CustomerProfileDrawer profile={selectedProfile} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
