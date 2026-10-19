'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, Square, Loader2, Plus, Check, X } from 'lucide-react';
import { Card } from './ui';
import { useOptimizer, actionStatus, buttonClass } from './OptimizerContext';

const STEP_LABELS = { customer_analytics: 'בודק נתוני חיפושים', store_funnel: 'בודק את ממוצעי החנות', query_evidence: 'בודק את החיפוש', search_catalog: 'מחפש בקטלוג', get_product_source: 'קורא פרטי מוצר', promote_products: 'מכין קידום מוצרים', hide_products: 'מכין הסתרת מוצרים', propose_rule: 'מכין כלל חיפוש', propose_experiment: 'מכין בדיקת A/B', search_audit: 'מחפש חיפושים בעייתיים', weekly_query_review: 'בודק את שאילתות השבוע', production_baseline: 'בודק מה עובד היום', get_catalog_filter_coverage: 'בודק תגיות בקטלוג', get_current_config: 'בודק הגדרות דירוג', create_optimization_action: 'מכין תיקון קטלוג', list_optimization_actions: 'בודק פעולות פתוחות', list_experiments: 'בודק בדיקות A/B', read_experiment_results: 'קורא תוצאות בדיקה' };
const isActive = r => ['queued', 'running'].includes(r?.status);

export default function SearchAgentPanel({ request: incoming, visible }) {
  const { request, streamUrl, mutate, ready, dashboard, days } = useOptimizer();
  const topQuery = dashboard?.report?.queries?.top?.[0]?.query;
  const opportunity = dashboard?.report?.queries?.opportunity?.find(row => row.searchSessions >= 10)?.query;
  const starters = [
    topQuery ? `מה עובד טוב בחיפוש ״${topQuery}״ ב־${days} הימים האחרונים?` : 'מה חיפשו הכי הרבה השבוע?',
    opportunity ? `מה אפשר לשפר בחיפוש ״${opportunity}״ לפי הנתונים של ${days} הימים האחרונים?` : 'איפה יש בעיה במדידה של החנות?',
    'אילו מוצרים כדאי לקדם ולמה?', 'עזור לי לנעוץ מוצרים בחיפוש מסוים',
  ];
  const [runs, setRuns] = useState(null), [conversation, setConversation] = useState(null), [live, setLive] = useState(null), [stream, setStream] = useState(null);
  const [text, setText] = useState(''), [focus, setFocus] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [loadError, setLoadError] = useState(''), [loading, setLoading] = useState(false), [stopping, setStopping] = useState(false);
  const launched = useRef(null), bottom = useRef(null), chose = useRef(false), sending = useRef(false), mounted = useRef(false), loadSequence = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; loadSequence.current++; }; }, []);

  const loadRuns = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const next = await request('agent/runs');
      if (mounted.current && sequence === loadSequence.current) { setRuns(next); setLoadError(''); }
    } catch (e) { if (mounted.current && sequence === loadSequence.current) setLoadError(e.message); }
    finally { if (mounted.current && sequence === loadSequence.current) setLoading(false); }
  }, [request]);
  useEffect(() => { setRuns(null); setConversation(null); setLive(null); chose.current = false; if (ready) loadRuns(); }, [ready, loadRuns]);
  useEffect(() => {
    if (!ready || !visible) return;
    let live = true, timer;
    const poll = async () => { await loadRuns(); if (live) timer = setTimeout(poll, 5000); };
    timer = setTimeout(poll, 5000);
    return () => { live = false; clearTimeout(timer); };
  }, [ready, visible, loadRuns]);

  const conversations = useMemo(() => {
    const map = new Map();
    for (const r of [...(runs || [])].reverse()) {
      const key = r.conversationId || r._id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()].map(([id, list]) => ({ id, runs: list, last: list[list.length - 1] })).sort((a, b) => new Date(b.last.startedAt) - new Date(a.last.startedAt));
  }, [runs]);
  useEffect(() => { if (!chose.current && conversations.length && conversation === null) setConversation(conversations[0].id); }, [conversations, conversation]);

  const thread = conversations.find(c => c.id === conversation)?.runs || [];
  const activeRun = (runs || []).find(isActive);

  useEffect(() => {
    if (!activeRun || !visible) { setLive(null); return; }
    let on = true, timer;
    const tick = async () => {
      try {
        const run = await request(`agent/runs/${activeRun._id}`);
        if (!on) return;
        setLive(run);
        if (isActive(run)) timer = setTimeout(tick, 3000); else loadRuns();
      } catch { if (on) timer = setTimeout(tick, 3000); }
    };
    tick();
    return () => { on = false; clearTimeout(timer); };
  }, [activeRun?._id, visible, request, loadRuns]);

  useEffect(() => {
    setStream(null);
    if (!activeRun || !visible || typeof EventSource === 'undefined') return;
    const source = new EventSource(streamUrl(`agent/runs/${activeRun._id}/stream`));
    source.onmessage = message => {
      let e;
      try { e = JSON.parse(message.data); } catch { return; }
      if (e.type === 'snapshot') setStream({ text: e.text, step: e.step });
      else if (e.type === 'text') setStream(s => ({ step: s?.step ?? null, text: (s?.text || '') + e.delta }));
      else if (e.type === 'reset') setStream(s => ({ step: s?.step ?? null, text: '' }));
      else if (e.type === 'step') setStream({ text: '', step: e.name });
      else if (e.type === 'done') { source.close(); loadRuns(); }
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [activeRun?._id, visible, streamUrl, loadRuns]);

  useEffect(() => {
    if (!incoming || launched.current === incoming.nonce) return;
    launched.current = incoming.nonce;
    chose.current = true; setConversation(''); setFocus(incoming.query || null); setText(incoming.text || '');
  }, [incoming]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [thread.length, live?.steps?.length, live?.status, stream?.text?.length, conversation]);

  const send = async body => {
    if (sending.current || activeRun) return;
    sending.current = true;
    setBusy(true); setError('');
    try {
      const result = await mutate('agent/run', { ...body, days, ...(conversation ? { conversationId: conversation } : {}) });
      if (!mounted.current) return;
      chose.current = true; setConversation(result.conversationId || result.runId);
      setText(''); setFocus(null);
      setRuns(prev => [{ _id: result.runId, conversationId: result.conversationId || result.runId, status: result.status, request: body.request || (body.query ? `בדיקת החיפוש ״${body.query}״` : 'סקירה מלאה של החנות'), startedAt: new Date().toISOString() }, ...(prev || []).filter(r => r._id !== result.runId)]);
      await loadRuns();
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { sending.current = false; if (mounted.current) setBusy(false); }
  };
  const submit = e => {
    e?.preventDefault();
    if (busy || activeRun || (!text.trim() && !focus)) return;
    send(focus ? { query: focus, ...(text.trim() ? { request: text.trim() } : {}) } : { request: text.trim() });
  };
  const fullReview = () => { if (window.confirm('סקירה מלאה עוברת על כל נתוני החנות ולוקחת כמה דקות. להתחיל?')) send({ review: true }); };
  const stop = async () => { if (!activeRun || stopping) return; setStopping(true); setError(''); try { await mutate(`agent/runs/${activeRun._id}/stop`); await loadRuns(); } catch (e) { setError(e.message); } finally { setStopping(false); } };
  const review = async (item, approve) => {
    try {
      if (item.artifactType === 'action') await mutate(`optimization/actions/${item._id}/${approve ? 'execute' : 'dismiss'}`);
      else await mutate(`proposals/${item._id}/${approve ? 'approve' : 'reject'}`, approve ? { start: true } : {});
      await loadRuns();
    } catch (e) { setError(e.message); }
  };
  const newChat = () => { chose.current = true; setConversation(''); setFocus(null); setText(''); };

  if (!ready) return <div className="p-8 text-sm text-center text-slate-500">בחר חנות כדי להתחיל שיחה.</div>;
  return <div dir="rtl" className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4 xl:h-[calc(100dvh-140px)] min-h-[520px]">
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <Sparkles className="h-4 w-4 text-indigo-500" /><h2 className="font-semibold text-sm flex-1">צ׳אטבוט</h2>
        {dashboard?.chat?.engine === 'tenant-studio' && <span className="text-[11px] text-indigo-600 bg-indigo-50 rounded-full px-2 py-1">מחובר לסטודיו</span>}
        <button type="button" className="text-xs text-slate-500 hover:text-slate-800" disabled={busy || !!activeRun} onClick={fullReview}>סקירה מלאה של החנות</button>
      </div>
      <p className="px-5 py-2 text-xs text-slate-500 border-b border-slate-100">שאלות נבדקות מול נתוני החנות. קידומים, הסתרות ונעיצות מוצגים כהצעה ואפשר להפעיל אותם כאן לאחר בדיקה.</p>
      {activeRun && !thread.some(r => r._id === activeRun._id) && <button type="button" className="px-5 py-2 text-xs text-indigo-700 bg-indigo-50 text-right" onClick={() => { chose.current = true; setConversation(activeRun.conversationId || activeRun._id); }}>הסוכן עובד בשיחה אחרת · הצג את ההתקדמות</button>}
      {loadError && <div role="alert" className="px-5 py-2 text-xs text-amber-800 bg-amber-50">{loadError}<button type="button" className="mr-2 underline" onClick={loadRuns} disabled={loading}>נסה שוב</button></div>}
      <div className="flex-1 min-h-[300px] max-h-[60dvh] xl:max-h-none overflow-y-auto px-4 md:px-5 py-4 space-y-4 bg-slate-50/40" role="log" aria-label="הודעות השיחה" aria-live="polite">
        {!runs && loading && <p role="status" className="text-sm text-slate-500">טוען את היסטוריית השיחות…</p>}
        {!thread.length && runs && <div className="h-full flex flex-col items-center justify-center text-center gap-4">
          <p className="text-sm text-slate-500">שאל על החיפושים בחנות או בקש קידום, הסתרה או נעיצה של מוצר.</p>
          <div className="flex flex-wrap justify-center gap-2">{starters.map(s => <button key={s} onClick={() => setText(s)} className="text-xs rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50">{s}</button>)}</div>
        </div>}
        {thread.map(r => <Turn key={r._id} run={live?._id === r._id ? { ...r, ...live } : r} stream={activeRun?._id === r._id ? stream : null} onReview={review} />)}
        <div ref={bottom} />
      </div>
      {error && <p role="alert" className="px-5 py-2 text-xs text-rose-600 border-t border-rose-100 bg-rose-50">{error}</p>}
      <form onSubmit={submit} className="border-t border-slate-100 p-3">
        {focus && <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs">בדיקה של החיפוש ״{focus}״<button type="button" aria-label="ביטול" onClick={() => setFocus(null)}><X className="h-3 w-3" /></button></div>}
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e); }} rows={2} maxLength={2000}
            placeholder={focus ? 'הוסף הערה או לחץ שליחה' : 'כתוב הודעה…'} aria-label="הודעה לסוכן"
            className="flex-1 min-w-0 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 max-h-32" />
          {activeRun ? <button type="button" className={buttonClass} onClick={stop} disabled={stopping}>{stopping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}עצור</button>
            : <button className={buttonClass} disabled={busy || !runs || !!loadError || (!text.trim() && !focus)} aria-label="שליחה">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Enter לשליחה · Shift + Enter לשורה חדשה · עד 2,000 תווים</p>
      </form>
    </Card>
    <div className="space-y-4 overflow-y-auto">
      <Card className="p-4">
        <button className={`${buttonClass} w-full`} onClick={newChat}><Plus className="h-4 w-4" />שיחה חדשה</button>
        <div className="mt-3 space-y-1">{conversations.map(c => <button key={c.id} onClick={() => { chose.current = true; setConversation(c.id); }} className={`w-full text-right px-3 py-2 rounded-lg text-xs ${c.id === conversation ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
          <div className="truncate">{c.runs[0].request || 'סקירה'}</div><div className="text-[11px] text-slate-400 mt-0.5">{new Date(c.last.startedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}{isActive(c.last) ? ' · עובד…' : ''}</div>
        </button>)}</div>
      </Card>
    </div>
  </div>;
}

function Turn({ run, stream, onReview }) {
  const steps = (run.steps || []).filter(s => s.type === 'tool');
  const step = stream?.step || steps[steps.length - 1]?.name;
  const doing = step ? STEP_LABELS[step] || 'עובד' : 'חושב';
  return <>
    {run.request && <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 text-white px-4 py-2.5 text-sm whitespace-pre-wrap">{run.request}</div></div>}
    <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm">
      {isActive(run) && stream?.text ? <Markdown text={stream.text} />
        : isActive(run) ? <span className="inline-flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{doing}…</span>
        : run.summary ? <Markdown text={run.summary} />
          : <span className="text-slate-500">{run.error || actionStatus(run.status)}</span>}
      {!isActive(run) && run.summary && run.error && <p className="text-xs text-rose-600 mt-2">{run.error}</p>}
      {run.artifacts?.map(p => <Artifact key={p._id} p={p} onReview={onReview} />)}
    </div></div>
  </>;
}

function Artifact({ p, onReview }) {
  const [busy, setBusy] = useState(false);
  const act = async ok => { setBusy(true); await onReview(p, ok); setBusy(false); };
  const action = p.artifactType === 'action';
  const products = p.boostChange?.products || p.visibilityChange?.products || p.selectedProducts || [];
  const title = p.evidence?.summary || p.title || p.draftRule?.name || p.draftExperiment?.name || 'שינוי מוצע';
  const pinGroups = p.draftRule?.patch?.pinnedResults || [];
  return <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
    <p className="font-medium text-sm">{title}</p>
    {p.draftRule?.naturalLanguageText && <p className="text-xs text-slate-600 mt-1">{p.draftRule.naturalLanguageText}</p>}
    {p.boostChange && <p className="text-xs text-slate-600 mt-1">{p.boostChange.level === 0 ? 'הסרת קידום' : `רמת קידום: ${p.boostChange.level} מתוך 3`} · בכל החיפושים הרלוונטיים</p>}
    {pinGroups.map((pin, index) => <p key={index} className="text-xs text-slate-600 mt-1">נעיצה בחיפוש ״{pin.query}״ · {pin.productIds.length} מוצרים לפי הסדר שנבחר</p>)}
    {p.hypothesis && <p className="text-xs text-slate-600 mt-1">{p.hypothesis}</p>}
    {p.studioChanges?.length > 0 && <ul className="list-disc pr-4 mt-2 text-xs text-slate-600">{p.studioChanges.map((change, i) => <li key={i}>{change}</li>)}</ul>}
    {action && (p.filter || p.categories) && <p className="text-xs text-slate-600 mt-1">{p.filter ? `תגית: ${p.filter}` : `קטגוריות: ${p.categories.join(', ')}`}</p>}
    {products.length > 0 && <details className="mt-1 text-xs text-slate-600"><summary className="cursor-pointer">{products.length} מוצרים</summary><ul className="mt-1 space-y-0.5 max-h-40 overflow-auto">{products.map(x => <li key={x._id}>{x.name}</li>)}</ul></details>}
    {p.status === 'pending' ? <div className="flex gap-2 mt-3">
      <button className={buttonClass} disabled={busy} onClick={() => act(true)}><Check className="h-3.5 w-3.5" />{!action && (p.kind === 'experiment' || !p.kind) ? 'אישור והתחלת A/B' : 'אישור'}</button>
      <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50" disabled={busy} onClick={() => act(false)}>דחייה</button>
    </div> : <p className="text-xs mt-2 text-slate-500">{p.status === 'approved' ? p.kind === 'studioRevision' ? p.published ? '✓ נשמר בסטודיו ופורסם למנוע החיפוש' : 'נשמר בסטודיו · הפרסום לחיפוש טרם אומת' : p.published === false ? 'נשמר · הפרסום לחיפוש טרם אומת' : `✓ הופעל${p.appliedCount != null ? ` — ${p.appliedCount} מוצרים עודכנו` : ''}` : actionStatus(p.status)}</p>}
    {(p.applyError || p.error) && <p className="text-xs text-rose-600 mt-1">{p.applyError || p.error}</p>}
  </div>;
}

const inline = s => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
function Markdown({ text }) {
  const lines = String(text).replace(/\r/g, '').split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { const t = lines[i].trim(); if (!/^\|[\s:|-]+\|$/.test(t)) rows.push(t.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'))); i++; }
      i--;
      out.push(<div key={i} className="overflow-auto my-2"><table className="text-xs w-full text-right"><thead><tr>{rows[0]?.map((c, j) => <th key={j} className="px-2 py-1 font-semibold border-b border-slate-200">{inline(c)}</th>)}</tr></thead><tbody>{rows.slice(1).map((r, k) => <tr key={k} className="border-b border-slate-100">{r.map((c, j) => <td key={j} className="px-2 py-1">{inline(c)}</td>)}</tr>)}</tbody></table></div>);
    } else if (/^([-*•]|\d+[.)])\s+/.test(line)) {
      const items = [], ordered = /^\d/.test(line);
      while (i < lines.length && /^([-*•]|\d+[.)])\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^([-*•]|\d+[.)])\s+/, '')); i++; }
      i--;
      const List = ordered ? 'ol' : 'ul';
      out.push(<List key={i} className={`${ordered ? 'list-decimal' : 'list-disc'} pr-5 my-1 space-y-0.5`}>{items.map((it, k) => <li key={k}>{inline(it)}</li>)}</List>);
    } else out.push(<p key={i} className={`my-1 leading-relaxed ${/^#+\s/.test(line) ? 'font-semibold' : ''}`}>{inline(line.replace(/^#+\s*/, ''))}</p>);
  }
  return <div>{out}</div>;
}
