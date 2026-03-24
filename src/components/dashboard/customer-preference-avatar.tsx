import type { CustomerSearchProfile } from "@/lib/dashboard/types";

import { cn } from "@/lib/utils/cn";

function preferenceTone(topic: string) {
  const tones = [
    {
      chip: "bg-[#ede9fe] text-[#5b34da]",
      accent: "#8b5cf6"
    },
    {
      chip: "bg-[#e0f2fe] text-[#0369a1]",
      accent: "#0ea5e9"
    },
    {
      chip: "bg-[#dcfce7] text-[#15803d]",
      accent: "#22c55e"
    },
    {
      chip: "bg-[#fef3c7] text-[#b45309]",
      accent: "#f59e0b"
    }
  ] as const;

  let hash = 0;
  for (const char of topic) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return tones[hash % tones.length];
}

function buildInitials(label: string) {
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getPreferenceChipClass(topic: string) {
  return preferenceTone(topic).chip;
}

export function CustomerPreferenceAvatar({
  profile,
  size = "md",
  variant = "preference",
  showPreferenceLabels = false
}: {
  profile: CustomerSearchProfile;
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "preference";
  showPreferenceLabels?: boolean;
}) {
  const topicA = profile.preferredTopics[0];
  const topicB = profile.preferredTopics[1];
  const topicC = profile.preferredTopics[2];
  const initials = buildInitials(profile.label);

  const dimensions =
    size === "lg"
      ? "h-16 w-16"
      : size === "sm"
        ? "h-11 w-11"
        : "h-14 w-14";

  const textSize = size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";
  const ringTone = profile.activeNow ? "ring-2 ring-emerald-300" : "ring-1 ring-[#e6ddff]";
  const baseA = topicA ? preferenceTone(topicA).accent : "#8b5cf6";
  const baseB = topicB ? preferenceTone(topicB).accent : "#d946ef";
  const baseC = topicC ? preferenceTone(topicC).accent : "#60a5fa";
  const minimalTone = profile.activeNow
    ? "bg-[#eefbf3] text-emerald-700"
    : "bg-[#f4f0ff] text-[#5b34da]";

  return (
    <div className="flex flex-col items-center gap-1.5">
      {variant === "minimal" ? (
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-[22px] font-bold shadow-[0_10px_24px_rgba(63,36,123,0.08)]",
            dimensions,
            textSize,
            ringTone,
            minimalTone
          )}
        >
          <span className="tracking-[-0.03em]">{initials}</span>
        </div>
      ) : (
        <div
          className={cn(
            "relative inline-flex items-center justify-center overflow-hidden rounded-[22px] text-white shadow-[0_10px_24px_rgba(63,36,123,0.18)]",
            dimensions,
            textSize,
            ringTone
          )}
          style={{
            background: `radial-gradient(circle at 28% 28%, ${baseA} 0%, ${baseB} 48%, ${baseC} 100%)`
          }}
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.3)_0,rgba(255,255,255,0)_48%)]" />
          <span className="relative z-10 font-bold tracking-[-0.03em]">{initials}</span>
          {topicA ? (
            <span className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-2 border-white bg-white/80" />
          ) : null}
          {topicB ? (
            <span className="absolute -bottom-1 -left-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-white/70" />
          ) : null}
        </div>
      )}

      {showPreferenceLabels && profile.preferredTopics.length ? (
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
          {profile.preferredTopics.slice(0, size === "lg" ? 2 : 1).map((topic) => (
            <span
              key={`${profile.id}-${topic}`}
              dir="auto"
              className={cn(
                "max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                getPreferenceChipClass(topic)
              )}
            >
              {topic}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
