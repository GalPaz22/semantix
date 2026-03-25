import { notFound } from "next/navigation";

import { JourneyTimeline } from "@/components/dashboard/journey-timeline";
import { Panel } from "@/components/dashboard/panel";
import { parseFilters } from "@/lib/analytics/filters";
import { getCustomerProfileView } from "@/lib/dashboard/service";
import { formatCompactCurrency, formatCompactNumber, formatDate } from "@/lib/dashboard/format";

type CustomerProfilePageProps = {
  params: {
    profileId: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function CustomerProfilePage({
  params,
  searchParams
}: CustomerProfilePageProps) {
  const filters = parseFilters(searchParams);
  const detail = await getCustomerProfileView(filters, params.profileId);

  if (!detail) {
    notFound();
  }

  const profile = detail.data.profile;

  return (
    <div className="grid gap-6">
      <Panel
        eyebrow="כרטיס לקוח"
        title={profile.label}
        description={`פירוט סשן של סמנטיקס עבור ${profile.identifierType}: ${profile.identifier}`}
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-panel bg-[#faf7ff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b63c8]">שווי סשן כולל</p>
            <p className="mt-2 text-3xl font-extrabold text-ink">{formatCompactCurrency(profile.totalSessionValue)}</p>
          </div>
          <div className="rounded-panel bg-[#faf7ff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b63c8]">סך כל הקליקים</p>
            <p className="mt-2 text-3xl font-extrabold text-ink">{profile.totalClicks}</p>
          </div>
          <div className="rounded-panel bg-[#faf7ff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b63c8]">סך כל החיפושים</p>
            <p className="mt-2 text-3xl font-extrabold text-ink">{profile.totalSearches}</p>
          </div>
          <div className="rounded-panel bg-[#faf7ff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b63c8]">הוספות לעגלה</p>
            <p className="mt-2 text-3xl font-extrabold text-ink">{profile.totalAddToCarts}</p>
            <p className="mt-2 text-sm text-muted">שווי ממוצע {formatCompactCurrency(profile.averageCartValue)}</p>
          </div>
          <div className="rounded-panel bg-[#faf7ff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b63c8]">נראה לאחרונה</p>
            <p className="mt-2 text-lg font-extrabold text-ink">{formatDate(profile.lastSeen)}</p>
          </div>
        </div>
      </Panel>

      <Panel
        eyebrow="ציר זמן"
        title="מסע הלקוח"
        description='דוגמה: חיפוש "יין אדום מתוק" ← קליק על מוצר ← הוספה לעגלה ← רכישה'
      >
        <JourneyTimeline journey={profile.journey} />
      </Panel>
    </div>
  );
}
