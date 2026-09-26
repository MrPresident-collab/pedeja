import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateAiReply } from '../lib/aiGateway';

const COPY = {
  pt: { welcome: 'Olá, sou a Paula. Sou a assistente 24/7 do Pedejá. Como posso ajudar?', support: 'Suporte 24/7', placeholder: 'Escreve à Paula...', send: 'Enviar mensagem', prompts: ['Como funciona o Pedejá?', 'Onde vejo os meus pedidos?', 'Preciso de ajuda'], fallback: 'Neste momento não consigo responder. Tenta novamente ou contacta o suporte do Pedejá.', locale: 'pt-AO' },
  en: { welcome: 'Hello, I’m Paula. I’m Pedejá’s 24/7 support assistant. How can I help?', support: '24/7 Support', placeholder: 'Write to Paula...', send: 'Send message', prompts: ['How does Pedejá work?', 'Where can I see my orders?', 'I need help'], fallback: 'I can’t answer right now. Please try again or contact Pedejá support.', locale: 'en-AO' },
  fr: { welcome: 'Bonjour, je suis Paula. Je suis l’assistante support 24/7 de Pedejá. Comment puis-je vous aider ?', support: 'Assistance 24/7', placeholder: 'Écrivez à Paula...', send: 'Envoyer le message', prompts: ['Comment fonctionne Pedejá ?', 'Où voir mes commandes ?', 'J’ai besoin d’aide'], fallback: 'Je ne peux pas répondre pour le moment. Réessayez ou contactez le support de Pedejá.', locale: 'fr-AO' },
};

export default function AIChatModal({ isOpen, onClose }) {
  const { i18n } = useTranslation();
  const language = ['en', 'fr'].includes(i18n.language) ? i18n.language : 'pt';
  const copy = COPY[language];
  const [messages, setMessages] = useState([{ sender: 'bot', text: copy.welcome, time: now(copy.locale) }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { setMessages(previous => previous.length === 1 && previous[0].sender === 'bot' ? [{ sender: 'bot', text: copy.welcome, time: now(copy.locale) }] : previous); }, [language, copy.locale, copy.welcome]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  if (!isOpen) return null;
  const handleSend = async (value = inputText) => {
    const text = value.trim();
    if (!text || loading) return;
    setMessages(previous => [...previous, { sender: 'user', text, time: now(copy.locale) }]);
    setInputText(''); setLoading(true);
    try {
      const response = await generateAiReply({ text, language });
      setMessages(previous => [...previous, { sender: 'bot', text: response?.text || copy.fallback, time: now(copy.locale) }]);
    } catch (error) {
      console.error('Paula assistant request failed:', error);
      setMessages(previous => [...previous, { sender: 'bot', text: copy.fallback, time: now(copy.locale) }]);
    } finally { setLoading(false); }
  };
  const modal = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center z-[99999] p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-[560px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-purple-100">
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 p-4 text-white shadow-md flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3"><div className="bg-white/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/20"><img src="/pedeja-assistant-avatar.png" alt="Paula" className="w-10 h-10 rounded-full object-cover" /></div><div><div className="flex items-center gap-1.5"><h3 className="font-bold text-base">Paula</h3><Sparkles size={14} className="text-amber-300 animate-pulse" /></div><p className="text-[11px] text-purple-200">{copy.support}</p></div></div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
          {messages.map((message, index) => <div key={message.time + '-' + index} className={'flex gap-2 ' + (message.sender === 'bot' ? 'items-start' : 'items-end justify-end')}>{message.sender === 'bot' && <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-1 shadow-sm"><img src="/pedeja-assistant-avatar.png" alt="Paula" className="w-full h-full object-cover" /></div>}<div className={'max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-sm ' + (message.sender === 'bot' ? 'bg-white text-gray-700 rounded-tl-none border border-gray-100' : 'bg-purple-600 text-white rounded-tr-none')}><div>{message.text}</div><div className={'text-[9px] mt-1 ' + (message.sender === 'bot' ? 'text-gray-400' : 'text-purple-200')}>{message.time}</div></div></div>)}
          {loading && <div className="flex items-start gap-2"><div className="w-7 h-7 rounded-full overflow-hidden shrink-0"><img src="/pedeja-assistant-avatar.png" alt="Paula" className="w-full h-full object-cover" /></div><div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3"><Loader2 size={15} className="animate-spin text-purple-600" /></div></div>}
          <div ref={bottomRef} />
        </div>
        <div className="bg-white border-t border-gray-100 p-3 shrink-0"><div className="flex gap-2 overflow-x-auto pb-2">{copy.prompts.map(prompt => <button key={prompt} onClick={() => handleSend(prompt)} disabled={loading} className="shrink-0 bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-3 py-1.5 text-[10px] font-semibold disabled:opacity-50">{prompt}</button>)}</div><form onSubmit={event => { event.preventDefault(); handleSend(); }} className="flex items-center gap-2"><input value={inputText} onChange={event => setInputText(event.target.value)} placeholder={copy.placeholder} className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-purple-200" aria-label={copy.placeholder} /><button type="submit" disabled={loading || !inputText.trim()} className="w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center disabled:opacity-40" aria-label={copy.send}><Send size={17} /></button></form></div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.getElementById('modal-root') || document.body);
}
function now(locale) { return new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }); }