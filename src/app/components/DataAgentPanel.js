"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, RefreshCw, AlertCircle, TrendingUp, Bot } from "lucide-react";

const SEVERITY_STYLES = {
  high: { ring: "border-rose-200", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  medium: { ring: "border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  low: { ring: "border-sky-200", badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  positive: { ring: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

const SEVERITY_LABEL = {
  high: "דחוף",
  medium: "בינוני",
  low: "מידע",
  positive: "חיובי",
};

const SUGGESTIONS = [
  "מהם החיפושים ללא תוצאות הכי נפוצים?",
  "איך נראה משפך ההמרה שלי?",
  "אילו מוצרים הכי נלחצים?",
  "יש מגמות חריגות בשבוע האחרון?",
];

export default function DataAgentPanel({ session, onboarding }) {
  const resolvedDb = onboarding?.credentials?.dbName || onboarding?.dbName || "manoVino";
  const [dbName, setDbName] = useState(resolvedDb);

  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  async function loadInsights(force = false) {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch("/api/agent/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName, days: 30, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בטעינת תובנות");
      setInsights(data.insights || []);
      setGeneratedAt(data.generatedAt || null);
      if ((data.insights || []).length === 0 && data.raw) {
        setInsightsError("הסוכן לא החזיר תובנות מובנות. נסה לרענן.");
      }
    } catch (e) {
      setInsightsError(e.message);
    } finally {
      setInsightsLoading(false);
    }
  }

  function formatGeneratedAt(iso) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString("he-IL", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }

  async function sendMessage(text) {
    const content = (text ?? input).trim();
    if (!content || chatLoading) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName, messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        let msg = "שגיאה";
        try {
          msg = (await res.json()).error || msg;
        } catch {}
        throw new Error(msg);
      }

      // Stream the assistant reply token-by-token.
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // First chunk arrived -> hide the typing indicator.
      setChatLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }

      if (!acc.trim()) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: "(אין תשובה)" };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `שגיאה: ${e.message}`, error: true }]);
      setChatLoading(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-lg">
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 p-3">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">סוכן הנתונים</h2>
              <p className="text-white/80 text-sm">תובנות אוטומטיות ושיחה חיה עם הנתונים שלך</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              className="rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-2 text-sm placeholder-white/60 text-white w-36"
              placeholder="dbName"
            />
            <button
              onClick={() => loadInsights(true)}
              disabled={insightsLoading}
              className="flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/25 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${insightsLoading ? "animate-spin" : ""}`} />
              רענן תובנות
            </button>
          </div>
        </div>
      </div>

      {/* Insight cards */}
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">תובנות מרכזיות</h3>
          {generatedAt && (
            <span className="text-xs text-gray-400">
              · עודכן לאחרונה {formatGeneratedAt(generatedAt)} · מתרענן אוטומטית כל שבוע
            </span>
          )}
        </div>

        {insightsLoading && insights.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
                <div className="h-3 w-full bg-gray-100 rounded mb-2" />
                <div className="h-3 w-5/6 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : insightsError && insights.length === 0 ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 text-rose-700">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="text-sm">{insightsError}</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((ins, i) => {
              const sv = SEVERITY_STYLES[ins.severity] || SEVERITY_STYLES.low;
              return (
                <div key={i} className={`bg-white rounded-2xl border ${sv.ring} shadow-sm p-5 flex flex-col`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sv.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sv.dot}`} />
                      {SEVERITY_LABEL[ins.severity] || "מידע"}
                    </span>
                    {ins.metric && <span className="text-lg font-bold text-gray-800">{ins.metric}</span>}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1.5">{ins.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{ins.body}</p>
                  {ins.action && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-indigo-700 font-medium">
                      ← {ins.action}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Bot className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">שיחה עם הנתונים</h3>
        </div>

        <div ref={scrollRef} className="h-80 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/50">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm pt-8">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-indigo-300" />
              שאל אותי כל דבר על נתוני החנות שלך
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : m.error
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-white text-gray-800 border border-gray-200"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-end">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="px-5 py-3 flex flex-wrap gap-2 border-t border-gray-100">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition rounded-full px-3 py-1.5"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="כתוב שאלה..."
            disabled={chatLoading}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={chatLoading || !input.trim()}
            className="flex items-center justify-center rounded-xl bg-indigo-600 text-white h-10 w-10 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
