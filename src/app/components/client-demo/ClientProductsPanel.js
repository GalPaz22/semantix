'use client'
import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Package, Search, Loader2, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Card, PageHeader, Segmented } from './ui';
import { useOptimizer, useOptimizerResource, ResourceState, buttonClass } from './OptimizerContext';

const filters = [
  { id: 'all', label: 'כל המוצרים' },
  { id: 'visible', label: 'לא מוסתרים' },
  { id: 'hidden', label: 'מוסתרים' },
];
const number = value => (value ?? 0).toLocaleString('he-IL');
const imageOf = product => {
  const image = product.image || product.images?.[0];
  return typeof image === 'string' ? image : image?.src || image?.url || '';
};

const boostLevels = [{ value: 0, label: 'ללא קידום' }, { value: 1, label: 'קידום קל' }, { value: 2, label: 'קידום בינוני' }, { value: 3, label: 'קידום גבוה' }];
export default function ClientProductsPanel({ visible, onNavigate }) {
  const { mutate, request, ready, refresh } = useOptimizer();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [promotion, setPromotion] = useState('all');
  const [selected, setSelected] = useState([]);
  const [bulkLevel, setBulkLevel] = useState(1);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const resource = useOptimizerResource(`dashboard/products?query=${encodeURIComponent(query)}&visibility=${visibility}&promotion=${promotion}&page=${page}`, { enabled: visible });

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(draft.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    setDraft(''); setQuery(''); setVisibility('all'); setPage(1); setError(''); setNotice('');
  }, [request]);
  useEffect(() => {
    if (resource.data && page > Math.max(1, resource.data.totalPages)) setPage(Math.max(1, resource.data.totalPages));
  }, [resource.data, page]);
  useEffect(() => { setSelected([]); }, [query, visibility, promotion, page]);

  const toggle = async product => {
    setBusy(product._id); setError(''); setNotice('');
    try {
      const result = await mutate('dashboard/products/visibility', { productId: product._id, hidden: product.hidden !== true }, 'PUT');
      setSelected(prev => prev.filter(id => id !== product._id));
      setNotice(`${product.name}: ${result.hidden ? 'נשמר כמוסתר מהחיפוש' : 'הוחזר למוצרים הגלויים'}${result.cacheCleared ? '' : ' — רענון מטמון החיפוש עדיין לא אומת'}`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };
  const boost = async (productIds, level) => {
    if (busy || !productIds.length) return;
    setBusy(productIds.length === 1 ? productIds[0] : 'bulk'); setError(''); setNotice('');
    try {
      const result = await mutate('dashboard/products/boost', { productIds, level }, 'PUT');
      setSelected([]);
      setNotice(`${level === 0 ? 'הקידום הוסר' : `${boostLevels[level].label} נשמר`} עבור ${number(result.updated)} מוצרים${result.cacheCleared ? '' : ' — רענון מטמון החיפוש טרם אומת'}`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };
  const data = resource.data;

  return <div dir="rtl">
    <PageHeader eyebrow="קטלוג החנות" title="ניהול מוצרים" subtitle="קידום מעלה את העדיפות של המוצר בחיפושים רלוונטיים. נעיצה למיקום קבוע בחיפוש מסוים זמינה בסידור תוצאות."
      right={<button className={buttonClass} onClick={refresh} disabled={resource.loading || !!busy || !ready}>רענון</button>} />
    {data && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      {[
        ['מוצרים בקטלוג', data.stats.total],
        ['לא מוסתרים', data.stats.visible],
        ['מוסתרים מהחיפוש', data.stats.hidden],
      ].map(([label, count]) => <Card key={label} className="p-5"><p className="text-sm text-slate-500">{label}</p><strong className="block mt-2 text-2xl text-slate-900">{number(count)}</strong></Card>)}
    </div>}
    <Card className="p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 md:w-96">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input aria-label="חיפוש מוצרים" placeholder="חיפוש לפי שם מוצר, מק״ט או קטגוריה" value={draft} maxLength={200} onChange={e => setDraft(e.target.value)} className="w-full min-w-0 py-2.5 text-sm outline-none" />
      </div>
      <div className="flex flex-wrap items-center gap-3"><Segmented options={filters} value={visibility} onChange={value => { setVisibility(value); setPage(1); setNotice(''); }} />
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={promotion === 'boosted'} onChange={e => { setPromotion(e.target.checked ? 'boosted' : 'all'); setPage(1); }} />רק מוצרים מקודמים</label></div>
    </Card>
    {selected.length > 0 && <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
      <strong className="text-sm">{number(selected.length)} מוצרים נבחרו</strong>
      <select aria-label="רמת קידום למוצרים שנבחרו" className="border border-slate-200 rounded-lg p-2 text-xs bg-white" value={bulkLevel} onChange={e => setBulkLevel(Number(e.target.value))} disabled={!!busy}>{boostLevels.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}</select>
      <button className={buttonClass} disabled={!!busy || resource.loading} onClick={() => boost(selected, bulkLevel)}><TrendingUp className="h-3.5 w-3.5" />החל על הנבחרים</button>
      <button className="text-xs text-slate-500" disabled={!!busy} onClick={() => setSelected([])}>בטל בחירה</button>
      <span className="text-xs text-slate-500">מוצרים מוסתרים אינם ניתנים לבחירה לקידום.</span>
    </Card>}
    <ResourceState loading={resource.loading} error={error || resource.error} />
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 mb-4">{notice}</div>}
    {data && <Card className="overflow-hidden">
      <div className="px-5 py-3 text-xs text-slate-500 border-b border-slate-100">{number(data.total)} מוצרים תואמים לסינון</div>
      <div className="overflow-x-auto"><table className="w-full text-right text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="pr-4 py-3"><input type="checkbox" aria-label="בחר את כל המוצרים הגלויים בעמוד" disabled={!!busy || !data.products.some(p => !p.hidden)} checked={data.products.some(p => !p.hidden) && data.products.filter(p => !p.hidden).every(p => selected.includes(p._id))} onChange={e => setSelected(e.target.checked ? data.products.filter(p => !p.hidden).map(p => p._id) : [])} /></th><th className="px-5 py-3 font-medium">מוצר</th><th className="px-3 py-3 font-medium">קטגוריה</th><th className="px-3 py-3 font-medium">מחיר</th><th className="px-3 py-3 font-medium">נראות בחיפוש</th><th className="px-3 py-3 font-medium">קידום בחיפוש</th><th className="px-5 py-3 font-medium">פעולות</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{data.products.map(product => {
          const hidden = product.hidden === true;
          const image = imageOf(product);
          return <tr key={product._id} className={hidden ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}>
            <td className="pr-4 py-3"><input type="checkbox" aria-label={`בחר לקידום: ${product.name}`} checked={selected.includes(product._id)} disabled={hidden || !!busy} onChange={e => setSelected(prev => e.target.checked ? [...prev, product._id] : prev.filter(id => id !== product._id))} /></td>
            <td className="px-5 py-3"><div className="flex items-center gap-3 min-w-[220px]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 overflow-hidden">
                {image ? <img src={image} alt="" className="h-full w-full object-contain" /> : <Package className="h-5 w-5 text-slate-400" />}
              </span>
              <div><p className={`font-medium ${hidden ? 'text-slate-500' : 'text-slate-900'}`}>{product.name || 'מוצר ללא שם'}</p>
                {(product.sku || product.id != null) && <p className="text-xs text-slate-400 mt-1">{product.sku ? `מק״ט: ${product.sku}` : `מזהה: ${product.id}`}</p>}
              </div>
            </div></td>
            <td className="px-3 py-3 text-xs text-slate-500">{Array.isArray(product.category) ? product.category.join(', ') : product.category || '—'}</td>
            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{product.price != null && product.price !== '' ? product.price : '—'}</td>
            <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap ${hidden ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{hidden ? 'מוסתר' : 'גלוי'}
            </span></td>
            <td className="px-3 py-3"><select aria-label={`רמת קידום: ${product.name}`} value={product.boost || 0} disabled={!!busy || (hidden && !product.boost)} onChange={e => boost([product._id], Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white p-2 text-xs disabled:opacity-40">{boostLevels.map(level => <option key={level.value} value={level.value} disabled={hidden && level.value > 0}>{level.label}</option>)}</select></td>
            <td className="px-5 py-3"><div className="flex flex-col items-start gap-2"><button className={`${buttonClass} whitespace-nowrap`} disabled={!!busy} aria-label={`${hidden ? 'החזר לחיפוש' : 'הסתר מהחיפוש'}: ${product.name}`} onClick={() => toggle(product)}>
              {busy === product._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {hidden ? 'החזר לחיפוש' : 'הסתר מהחיפוש'}
            </button><button className="text-xs text-indigo-600 hover:underline text-right" disabled={!!busy} onClick={() => onNavigate?.('agent', `בדוק את המוצר ״${product.name}״ והצע קידום או נעיצה מתאימים על סמך נתוני החנות.`)}>התייעץ בצ׳אט</button></div></td>
          </tr>;
        })}</tbody>
      </table></div>
      {!data.products.length && <p className="p-10 text-center text-sm text-slate-500">{query ? 'לא נמצאו מוצרים לחיפוש הזה' : visibility === 'hidden' ? 'אין מוצרים מוסתרים' : 'אין מוצרים להצגה'}</p>}
      {data.totalPages > 1 && <div className="flex justify-between items-center gap-3 border-t border-slate-100 px-5 py-4">
        <button className={buttonClass} disabled={page <= 1 || !!busy} onClick={() => setPage(p => p - 1)}><ChevronRight className="h-4 w-4" />הקודם</button>
        <span className="text-xs text-slate-500">עמוד {number(page)} מתוך {number(data.totalPages)}</span>
        <button className={buttonClass} disabled={page >= data.totalPages || !!busy} onClick={() => setPage(p => p + 1)}>הבא<ChevronLeft className="h-4 w-4" /></button>
      </div>}
    </Card>}
  </div>;
}
