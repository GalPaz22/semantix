'use client'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const Context = createContext(null);
export function OptimizerProvider({ isAdmin, children }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [storeError, setStoreError] = useState('');
  const [version, setVersion] = useState(0);
  const [days, setDays] = useState(30);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ready = !isAdmin || !!selectedStore;
  const scope = `${isAdmin ? selectedStore : 'account'}:${days}`;
  const dashboard = snapshot?.scope === scope ? snapshot.data : null;
  const request = useCallback(async (path, init = {}) => {
    const [pathname, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    if (isAdmin && selectedStore) params.set('store', selectedStore);
    const response = await fetch(`/api/optimizer/${pathname}?${params}`, {
      ...init, signal: init.signal || AbortSignal.timeout(125000), cache: 'no-store', headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers },
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('השירות החזיר תשובה לא תקינה. נסו לרענן.'); }
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error || 'שגיאה בשירות'));
    return data;
  }, [isAdmin, selectedStore]);
  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    const controller = new AbortController();
    fetch('/api/optimizer/stores', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'לא ניתן לטעון חנויות');
      if (!live) return;
      setStores(data);
      const initialStore = new URLSearchParams(window.location.search).get('store');
      if (initialStore && data.some(store => store.dbName === initialStore)) setSelectedStore(initialStore);
      else if (initialStore) setStoreError('החנות שנבחרה אינה זמינה');
    }).catch(e => { if (live) setStoreError(e.message); });
    return () => { live = false; controller.abort(); };
  }, [isAdmin]);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setError(''); setLoading(ready);
    if (ready) request(`dashboard?days=${days}`, { signal: controller.signal }).then(data => { if (live) setSnapshot({ scope, data }); })
      .catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; controller.abort(); };
  }, [request, days, ready, version, scope]);
  const streamUrl = useCallback(path => {
    const params = new URLSearchParams();
    if (isAdmin && selectedStore) params.set('store', selectedStore);
    return `/api/optimizer/${path}?${params}`;
  }, [isAdmin, selectedStore]);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  const mutate = useCallback(async (path, body, method = 'POST') => {
    const result = await request(path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    refresh(); return result;
  }, [request, refresh]);
  return <Context.Provider value={{ request, streamUrl, mutate, refresh, version, ready, days, setDays, dashboard, loading, error }}>
    {isAdmin && <div className="lg:mr-64 border-b border-slate-200 bg-indigo-50 p-3 text-sm" dir="rtl">
      <label className="flex items-center gap-3">תצוגת לקוח — בחר חנות
        <select aria-label="בחר חנות" className="rounded-lg border border-slate-200 bg-white p-2" value={selectedStore} onChange={e => {
          const value = e.target.value;
          setSelectedStore(value); setStoreError('');
          const url = new URL(window.location.href);
          if (value) url.searchParams.set('store', value);
          else url.searchParams.delete('store');
          window.history.replaceState(null, '', url.pathname + url.search);
        }}>
          <option value="">בחירת חנות</option>{stores.map(s => <option key={s.dbName} value={s.dbName}>{s.name}</option>)}
        </select>
      </label>{storeError && <p role="alert">{storeError}</p>}
    </div>}
    <React.Fragment key={isAdmin ? selectedStore : 'account'}>{children}</React.Fragment>
  </Context.Provider>;
}
export const useOptimizer = () => useContext(Context);
export function useOptimizerResource(path, { poll = false, enabled = true } = {}) {
  const { request, version, ready } = useOptimizer();
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    let live = true, timer;
    const controller = new AbortController();
    setData(null); setError(''); setLoading(ready && enabled);
    const load = async () => {
      try { const next = await request(path, { signal: controller.signal }); if (live) { setData(next); setError(''); } }
      catch (e) { if (live) setError(e.message); }
      finally { if (live) { setLoading(false); if (poll) timer = setTimeout(load, 5000); } }
    };
    if (ready && enabled) load();
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, [request, path, version, ready, poll, enabled]);
  return { data, error, loading };
}
export function ResourceState({ loading, error, empty }) {
  const { ready } = useOptimizer();
  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!ready || loading || empty) return <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{!ready ? 'בחר חנות כדי להציג את הנתונים שלה' : loading ? 'טוען נתונים…' : empty}</div>;
  return null;
}
export const actionStatus = status => ({ pending: 'ממתין לבדיקה', applying: 'מיישם', dispatch_pending: 'ממתין לעיבוד', reprocessing: 'מעבד מוצרים', verifying: 'מאמת', verified: 'אומת', failed: 'נכשל', dismissed: 'בוטל', approved: 'אושר', rejected: 'נדחה', active: 'פעיל', disabled: 'מושבת', running: 'פועל', queued: 'בתור', completed: 'הושלם', stopped: 'נעצר', skipped_budget: 'התקציב נוצל', promoted: 'הופעל לכל הגולשים', paused: 'מושהה', killed: 'בוטל' }[status] || status);
export const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40';
