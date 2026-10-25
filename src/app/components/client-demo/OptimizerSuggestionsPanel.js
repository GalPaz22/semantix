'use client'
import React, { useState } from 'react';
import { Card, PageHeader } from './ui';
import { useOptimizer, useOptimizerResource, ResourceState, actionStatus, buttonClass } from './OptimizerContext';
export default function OptimizerSuggestionsPanel({ onNavigate, visible }) {
  const { mutate } = useOptimizer();
  const optimization = useOptimizerResource('optimization', { poll: visible });
  const proposals = useOptimizerResource('proposals?status=pending');
  const experiments = useOptimizerResource('experiments');
  const weekly = useOptimizerResource('optimization/weekly-review');
  const [busy, setBusy] = useState(''), [error, setError] = useState('');
  const run = async (path, body) => { setBusy(path); setError(''); try { await mutate(path, body); } catch (e) { setError(e.message); } finally { setBusy(''); } };
  const policy = optimization.data?.policy;
  const actions = [...(optimization.data?.actions || [])].sort((a, b) => (b.status === 'pending') - (a.status === 'pending') || (b.evidence?.score || 0) - (a.evidence?.score || 0));
  const groups = PROPOSAL_GROUPS.map(([key, title]) => [key, title, (proposals.data || []).filter(p => proposalGroup(p) === key)]).filter(([, , list]) => list.length);
  return <div dir="rtl">
    <PageHeader eyebrow="Semantix Optimizer" title="הצעות לשיפור החיפוש" subtitle="אבחונים, תיקוני קטלוג והצעות אמיתיות של הסוכן. אפשר לעיין במוצרים ובסיבות לפני ביצוע."
      right={<button className={buttonClass} disabled={!!busy || optimization.loading} onClick={()=>run('optimization/report')}>הכנת דוח והצעות</button>} />
    <ResourceState loading={optimization.loading} error={error || optimization.error || proposals.error || experiments.error} />
    {optimization.data && <>
      <Card className="p-5 mb-4"><div className="flex flex-wrap gap-3 items-center"><h3 className="font-semibold flex-1">סקירה יומית</h3>
        <button className={buttonClass} disabled={!!busy || !optimization.data.schedulerEnabled} onClick={()=>run('optimization/policy', { enabled: !policy?.enabled, agentEnabled: policy?.agentEnabled === true, autoExecuteCatalog: policy?.autoExecuteCatalog === true })}>{policy?.enabled ? 'כבה דוח יומי' : 'הפעל דוח יומי'}</button>
        <button className={buttonClass} onClick={()=>onNavigate?.('agent')}>בדיקה עם הסוכן</button></div>
        {!optimization.data.schedulerEnabled && <p className="text-xs text-slate-500 mt-3">בהרצה המקומית סקירות מופעלות ידנית.</p>}
        {optimization.data.schedulerEnabled && policy?.nextRunAt && <p className="text-xs text-slate-500 mt-3">הסקירה הבאה: {new Date(policy.nextRunAt).toLocaleString('he-IL')}</p>}
        {policy?.lastError && <p className="text-xs text-rose-600 mt-3">{policy.lastError}</p>}
      </Card>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">{[['ממתינות', optimization.data.actions.filter(a=>a.status==='pending').length + (proposals.data?.length || 0)], ['אומתו', optimization.data.actions.filter(a=>a.status==='verified').length], ['בדיקות פעילות', experiments.data?.filter(e=>e.status==='running').length || 0]].map(([label,n])=><Card key={label} className="p-5"><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{n}</strong></Card>)}</div>
      <WeeklyTriage review={weekly.data?.review} loading={weekly.loading} error={weekly.error} proposals={proposals.data || []} actions={actions} busy={busy} run={run} onNavigate={onNavigate} />
      <div className="space-y-4">
        {groups.map(([key, title, list]) => <section key={key} className="space-y-4"><h3 className="text-sm font-semibold text-slate-600 pt-2">{title} ({list.length})</h3>{list.map(p => <ProposalCard key={p._id} p={p} busy={busy} run={run} />)}</section>)}
        {actions.length > 0 && <h3 className="text-sm font-semibold text-slate-600 pt-2">תיקוני קטלוג ובדיקות ({actions.filter(a=>a.status==='pending').length} ממתינות)</h3>}
        {actions.map(a=><Card key={a._id} className="p-5"><div className="flex justify-between gap-3"><h3 className="font-semibold">{a.title}</h3><span className="text-xs text-indigo-600">{actionStatus(a.status)}</span></div><p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{a.rationale}</p>
          {a.diagnosis && <p className="text-sm text-slate-600 mt-3">{a.diagnosis.evidence}<br/>{a.diagnosis.nextStep}</p>}
          {a.selectedProducts?.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer">{a.selectedProducts.length} מוצרים בתיקון</summary><ul className="mt-2 space-y-1">{a.selectedProducts.map(p=><li key={p._id}>{p.name} {a.removeTagProductIds?.includes(p._id) ? '— הסרת תגית' : ''}</li>)}</ul></details>}
          {a.filter && <p className="text-xs text-slate-500 mt-2">תגית: {a.filter}</p>}
          {a.categories && <p className="text-xs text-slate-500 mt-2">קטגוריות: {a.categories.join(', ')}</p>}
          {(a.error || a.lastError) && <p role="alert" className="text-xs text-rose-600 mt-3">{a.error || a.lastError}</p>}
          {a.outcome && <div className="bg-slate-50 rounded-lg p-3 mt-3 text-xs text-slate-600">{a.outcome.dueAt && <>מדידה חוזרת: {new Date(a.outcome.dueAt).toLocaleString('he-IL')}<br/></>}{a.outcome.nextStep || 'ממתין להשלמת חלון המדידה'}</div>}
          <div className="flex flex-wrap gap-2 mt-4">
            {a.status==='pending' && a.kind!=='investigate' && <button className={buttonClass} disabled={!!busy || (a.kind==='reprocess' && !optimization.data.reprocessConfigured)} onClick={()=>run(`optimization/actions/${a._id}/execute`)}>אישור וביצוע התיקון</button>}
            {a.status==='pending' && a.kind==='investigate' && <button className={buttonClass} onClick={()=>a.query && a.query !== '__tracking__' ? onNavigate?.('agent', null, { query: a.query }) : onNavigate?.('agent', `חקור: ${a.title}. ${a.rationale}`)}>{a.query && a.query !== '__tracking__' ? 'בדיקה מהירה עם הסוכן' : 'חקירה עם הסוכן'}</button>}
            {a.status==='pending' && <button className={buttonClass} disabled={!!busy} onClick={()=>run(`optimization/actions/${a._id}/dismiss`)}>ביטול</button>}
            {['dispatch_pending','reprocessing','verifying'].includes(a.status) && <button className={buttonClass} disabled={!!busy} onClick={()=>run(`optimization/actions/${a._id}/verify`)}>בדיקת התקדמות</button>}
          </div>
        </Card>)}
        {experiments.data?.filter(e=>['running','paused','approved','completed','promoted'].includes(e.status)).length > 0 && <h3 className="text-sm font-semibold text-slate-600 pt-2">בדיקות A/B</h3>}
        {experiments.data?.filter(e=>['running','paused','approved','completed','promoted'].includes(e.status)).map(e=><ExperimentCard key={e._id} experiment={e} busy={busy} run={run}/>)}
        {!optimization.data.actions.length && !proposals.data?.length && !experiments.data?.length && <Card className="p-10 text-center text-sm text-slate-500">אין עדיין הצעות. הכינו דוח או בקשו מהסוכן לבדוק את החנות.</Card>}
      </div>
    </>}
  </div>;
}

const PROPOSAL_GROUPS = [['promote', 'קידום מוצרים'], ['category', 'קטגוריות וקדימויות'], ['catalog', 'תיקוני תגיות בקטלוג'], ['other', 'שינויים נוספים']];
const patchesOf = p => (p.draftExperiment?.arms?.filter(a => a.key !== 'control').map(a => a.patch) || [p.draftRule?.patch]).filter(Boolean);
function proposalGroup(p) {
  if (p.catalogChange) return 'catalog';
  if (p.kind === 'productBoost' || p.kind === 'productVisibility') return 'promote';
  const patches = patchesOf(p);
  if (patches.some(x => x.pinnedResults || x.productBoosts)) return 'promote';
  if (patches.some(x => x.categoryAssociation || x.softCategoriesBoost)) return 'category';
  return 'other';
}
const ISSUES = { zero_results: 'ללא תוצאות', low_click: 'מעט קליקים', click_no_cart: 'קליקים בלי הוספה לסל', low_cart: 'מעט הוספות לסל', catalog_gap: 'מוצרים נבחרים אזלו', below_average: 'מתחת לממוצע', small_sample: 'מדגם קטן' };
const pctOf = v => v == null ? '—' : `${Math.round(v * 100)}%`;

function WeeklyTriage({ review, loading, error, proposals, actions, busy, run, onNavigate }) {
  const [all, setAll] = useState(false);
  const rows = review?.queries || [], shown = all ? rows : rows.slice(0, 15);
  const linked = q => ({ props: proposals.filter(p => p.evidence?.query === q), acts: actions.filter(a => a.query === q && a.status === 'pending') });
  const tone = (own, store) => own == null || store == null ? '' : own < store * 0.6 ? 'text-rose-600 font-semibold' : own < store ? 'text-amber-600' : 'text-emerald-600';
  return <Card className="p-5 mb-4">
    <div className="flex flex-wrap gap-3 items-start"><div className="flex-1 min-w-[220px]"><h3 className="font-semibold">שאילתות השבוע לפי דחיפות</h3>
      <p className="text-xs text-slate-500 mt-1">{review ? <>נסרקו {review.scannedQueries?.toLocaleString('he-IL')} שאילתות משבעת הימים האחרונים · ממוצע החנות: {pctOf(review.store?.click)} קליקים, {pctOf(review.store?.cart)} הוספה לסל · עודכן {new Date(review.generatedAt).toLocaleString('he-IL')}</> : 'כל שאילתה נמדדת מול ממוצע החנות בקליקים ובהוספות לסל, ומדורגת לפי כמה סשנים היא מפסידה.'}</p></div>
      <button className={buttonClass} disabled={!!busy} onClick={()=>run('optimization/weekly-review')}>{busy === 'optimization/weekly-review' ? 'סורק…' : 'סריקת שאילתות השבוע'}</button></div>
    {error && <p role="alert" className="text-xs text-rose-600 mt-3">{error}</p>}
    {!review && !loading && !error && <p className="text-sm text-slate-500 mt-4">עדיין לא בוצעה סריקה. הסריקה רצה גם אוטומטית יחד עם הדוח היומי.</p>}
    {review && !rows.length && <p className="text-sm text-slate-500 mt-4">לא נמצאו השבוע שאילתות שמתפקדות מתחת לממוצע החנות.</p>}
    {rows.length > 0 && <div className="overflow-auto mt-4"><table className="w-full text-right text-sm"><thead className="text-xs text-slate-500"><tr>{['#','חיפוש','סשנים','קליקים','הוספה לסל','בעיה','הצעה'].map(h=><th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
      <tbody>{shown.map(q => { const { props, acts } = linked(q.query); return <tr key={q.query} className="border-t border-slate-100 align-top">
        <td className="p-2 text-slate-400">{q.rank}</td>
        <td className="p-2 font-medium">{q.query}<div className="text-xs text-slate-400 font-normal">ציון דחיפות {q.score}</div></td>
        <td className="p-2">{q.sessions.toLocaleString('he-IL')}{q.zeroSearches > 0 && <div className="text-xs text-rose-600">{q.zeroSearches} ללא תוצאות</div>}</td>
        <td className={`p-2 ${tone(q.clickRate, review.store?.click)}`}>{pctOf(q.clickRate)}</td>
        <td className={`p-2 ${tone(q.cartRate, review.store?.cart)}`}>{pctOf(q.cartRate)}</td>
        <td className="p-2"><div className="flex flex-wrap gap-1">{q.issues.map(i=><span key={i} className="text-xs bg-slate-100 rounded-full px-2 py-0.5">{ISSUES[i] || i}</span>)}</div></td>
        <td className="p-2 min-w-[220px] space-y-2">
          {props.map(p => <div key={p._id} className="bg-indigo-50 rounded-lg p-2 text-xs"><p className="font-medium">{p.evidence?.summary || p.draftRule?.name || p.draftExperiment?.name}</p>
            {p.evidence?.products?.length > 0 && <p className="text-slate-600 mt-1">{p.evidence.products.map(x=>x.name).join(' · ')}</p>}
            <div className="flex gap-2 mt-2"><button className={buttonClass} disabled={!!busy} onClick={()=>run(`proposals/${p._id}/approve`,{ start:true })}>{p.kind==='rule' ? 'אישור והפעלה' : 'אישור והתחלת A/B'}</button><button className={buttonClass} disabled={!!busy} onClick={()=>run(`proposals/${p._id}/reject`,{})}>דחייה</button></div></div>)}
          {acts.filter(a => a.kind !== 'investigate').map(a => <div key={a._id} className="bg-amber-50 rounded-lg p-2 text-xs"><p className="font-medium">{a.title}</p><button className={`${buttonClass} mt-2`} disabled={!!busy} onClick={()=>run(`optimization/actions/${a._id}/execute`)}>אישור וביצוע</button></div>)}
          {acts.filter(a => a.kind === 'investigate' && a.evidence?.kind === 'restock').map(a => <div key={a._id} className="bg-amber-50 rounded-lg p-2 text-xs"><p className="font-medium">{a.evidence.summary}</p>{a.evidence.products?.length > 0 && <p className="text-slate-600 mt-1">{a.evidence.products.map(x=>x.name).join(' · ')}</p>}</div>)}
          {!props.length && <button className={buttonClass} onClick={()=>onNavigate?.('agent', null, { query: q.query })}>בדיקה מהירה עם הסוכן</button>}
        </td></tr>; })}</tbody></table>
      {rows.length > 15 && <button className={`${buttonClass} mt-3`} onClick={()=>setAll(v=>!v)}>{all ? 'הצג פחות' : `הצג את כל ${rows.length} השאילתות`}</button>}</div>}
    {review?.tail?.queries > 0 && <details className="mt-4 text-sm"><summary className="cursor-pointer text-slate-600">עוד {review.tail.queries.toLocaleString('he-IL')} שאילתות חד־פעמיות: {review.tail.zeroResults} ללא תוצאות, {review.tail.noEngagement} בלי קליק או הוספה לסל</summary>
      <div className="bg-slate-50 rounded-lg p-3 mt-2 space-y-2 text-xs text-slate-600"><p>שאילתות שנחפשו בסשן אחד בלבד — קטנות מדי לדירוג אחת־אחת, אבל יחד מראות איפה חסרים מוצרים או מילים נרדפות.</p>
        {review.tail.zeroExamples?.length > 0 && <p><strong>ללא תוצאות:</strong> {review.tail.zeroExamples.join(' · ')}</p>}
        {review.tail.noEngagementExamples?.length > 0 && <p><strong>בלי קליק:</strong> {review.tail.noEngagementExamples.join(' · ')}</p>}
        <button className={buttonClass} onClick={()=>onNavigate?.('agent', `עבור על השאילתות החד־פעמיות של השבוע שלא הניבו תוצאות או קליקים (${[...(review.tail.zeroExamples || []), ...(review.tail.noEngagementExamples || [])].slice(0, 40).join(', ')}). מצא דפוסים משותפים — מוצרים חסרים, מילים נרדפות, איותים — והצע תיקונים.`)}>ניתוח דפוסים עם הסוכן</button>
      </div></details>}
  </Card>;
}

function ProposalCard({ p, busy, run }) {
  return <Card className="p-5"><div className="flex justify-between gap-3"><h3 className="font-semibold">{p.draftExperiment?.name || p.draftRule?.name || p.evidence?.summary || p.hypothesis}</h3><span className="text-xs text-indigo-600 shrink-0">{p.kind==='rule' ? 'כלל קבוע' : p.kind==='catalogFilter' ? 'קטלוג' : p.kind==='productBoost' ? 'קידום מוצרים' : p.kind==='productVisibility' ? 'הסתרת מוצרים' : 'בדיקת A/B'}{p.source==='weekly_review' ? ' · סריקה שבועית' : ''}</span></div><p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{p.hypothesis}</p>
          {(p.boostChange || p.visibilityChange)?.products?.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer">{(p.boostChange || p.visibilityChange).products.length} מוצרים</summary><ul className="mt-2 space-y-1">{(p.boostChange || p.visibilityChange).products.map(x=><li key={x._id}>{x.name}</li>)}</ul></details>}
          {p.evidence?.products?.length > 0 && <ul className="mt-3 text-sm space-y-1">{p.evidence.products.map(x=><li key={x.catalogId}>{x.name} <span className="text-xs text-slate-400">· {x.carts} הוספות לסל · {x.clicks} קליקים</span></li>)}</ul>}
          <details className="text-xs mt-3"><summary className="cursor-pointer">פרטי השינוי</summary><div className="bg-slate-50 rounded-lg p-3 mt-2 space-y-2">
            {p.catalogChange && <><p>תגית: {p.catalogChange.filter}</p><p>{p.catalogChange.productIds.length} מוצרים נבחרו</p><p>{p.catalogChange.rationale}</p></>}
            {(p.draftExperiment?.targeting || p.draftRule?.condition) && <p>חיפושים: {(p.draftExperiment?.targeting || p.draftRule?.condition).patterns?.join(', ') || 'כל החיפושים'}</p>}
            {p.draftExperiment && <p>הבדיקה תחול על {p.draftExperiment.trafficPct}% מהתנועה, בחלוקה בין הגרסאות שהוגדרו בהצעה.</p>}
            {patchesOf(p).map((patch,i)=><div key={i}>
              {patch.pinnedResults?.map(pin=><p key={pin.query}>נעיצת {pin.productIds.length} מוצרים לחיפוש ״{pin.query}״</p>)}
              {patch.categoryAssociation && <p>הוספת תוצאות מקטגוריות: {[...patch.categoryAssociation.categories,...patch.categoryAssociation.softCategories].join(', ')}</p>}
              {patch.softCategoriesBoost && <p>שינוי קדימות הקטגוריות: {Object.keys(patch.softCategoriesBoost).join(', ')}</p>}
              {patch.productBoosts && <p>שינוי קדימות של {Object.keys(patch.productBoosts).length} מוצרים</p>}
            </div>)}
            {p.guard?.warnings?.map((warning,i)=><p key={i} className="text-amber-700">{warning}</p>)}
          </div></details>
          <div className="flex gap-2 mt-4"><button className={buttonClass} disabled={!!busy} onClick={()=>run(`proposals/${p._id}/approve`,{ start:true })}>{p.kind==='rule' || p.kind==='catalogFilter' || p.kind==='productBoost' || p.kind==='productVisibility' ? 'אישור והפעלה' : 'אישור והתחלת A/B'}</button><button className={buttonClass} disabled={!!busy} onClick={()=>run(`proposals/${p._id}/reject`,{})}>דחייה</button></div>
        </Card>;
}
function ExperimentCard({ experiment: e, busy, run }) {
  const metrics = useOptimizerResource(`experiments/${e._id}/metrics`);
  const { dashboard } = useOptimizer();
  const purchaseTracked = dashboard?.report?.funnel.coverage.purchaseTracking;
  const pct = value => `${(value * 100).toFixed(1)}%`;
  return <Card className="p-5"><div className="flex justify-between"><h3 className="font-semibold">{e.name}</h3><span className="text-xs text-indigo-600">{actionStatus(e.status)}</span></div><p className="text-sm text-slate-500 mt-2">{e.hypothesis}</p>
    <p className="text-xs text-slate-500 mt-2">{e.trafficPct}% מהתנועה משתתפת בבדיקה</p>
    {metrics.error && <p role="alert" className="text-xs text-rose-600 mt-3">{metrics.error}</p>}
    {metrics.data?.latest ? <div className="overflow-auto mt-4"><table className="w-full text-right text-xs"><thead><tr>{['גרסה','סשנים','הקלקה','הוספה לסל','רכישה'].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{metrics.data.latest.arms.map(arm=><tr key={arm.arm} className="border-t border-slate-100"><td className="p-2">{arm.arm==='control'?'מצב נוכחי':'גרסה '+arm.arm}</td><td className="p-2">{arm.sessions.toLocaleString('he-IL')}</td><td className="p-2">{pct(arm.clickRate)}</td><td className="p-2">{pct(arm.atcRate)}</td><td className="p-2">{purchaseTracked ? pct(arm.cvr) : '—'}</td></tr>)}</tbody></table><p className="text-slate-400 text-xs mt-2">עודכן: {new Date(metrics.data.latest.asOf).toLocaleString('he-IL')}</p></div> : <p className="text-xs text-slate-500 mt-3">עדיין אין מדידה לבדיקה הזו.</p>}
    <button className={`${buttonClass} mt-3`} disabled={!!busy} onClick={()=>run(`experiments/${e._id}/metrics/refresh`)}>רענן מדידה</button>
    <div className="flex gap-2 mt-4">{(e.status==='running' ? [['pause','השהה'],['complete','סיים בדיקה']] : e.status==='paused' ? [['resume','המשך'],['kill','בטל']] : e.status==='approved' ? [['start','התחל בדיקה']] : e.status==='completed' ? [['promote','הפעל את הגרסה המנצחת']] : []).map(([op,label])=><button key={op} className={buttonClass} disabled={!!busy} onClick={()=>run(`experiments/${e._id}/${op}`,{})}>{label}</button>)}</div>
  </Card>;
}
