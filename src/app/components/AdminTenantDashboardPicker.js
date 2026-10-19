'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowUpLeft } from 'lucide-react';

export default function AdminTenantDashboardPicker() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch('/api/optimizer/stores', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'לא ניתן לטעון את רשימת החנויות');
        if (live) setStores(data);
      })
      .catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  return <section className="mb-6 rounded-2xl border border-indigo-100 bg-white p-4 md:p-5 shadow-sm" dir="rtl">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><LayoutDashboard className="h-4 w-4 text-indigo-600" />דאשבורד לקוח לפי חנות</h3>
        <p className="text-xs text-slate-500 mt-1">בחר חנות כדי לפתוח את האנליטיקות, המוצרים והסוכן שלה בדאשבורד החדש.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <select aria-label="בחירת חנות לדאשבורד החדש" value={selectedStore} disabled={loading} onChange={e => setSelectedStore(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm min-w-0 sm:max-w-xs">
          <option value="">{loading ? 'טוען חנויות…' : 'בחר חנות'}</option>
          {stores.map(store => <option key={store.dbName} value={store.dbName}>{store.name === store.dbName ? store.dbName : `${store.name} (${store.dbName})`}</option>)}
        </select>
        {selectedStore ? <Link href={`/dashboard/client?panel=analytics&store=${encodeURIComponent(selectedStore)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">פתח דאשבורד<ArrowUpLeft className="h-4 w-4" /></Link>
          : <button disabled className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">פתח דאשבורד</button>}
      </div>
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
    {!loading && !error && !stores.length && <p className="mt-3 text-xs text-slate-500">לא נמצאו חנויות מחוברות.</p>}
  </section>;
}
