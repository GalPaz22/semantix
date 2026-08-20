'use client'
import React, { useState, useEffect, useCallback } from 'react';
import {
  Pin,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Plus,
  Trash2,
  Search,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

/**
 * PinnedResultsPanel — merchandising: pin specific products to the top of the
 * results for chosen search phrases. When a shopper's query *contains* a rule's
 * phrase, the pinned products appear first (in order), then the regular results.
 *
 * In the regular dashboard it operates on the logged-in user's store. In the
 * admin panel it can operate on a selected store via `apiKey`.
 */
export default function PinnedResultsPanel({ apiKey, dbName, adminMode = false }) {
  const [rules, setRules] = useState([]); // [{ query, productIds:[], products:[{_id,name,image,price}], enabled }]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Product picker state (per active rule index)
  const [pickerIndex, setPickerIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Per-rule "new term" draft (for the tag input). Keyed by rule index.
  const [termDrafts, setTermDrafts] = useState({});

  // ---- Load existing config for the selected store ----
  const fetchRules = useCallback(async () => {
    if (adminMode && !apiKey) {
      setRules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint = adminMode
        ? `/api/admin/pinned-results?apiKey=${encodeURIComponent(apiKey)}`
        : '/api/pinned-results';
      const res = await fetch(endpoint, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRules(
        (data.pinnedResults || []).map((r) => ({
          query: r.query || '',
          productIds: Array.isArray(r.productIds) ? r.productIds : [],
          products: Array.isArray(r.products) ? r.products : [],
          enabled: r.enabled !== false,
        }))
      );
      setHasChanges(false);
    } catch (e) {
      setError('שגיאה בטעינת התצורה: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [adminMode, apiKey]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const markChanged = () => {
    setHasChanges(true);
    setSuccess('');
  };

  // ---- Rule operations ----
  const addRule = () => {
    setRules((prev) => [...prev, { query: '', productIds: [], products: [], enabled: true }]);
    markChanged();
  };

  const removeRule = (idx) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
    if (pickerIndex === idx) setPickerIndex(null);
    markChanged();
  };

  const updateRuleQuery = (idx, value) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, query: value } : r)));
    markChanged();
  };

  // ---- Search terms (a rule can hold several comma-separated terms) ----
  // Stored on disk as a comma-separated `query` string; shown here as chips.
  const getTerms = (rule) =>
    (rule.query || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

  const setTerms = (idx, terms) => {
    // de-duplicate while preserving order
    const unique = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
    updateRuleQuery(idx, unique.join(', '));
  };

  const addTerm = (idx, rawTerm) => {
    const term = (rawTerm || '').trim();
    if (!term) return;
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const terms = (r.query || '').split(',').map((t) => t.trim()).filter(Boolean);
        if (terms.includes(term)) return r;
        return { ...r, query: [...terms, term].join(', ') };
      })
    );
    setTermDrafts((prev) => ({ ...prev, [idx]: '' }));
    markChanged();
  };

  const removeTerm = (idx, term) => {
    setRules((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              query: (r.query || '')
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t && t !== term)
                .join(', '),
            }
          : r
      )
    );
    markChanged();
  };

  const handleTermKeyDown = (idx, e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTerm(idx, termDrafts[idx] || '');
    } else if (e.key === 'Backspace' && !(termDrafts[idx] || '')) {
      // backspace on empty input removes the last term
      const terms = getTerms(rules[idx] || {});
      if (terms.length) removeTerm(idx, terms[terms.length - 1]);
    }
  };

  const toggleRuleEnabled = (idx) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, enabled: !r.enabled } : r)));
    markChanged();
  };

  const addProductToRule = (idx, product) => {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const id = product._id?.toString();
        if (!id || r.productIds.includes(id)) return r; // no duplicates
        return {
          ...r,
          productIds: [...r.productIds, id],
          products: [
            ...r.products,
            { _id: id, name: product.name || '', image: product.image || '', price: product.price ?? '' },
          ],
        };
      })
    );
    markChanged();
  };

  const removeProductFromRule = (idx, productId) => {
    setRules((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              productIds: r.productIds.filter((id) => id !== productId),
              products: r.products.filter((p) => p._id !== productId),
            }
          : r
      )
    );
    markChanged();
  };

  const moveProduct = (idx, productId, dir) => {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const pos = r.productIds.indexOf(productId);
        const swap = pos + dir;
        if (pos < 0 || swap < 0 || swap >= r.productIds.length) return r;
        const productIds = [...r.productIds];
        const products = [...r.products];
        [productIds[pos], productIds[swap]] = [productIds[swap], productIds[pos]];
        [products[pos], products[swap]] = [products[swap], products[pos]];
        return { ...r, productIds, products };
      })
    );
    markChanged();
  };

  // ---- Product search (picker) ----
  const openPicker = (idx) => {
    setPickerIndex(idx);
    setSearchTerm('');
    setSearchResults([]);
  };

  const runProductSearch = async (term) => {
    if (!dbName) {
      setError('לא נמצא שם מסד נתונים (dbName) עבור המשתמש');
      return;
    }
    if (!term || term.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName, search: term.trim(), page: 1, limit: 12, excludeHidden: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Defensive: also drop products marked hidden as 1 / "true" (not just boolean true).
      const visible = (data.products || []).filter((p) => {
        const h = p?.hidden;
        return !(h === true || h === 1 || String(h).toLowerCase().trim() === 'true');
      });
      setSearchResults(visible);
    } catch (e) {
      setError('שגיאה בחיפוש מוצרים: ' + e.message);
    } finally {
      setSearching(false);
    }
  };

  // debounce the product search
  useEffect(() => {
    if (pickerIndex === null) return;
    const t = setTimeout(() => runProductSearch(searchTerm), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, pickerIndex]);

  // ---- Save ----
  const save = async () => {
    if (adminMode && !apiKey) {
      setError('יש לבחור משתמש/חנות תחילה');
      return;
    }
    // Basic validation
    for (const r of rules) {
      if (!r.query || r.query.trim() === '') {
        setError('לכל כלל חייב להיות ביטוי חיפוש');
        return;
      }
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(adminMode ? '/api/admin/pinned-results' : '/api/pinned-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminMode ? { apiKey, pinnedResults: rules } : { pinnedResults: rules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSuccess('התצורה נשמרה בהצלחה! השינויים ייכנסו לתוקף תוך עד 5 דקות.');
      setHasChanges(false);
    } catch (e) {
      setError('שגיאה בשמירה: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (adminMode && !apiKey) {
    return (
      <div dir="rtl" className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 text-amber-700 text-sm">
        <Info className="h-4 w-4 shrink-0" />
        חפשו וטענו משתמש/חנות בראש פאנל הניהול כדי לנהל עבורו תוצאות מקודמות.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <RefreshCw className="h-5 w-5 animate-spin ml-2" />
        טוען תצורה...
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Pin className="h-6 w-6 text-indigo-600" />
            תוצאות מקודמות
          </h2>
          <p className="text-gray-500 mt-1 max-w-2xl text-sm">
            הגדירו ביטויי חיפוש, ובחרו אילו מוצרים יופיעו <b>ראשונים</b> עבורם. כשלקוח מחפש
            ביטוי שמכיל את הביטוי שהגדרתם (למשל "שעון לנשים"), המוצרים שבחרתם יוצגו בראש
            התוצאות בסדר שקבעתם, ואחריהם תוצאות החיפוש הרגילות.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRules}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" /> רענון
          </button>
          <button
            onClick={save}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg disabled:opacity-50 hover:bg-indigo-700"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            שמירה
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}
      {!dbName && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
          <Info className="h-4 w-4 shrink-0" /> לא נמצא מסד נתונים למשתמש — בורר המוצרים לא יעבוד.
        </div>
      )}

      {/* Rules */}
      <div className="space-y-4">
        {rules.length === 0 && (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            עדיין לא הוגדרו כללים. לחצו על "הוספת כלל" כדי להתחיל.
          </div>
        )}

        {rules.map((rule, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ביטויי החיפוש (כל מונח מקפיץ את אותם מוצרים)
                </label>
                <div
                  onClick={() => document.getElementById(`term-input-${idx}`)?.focus()}
                  className="w-full min-h-[42px] px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex flex-wrap items-center gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500"
                >
                  {getTerms(rule).map((term) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 rounded-md px-2 py-0.5 text-xs"
                    >
                      {term}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTerm(idx, term);
                        }}
                        className="text-indigo-400 hover:text-indigo-700"
                        title="הסרת מונח"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id={`term-input-${idx}`}
                    type="text"
                    value={termDrafts[idx] || ''}
                    onChange={(e) => setTermDrafts((prev) => ({ ...prev, [idx]: e.target.value }))}
                    onKeyDown={(e) => handleTermKeyDown(idx, e)}
                    onBlur={() => addTerm(idx, termDrafts[idx] || '')}
                    placeholder={getTerms(rule).length ? 'הוספת מונח…' : 'למשל: שעון לנשים'}
                    className="flex-1 min-w-[120px] px-1 py-0.5 outline-none border-0 focus:ring-0 text-sm bg-transparent"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  הקלידו מונח ולחצו Enter או פסיק כדי להוסיף אותו לרשימה.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 mt-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRuleEnabled(idx)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                פעיל
              </label>
              <button
                onClick={() => removeRule(idx)}
                className="mt-5 inline-flex items-center gap-1 px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                title="מחיקת כלל"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Selected products */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  מוצרים מקודמים ({rule.products.length})
                </span>
                <button
                  onClick={() => openPicker(idx)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                >
                  <Plus className="h-3.5 w-3.5" /> הוספת מוצר
                </button>
              </div>

              {rule.products.length === 0 ? (
                <div className="text-xs text-gray-400 py-3">לא נבחרו מוצרים לכלל זה.</div>
              ) : (
                <ul className="space-y-2">
                  {rule.products.map((p, pIdx) => (
                    <li
                      key={p._id}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="text-xs text-gray-400 w-5 text-center">{pIdx + 1}</span>
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-200" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 truncate">{p.name || p._id}</div>
                        {p.price !== '' && p.price != null && (
                          <div className="text-xs text-gray-400">{p.price}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveProduct(idx, p._id, -1)}
                          disabled={pIdx === 0}
                          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          title="הזז מעלה"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveProduct(idx, p._id, 1)}
                          disabled={pIdx === rule.products.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          title="הזז מטה"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeProductFromRule(idx, p._id)}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="הסרה"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRule}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50"
      >
        <Plus className="h-4 w-4" /> הוספת כלל
      </button>

      {/* Product picker modal */}
      {pickerIndex !== null && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setPickerIndex(null)}
        >
          <div
            dir="rtl"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">בחירת מוצרים</h3>
              <button onClick={() => setPickerIndex(null)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חיפוש מוצר לפי שם / SKU..."
                  className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {searching ? (
                <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" /> מחפש...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {searchTerm.trim().length < 2 ? 'הקלידו לפחות 2 תווים לחיפוש' : 'לא נמצאו מוצרים'}
                </div>
              ) : (
                <ul className="space-y-2">
                  {searchResults.map((product) => {
                    const already = rules[pickerIndex]?.productIds.includes(product._id?.toString());
                    return (
                      <li
                        key={product._id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-200" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 truncate">{product.name}</div>
                          {product.price != null && (
                            <div className="text-xs text-gray-400">{product.price}</div>
                          )}
                        </div>
                        <button
                          onClick={() => addProductToRule(pickerIndex, product)}
                          disabled={already}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-40 disabled:cursor-default text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                          {already ? 'נבחר' : 'הוסף'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 text-left">
              <button
                onClick={() => setPickerIndex(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                סיום
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
