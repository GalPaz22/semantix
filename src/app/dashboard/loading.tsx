export default function DashboardLoading() {
  return (
    <div className="grid gap-6">
      <div className="h-28 animate-pulse rounded-[2rem] bg-white/60" />
      <div className="grid gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-[2rem] bg-white/60" />
        ))}
      </div>
    </div>
  );
}
