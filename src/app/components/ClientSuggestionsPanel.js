"use client";

import { useCallback, useEffect, useState } from "react";
import { isAdminEmail } from "/lib/admin";
import { AlertCircle, CheckCircle2, FlaskConical, Lightbulb, X } from "lucide-react";

const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" });
const DAY_MS = 24 * 60 * 60 * 1000;

const TEST_STATUS = {
  running: { label: "בבדיקה", cls: "bg-sky-100 text-sky-700" },
  paused: { label: "מושהה", cls: "bg-gray-100 text-gray-600" },
  completed: { label: "הסתיים", cls: "bg-gray-100 text-gray-700" },
  promoted: { label: "הופעל", cls: "bg-emerald-100 text-emerald-700" },
};

const DONE_TEXT = {
  apply: "השינוי הופעל בחיפוש",
  test: "בדיקת A/B התחילה. חצי מהגולשים יראו את השינוי",
  dismiss: "ההצעה בוטלה",
};

function SuggestionCard({ s, busy, onAction }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">{s.title}</h3>
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">{s.summary}</p>
          {(s.queries.length > 0 || s.productCount) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.queries.slice(0, 5).map((q) => (
                <span key={q} className="text-xs rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
                  {q}
                </span>
              ))}
              {s.productCount ? (
                <span className="text-xs rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{s.productCount} מוצרים</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {s.canApply && (
          <button
            disabled={busy}
            onClick={() => onAction(s, "apply")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 text-white text-sm px-4 py-2 hover:bg-gray-800 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> אישור
          </button>
        )}
        {s.canTest && (
          <button
            disabled={busy}
            onClick={() => onAction(s, "test")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 text-gray-800 text-sm px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <FlaskConical className="w-4 h-4" /> בדיקת A/B
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => onAction(s, "dismiss")}
          className="inline-flex items-center gap-1.5 rounded-xl text-gray-500 text-sm px-3 py-2 hover:bg-gray-100 disabled:opacity-50"
        >
          <X className="w-4 h-4" /> ביטול
        </button>
      </div>
    </div>
  );
}

function TestRow({ t }) {
  const st = TEST_STATUS[t.status] || TEST_STATUS.completed;
  const day = t.startedAt ? Math.max(1, Math.ceil((Date.now() - new Date(t.startedAt).getTime()) / DAY_MS)) : null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
        <div className="text-xs text-gray-500">
          {t.appliedAt
            ? `הופעל ב־${dateFmt.format(new Date(t.appliedAt))}${t.startedAt ? " אחרי בדיקה" : ""}`
            : t.startedAt
              ? `התחיל ב־${dateFmt.format(new Date(t.startedAt))}`
              : "טרם התחיל"}
          {t.status === "running" && day ? ` · יום ${day} מתוך 7` : ""}
          {t.sessions ? ` · ${t.sessions.toLocaleString("he-IL")} גולשים` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {t.winProbability != null && t.status === "running" && (
          <span className="text-xs text-gray-600">
            סיכוי שהשינוי עדיף{t.winMetric === "clicks" ? " (לפי קליקים)" : ""}:{" "}
            <span className="font-semibold tabular-nums">{Math.round(t.winProbability * 100)}%</span>
          </span>
        )}
        <span className={`text-xs rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
      </div>
    </li>
  );
}

export default function ClientSuggestionsPanel({ session, onboarding }) {
  const isAdmin = isAdminEmail(session?.user?.email);
  const dbName = onboarding?.credentials?.dbName || onboarding?.dbName || "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = isAdmin && dbName ? `?dbName=${encodeURIComponent(dbName)}` : "";
      const res = await fetch(`/api/client/suggestions${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "טעינת ההצעות נכשלה");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, dbName]);

  useEffect(() => {
    load();
  }, [load]);

  const onAction = async (s, action) => {
    if (action === "apply" && !window.confirm("השינוי יופעל מיד לכל הגולשים. להמשיך?")) return;
    setBusyId(s.id);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/client/suggestions/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(isAdmin && dbName ? { dbName } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "הפעולה נכשלה");
      setNotice(DONE_TEXT[action]);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const suggestions = data?.suggestions || [];
  const tests = data?.tests || [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">הצעות לשיפור</h2>
        <p className="text-sm text-gray-500">
          שינויים שהמערכת מציעה כדי שיותר חיפושים יסתיימו ברכישה. אפשר להפעיל, לבדוק קודם על חצי מהגולשים, או לבטל.
        </p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : data && !data.available ? (
        <p className="text-sm text-gray-500">ההצעות עדיין לא זמינות לחנות הזו.</p>
      ) : (
        <>
          {suggestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-sm text-gray-500">
              אין כרגע הצעות חדשות. המערכת בודקת את החיפושים באופן קבוע ותציג כאן הצעות כשתמצא הזדמנות.
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((s) => (
                <SuggestionCard key={s.id} s={s} busy={busyId !== null} onAction={onAction} />
              ))}
            </div>
          )}

          {tests.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-base font-semibold text-gray-900">בדיקות ושינויים אחרונים</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {tests.map((t) => (
                  <TestRow key={t.id} t={t} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
