'use client'
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, MessageSquare, ListOrdered, Package, Menu, X, LogOut, ArrowRight, ChevronsUpDown, ChevronLeft, Search } from "lucide-react";
import ClientAnalyticsPanel from "../../components/client-demo/ClientAnalyticsPanel";
import ClientChatbotPanel from "../../components/client-demo/ClientChatbotPanel";
import SearchDemoPanel from '../../components/client-demo/SearchDemoPanel';
import ResultsPanel from "../../components/client-demo/ResultsPanel";
import ClientProductsPanel from "../../components/client-demo/ClientProductsPanel";
import { OptimizerProvider, useOptimizer } from "../../components/client-demo/OptimizerContext";

// Client dashboard backed by the authenticated, store-scoped optimizer API.
const ADMIN_EMAIL = "galpaz2210@gmail.com";
const PANELS = [
  { id: "analytics", label: "אנליטיקות", icon: BarChart3 },
  { id: "search-demo", label: "דמו חיפוש", icon: Search },
  { id: "results", label: "סידור תוצאות", icon: ListOrdered },
  { id: "products", label: "ניהול מוצרים", icon: Package },
  { id: "agent", label: "צ׳אטבוט", icon: MessageSquare },
];

export default function ClientDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (session?.user?.onboardingComplete === false) router.replace("/onboarding");
  }, [status, session, router]);
  if (status !== "authenticated" || session?.user?.onboardingComplete === false) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm" dir="rtl">טוען…</div>;
  }
  return <OptimizerProvider isAdmin={session.user.email?.toLowerCase() === ADMIN_EMAIL}><ClientDashboard /></OptimizerProvider>;
}

function ClientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [active, setActive] = useState("analytics");
  const [menuOpen, setMenuOpen] = useState(false);
  const [agentRequest, setAgentRequest] = useState(null);
  const [resultsRequest, setResultsRequest] = useState(null);
  const { dashboard, loading, error } = useOptimizer();
  const store = dashboard?.store;
  const storeName = store?.name || store?.dbName || "החנות שלך";
  const storeDomain = store?.site || store?.platform || "";
  const initials = storeName.replace(/^https?:\/\//, "").slice(0, 2).toUpperCase();
  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (session?.user?.onboardingComplete === false) {
      router.replace("/onboarding");
    }
  }, [status, session, router]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("panel");
    if (PANELS.some(x => x.id === p)) setActive(p);
    else if (p === 'suggestions' || p === 'plans') setActive('agent');
  }, []);

  if (status !== "authenticated" || session?.user?.onboardingComplete === false) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm" dir="rtl">טוען…</div>;
  }

  const select = (id, prompt, options) => {
    if (!PANELS.some(panel => panel.id === id)) return;
    setActive(id);
    setMenuOpen(false);
    if (prompt || options?.query) {
      const nextRequest = { text: prompt || '', query: options?.query || null, nonce: Date.now() };
      if (id === 'results') setResultsRequest(nextRequest);
      else if (id === 'agent') setAgentRequest(nextRequest);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('panel', id);
    window.history.replaceState(null, "", url.pathname + url.search);
    window.scrollTo({ top: 0 });
  };
  const current = PANELS.find(p => p.id === active);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased" dir="rtl">
      {menuOpen && <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-white border-l border-slate-200/80 flex flex-col transition-transform duration-200 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 h-16">
          <img src="/main-logo.svg" alt="Semantix" className="h-7 w-auto" />
          <button className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setMenuOpen(false)} aria-label="סגור תפריט">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <span className="h-9 w-9 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center tracking-wide">{initials}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-slate-900 truncate">{storeName}</div>
              <div className="text-xs text-slate-400 truncate" dir="ltr" style={{ textAlign: "right" }}>{storeDomain}</div>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>

        <nav className="flex-1 px-3 pt-6 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-slate-400">חיפוש חכם</div>
          <div className="space-y-0.5">
            {PANELS.map(p => {
              const on = active === p.id;
              return (
                <button key={p.id} onClick={() => select(p.id)}
                  className={`group flex items-center w-full gap-3 px-3 py-2 rounded-lg text-[14px] transition ${on ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                  <p.icon className={`h-[18px] w-[18px] ${on ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"}`} />
                  {p.label}
                </button>
              );
            })}
          </div>
          {isAdmin && (
            <Link href="/dashboard?panel=admin" className="mt-8 flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-indigo-600">
              <ArrowRight className="h-3.5 w-3.5" /> לדאשבורד הניהול
            </Link>
          )}
        </nav>

        <div className="p-3">
          <div className="rounded-xl bg-slate-50 px-3 py-3 mb-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
              <span className="relative flex h-2 w-2">
                {store?.active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${store?.active ? "bg-emerald-500" : "bg-slate-300"}`} />
              </span>
              {loading ? "טוען נתוני חנות…" : error ? "החיבור אינו זמין" : store ? (store.active ? "החנות מחוברת" : "החנות אינה פעילה") : "בחר חנות לצפייה"}
            </div>
            <div className="text-xs text-slate-400 mt-1">{dashboard?.report?.catalog ? `${dashboard.report.catalog.visible.toLocaleString("he-IL")} מוצרים גלויים בקטלוג` : ""}</div>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 pt-3 px-1">
            <img src={session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name || "U")}`}
              alt="" className="h-8 w-8 rounded-full ring-1 ring-slate-200" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-slate-800 truncate">{session.user.name}</p>
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="התנתק">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pr-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/70">
          <div className="h-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setMenuOpen(true)} className="lg:hidden p-2 -mr-2 rounded-lg text-slate-600 hover:bg-slate-100" aria-label="פתח תפריט">
                <Menu className="h-5 w-5" />
              </button>
              <span className="text-[13px] text-slate-400 hidden sm:inline">{storeName}</span>
              <ChevronLeft className="h-4 w-4 text-slate-300 hidden sm:inline" />
              <span className="text-[13px] font-semibold text-slate-900 truncate">{current.label}</span>
            </div>
            <div className="text-xs text-slate-400 whitespace-nowrap">{dashboard?.report?.generatedAt ? `עודכן ${new Date(dashboard.report.generatedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}` : loading ? "טוען…" : ""}</div>
          </div>
        </header>

        {/* Panels stay mounted so approvals and chat survive switching tabs. */}
        <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className={active === "analytics" ? "" : "hidden"}><ClientAnalyticsPanel onNavigate={select} /></div>
          <div className={active === "search-demo" ? "" : "hidden"}><SearchDemoPanel visible={active === "search-demo"} /></div>
          <div className={active === "results" ? "" : "hidden"}><ResultsPanel onNavigate={select} incoming={resultsRequest} /></div>
          <div className={active === "products" ? "" : "hidden"}><ClientProductsPanel visible={active === "products"} onNavigate={select} /></div>
          <div className={active === "agent" ? "" : "hidden"}><ClientChatbotPanel request={agentRequest} onNavigate={select} visible={active === "agent"} /></div>
        </main>
      </div>
    </div>
  );
}
