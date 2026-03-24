import { CustomerConstellation } from "@/components/dashboard/customer-constellation";
import { CustomersAutoRefresh } from "@/components/dashboard/customers-auto-refresh";
import { CustomersSummaryStrip } from "@/components/dashboard/customers-summary-strip";
import { HealthBanner } from "@/components/dashboard/health-banner";
import { parseFilters } from "@/lib/analytics/filters";
import { getCustomersView } from "@/lib/dashboard/service";

type CustomersPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const filters = parseFilters(searchParams);
  const customers = await getCustomersView(filters);
  const shouldShowHealth =
    customers.warnings.length > 0 ||
    customers.errors.length > 0 ||
    customers.dataFreshness.status === "aging" ||
    customers.dataFreshness.status === "stale";

  return (
    <div className="grid gap-6">
      <CustomersAutoRefresh />

      {shouldShowHealth ? (
        <HealthBanner
          freshness={customers.dataFreshness}
          warnings={customers.warnings}
          errors={customers.errors}
        />
      ) : null}

      <CustomersSummaryStrip summary={customers.data.summary} />

      <CustomerConstellation
        profiles={customers.data.constellationProfiles}
        featuredLists={customers.data.featuredLists}
      />
    </div>
  );
}
