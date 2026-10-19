'use client'
import React, { useEffect, useState } from 'react';
import { MessageSquare, MessagesSquare, SlidersHorizontal } from 'lucide-react';
import SearchAgentPanel from './SearchAgentPanel';
import ConciergeManagementPanel from './ConciergeManagementPanel';
const tabs = [{ id: 'assistant', label: 'צ׳אט לניהול החיפוש', icon: MessageSquare }, { id: 'conversations', label: 'שיחות לקוחות', icon: MessagesSquare }, { id: 'instructions', label: 'הוראות לקונסיירז׳', icon: SlidersHorizontal }];
export default function ClientChatbotPanel({ request, visible, onNavigate }) {
  const [tab, setTab] = useState('assistant');
  useEffect(() => { const selected = new URLSearchParams(window.location.search).get('chat'); if (tabs.some(t => t.id === selected)) setTab(selected); }, []);
  useEffect(() => { if (request?.nonce) { setTab('assistant'); const url = new URL(window.location.href); url.searchParams.set('chat', 'assistant'); window.history.replaceState(null, '', url.pathname + url.search); } }, [request?.nonce]);
  const choose = id => { setTab(id); const url = new URL(window.location.href); url.searchParams.set('chat', id); window.history.replaceState(null, '', url.pathname + url.search); };
  return <div dir="rtl">
    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="ניהול הצ׳אטבוט">{tabs.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => choose(t.id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm border transition ${tab === t.id ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm font-semibold' : 'border-transparent text-slate-500 hover:bg-white'}`}><t.icon className="h-4 w-4" />{t.label}</button>)}</div>
    <div className={tab === 'assistant' ? '' : 'hidden'}><SearchAgentPanel request={request} visible={visible && tab === 'assistant'} onNavigate={onNavigate} /></div>
    <div className={tab === 'conversations' ? '' : 'hidden'}><ConciergeManagementPanel section="conversations" visible={visible && tab === 'conversations'} /></div>
    <div className={tab === 'instructions' ? '' : 'hidden'}><ConciergeManagementPanel section="instructions" visible={visible && tab === 'instructions'} /></div>
  </div>;
}
