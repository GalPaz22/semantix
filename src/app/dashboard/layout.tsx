import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

function SemantixLogo() {
  return (
    <img
      src="/2uFiEizPD0kUkNTsRcYZifPswFj-cropped.svg"
      alt="Semantix"
      className="h-20 w-auto object-contain"
    />
  );
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen semantix-shell">
      <aside className="border-b border-line bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="px-5 py-3">
            <SemantixLogo />
          </div>
          <div className="flex-1 px-4 py-6">
            <DashboardNav />
          </div>
          <div className="border-t border-line px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">Workspace</p>
            <p className="mt-2 text-sm font-semibold text-ink">Mendelson</p>
            <p className="mt-1 text-sm text-muted">Search intelligence module</p>
          </div>
        </div>
      </aside>

      <DashboardHeader />

      <div className="lg:pl-72">
        <section className="mx-auto max-w-7xl px-4 pb-8 pt-20 sm:px-6 lg:pt-24">
          {children}
        </section>
      </div>
    </main>
  );
}
