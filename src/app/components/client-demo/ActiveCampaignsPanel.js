'use client'
import React, { useState } from 'react';
import { Activity, Check, ChevronDown, FlaskConical, RefreshCw } from 'lucide-react';
import { ResourceState, useOptimizer, useOptimizerResource, buttonClass } from './OptimizerContext';
import { WeeklyProposal } from './WeeklySuggestionsPanel';
import { isActiveCampaign, hasCampaignHistory } from '../../../../lib/campaign-feedback';

const filters = [{ id: 'active', label: 'פעילים' }, { id: 'history', label: 'הסתיימו ונעצרו' }];
const statuses = { running: 'בניסוי A/B', applied: 'מופעל לכולם', paused: 'מושהה', scheduled: 'ממתין להפעלה', completed: 'הניסוי הסתיים', stopped: 'נעצר' };
const number = value => value == null ? '—' : value.toLocaleString('he-IL');
const percent = value => value == null ? '—' : `${(value * 100).toLocaleString('he-IL', { maximumFractionDigits: 1 })}%`;

export default function ActiveCampaignsPanel({ visible, onNavigate }) {
  const { refresh } = useOptimizer();
  const { data, loading, error } = useOptimizerResource('dashboard/campaigns', { enabled: visible, poll: visible });
  const [filter, setFilter] = useState('active');
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState('');
  const proposals = data?.proposals || [];
  const active = proposals.filter(isActiveCampaign);
  const history = proposals.filter(hasCampaignHistory);
  const campaigns = filter === 'active' ? active : history;
  const selected = campaigns.find(p => p._id === selectedId) || (selectedId === '' ? null : campaigns[0]);

  return <section className="space-y-6" aria-label="קמפיינים פעילים ופידבק">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="text-xs font-semibold text-indigo-600 mb-2">מעקב אחר ההצעות שאושרו</div><h1 className="text-3xl font-bold tracking-tight">קמפיינים פעילים</h1><p className="mt-2 text-sm text-slate-500 max-w-2xl leading-6">הצעות לשיפור שפועלות בחנות, מכל הדוחות: מה השתנה, איך הביצועים ומה אפשר להסיק מהנתונים.</p></div>
      <button type="button" className={buttonClass} onClick={refresh} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />רענון</button>
    </div>
    <ResourceState loading={loading && !data} error={error} />
    {notice && <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">{notice}</div>}
    {data && <>
      <div className="grid grid-cols-3 gap-3">
        {[[Activity, 'קמפיינים פעילים', active.length], [FlaskConical, 'ניסויי A/B', active.filter(p => p.status === 'running').length], [Check, 'מופעלים לכולם', active.filter(p => p.status === 'applied').length]].map(([Icon, label, count]) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 md:p-5"><div className="flex items-start gap-2 text-xs text-slate-500"><Icon className="h-4 w-4 shrink-0 text-indigo-500" />{label}</div><div className="mt-3 text-2xl md:text-3xl font-semibold tabular-nums">{count.toLocaleString('he-IL')}</div></div>)}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="סינון קמפיינים">
        {filters.map(({ id, label }) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => { setFilter(id); setSelectedId(null); }} className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label} ({id === 'active' ? active.length : history.length})</button>)}
      </div>
      {!campaigns.length ? <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center"><Activity className="h-8 w-8 text-indigo-400 mx-auto mb-4" /><h2 className="font-semibold">{filter === 'active' ? 'אין כרגע קמפיינים פעילים' : 'אין עדיין קמפיינים שהסתיימו או נעצרו'}</h2><p className="text-sm text-slate-500 mt-2">{filter === 'active' ? 'לאחר אישור והפעלת הצעה לשיפור, היא תופיע כאן עם הפידבק שלה.' : 'נתוני המעקב נשמרים גם לאחר סיום או עצירת הקמפיין.'}</p>{filter === 'active' && <button type="button" className={`${buttonClass} mt-5`} onClick={() => onNavigate?.('suggestions')}>להצעות לשיפור</button>}</div> : <div className="space-y-4">
        {campaigns.map((p, index) => {
          const open = selected?._id === p._id;
          return <div key={p._id} className="space-y-3">
            <button type="button" aria-expanded={open} aria-controls={`campaign-${p._id}`} onClick={() => setSelectedId(open ? '' : p._id)} className={`w-full rounded-xl border bg-white p-5 text-right flex items-start gap-3 ${open ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${['running', 'applied'].includes(p.status) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold break-words">{p.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{statuses[p.status]}</span></div><p className="text-xs text-slate-500 mt-2 break-words">{p.queries?.length ? p.queries.map(q => `״${q}״`).join(' · ') : 'כל החיפושים שבתחום הקמפיין'}</p><p className="text-xs text-indigo-600 mt-3">{open ? 'פידבק ופרטי הקמפיין' : 'לצפייה בפידבק ובביצועים'}</p></div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 mt-1 transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div id={`campaign-${p._id}`}>{p.source === 'rule' || p.source === 'experiment' ? <SavedCampaignFeedback campaign={p} /> : <WeeklyProposal p={p} index={index} onNotice={setNotice} feedbackFirst visible={visible} />}</div>}
          </div>;
        })}
      </div>}
    </>}
  </section>;
}

function SavedCampaignFeedback({ campaign: p }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
    <h3 className="font-semibold text-sm">פידבק וביצועי הקמפיין</h3>
    {p.description && <p className="text-sm text-slate-600 leading-7 whitespace-pre-wrap">{p.description}</p>}
    <div className="text-xs text-slate-500">{p.source === 'rule' ? 'כלל חיפוש קבוע · ללא קבוצת ביקורת' : p.previousTest ? 'הניסוי הופעל לכולם · הנתונים מתייחסים לבדיקה שקדמה להפעלה' : `ניסוי A/B${p.trafficPct != null ? ` · ${p.trafficPct}% מתנועת החיפוש` : ''}`}</div>
    {p.snapshot?.arms?.length ? <>
      <p className="text-xs text-slate-400">מדידה שמורה מ־{new Date(p.snapshot.asOf).toLocaleString('he-IL')} · רענון התצוגה טוען את המדידה השמורה האחרונה</p>
      <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="text-xs text-slate-400"><tr>{['גרסה', 'ביקורים', 'שיעור הקלקה', 'שיעור הוספה לסל'].map(label => <th key={label} className="p-3 font-medium whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{p.snapshot.arms.map(a => <tr key={a.arm} className="border-t border-slate-100"><td className="p-3">{a.arm === 'control' ? 'המקור' : 'ההצעה'}</td><td className="p-3">{number(a.sessions)}</td><td className="p-3">{percent(a.clickRate)}</td><td className="p-3">{percent(a.atcRate)}</td></tr>)}</tbody></table></div>
      <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 leading-6">אלו נתוני הניסוי השמורים. הם אינם קביעה של שיפור או ירידה, ואינם מדידה חדשה של ההפעלה הנוכחית.</p>
    </> : <div role="status" className="rounded-xl bg-slate-50 p-4"><h4 className="text-sm font-medium">{p.source === 'rule' ? 'לכלל הזה אין מדידת ביצועים נפרדת' : 'עדיין אין מדידה שמורה לניסוי הזה'}</h4><p className="text-xs text-slate-500 mt-2 leading-6">{p.source === 'rule' ? 'הכלל נשמר בחנות. השפעה על המרות דורשת מדידה נפרדת או ניסוי A/B.' : 'הניסוי מופיע כאן לפי מצבו השמור. היעדר מדידה אינו מעיד על אפס ביקורים או המרות.'}</p></div>}
  </article>;
}
