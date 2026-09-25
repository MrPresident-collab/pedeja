import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { generateAiReply } from '../lib/aiGateway';

const SYSTEM_PROMPT = `És a Paula, a assistente 24/7 de apoio ao cliente do Pedejá em Angola.
Responde na língua do cliente quando for detectável, dando prioridade a Português, English e Français. Sê clara, concisa, profissional, calma e humana, sem dizer que és humana e sem usar linguagem robótica.
Usa duas camadas: conhecimento estável do Pedejá (Início, Fome, Compras, Enviar Pacote, Pedidos, Pacotes, Perfil, pagamentos, carteira, moradas, notificações e suporte) e o contexto autorizado fornecido pelo RPC customer_assistant_context().
Paula é suporte de primeira linha, não substitui suporte humano. Se não houver informação autorizada suficiente, diz: "Não tenho informação suficiente para confirmar isso. Contacta o suporte do Pedejá para obter assistência."
Nunca inventes preços, taxas, saldos, estados de pagamento, pedidos, envios, estafetas, ETA, localizações, reembolsos, prazos, alterações de conta, operações financeiras ou sucesso de uma acção.
Não executes mutações através da conversa: pagamentos, débitos, reembolsos, cancelamentos, alterações de morada/perfil, eliminação de conta, criação de envios ou pedidos. Podes explicar e orientar o cliente para as áreas reais da aplicação. Nunca reveles tokens, passwords, OTPs, credenciais, cartões, bancos, IDs internos, ledger, staff, SQL ou detalhes de segurança.
Categorias de suporte: Problema com um pedido; Problema com um pacote; Problema com pagamento; Problema com a minha conta; Outro assunto.`;

const QUICK_PROMPTS = ['Como funciona o Pedejá?', 'Onde vejo os meus pedidos?', 'Preciso de ajuda'];
const FALLBACK = 'Neste momento não consigo confirmar essa informação. Tenta novamente ou contacta o suporte do Pedejá.';

function now() {
  return new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
}

export default function AIChatModal({ isOpen, onClose }) {
  const { supabase } = useApp();
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState([{ sender: 'bot', text: 'Olá, sou a Paula. Sou a assistente 24/7 do Pedejá. Como posso ajudar?', time: now() }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [contextUnavailable, setContextUnavailable] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextLoadedAt, setContextLoadedAt] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isOpen || (context && Date.now() - contextLoadedAt < 60_000)) return undefined;
    let cancelled = false;
    setContextLoading(true);
    supabase.rpc('customer_assistant_context').then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data || typeof data !== 'object') {
        setContext(null);
        setContextUnavailable(true);
      } else {
        setContext(data);
        setContextUnavailable(false);
        setContextLoadedAt(Date.now());
      }
      setContextLoading(false);
    });
    return () => { cancelled = true; };
  }, [context, contextLoadedAt, isOpen, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (value = inputText) => {
    const text = value.trim();
    if (!text || loading) return;
    setMessages(previous => [...previous, { sender: 'user', text, time: now() }]);
    setInputText('');
    setLoading(true);
    try {
      const contextNote = contextUnavailable
        ? 'O RPC de contexto do cliente falhou. Não confirmes qualquer dado específico; orienta para tentar novamente ou contactar o suporte.'
        : `CONTEXTO AUTORIZADO DO CLIENTE (somente campos devolvidos pelo RPC; não procures dados adicionais):\n${JSON.stringify(context || {})}`;
      const response = await generateAiReply({
        text,
        systemPrompt: `${SYSTEM_PROMPT}\n\nIdioma/preferência actual: ${i18n.language || 'pt'}\n\n${contextNote}`,
        tools: [],
      });
      const reply = response?.functionCall
        ? 'Posso explicar e orientar, mas não executo alterações através da conversa. Abre a área correspondente da aplicação ou contacta o suporte do Pedejá.'
        : (response?.text || FALLBACK);
      setMessages(previous => [...previous, { sender: 'bot', text: reply, time: now() }]);
    } catch (error) {
      console.error('Paula assistant request failed:', error);
      setMessages(previous => [...previous, { sender: 'bot', text: FALLBACK, time: now() }]);
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center z-[99999] p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-[560px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-purple-100">
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 p-4 text-white shadow-md flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/20"><img src="/pedeja-assistant-avatar.png" alt="Paula" className="w-10 h-10 rounded-full object-cover" /></div>
            <div><div className="flex items-center gap-1.5"><h3 className="font-bold text-base">Paula</h3><Sparkles size={14} className="text-amber-300 animate-pulse" /></div><p className="text-[11px] text-purple-200">Assistente 24/7 do Pedejá{contextLoading ? ' · a carregar contexto' : ''}</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
          {messages.map((message, index) => <div key={`${message.time}-${index}`} className={`flex gap-2 ${message.sender === 'bot' ? 'items-start' : 'items-end justify-end'}`}>{message.sender === 'bot' && <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-1 shadow-sm"><img src="/pedeja-assistant-avatar.png" alt="Paula" className="w-full h-full object-cover" /></div>}<div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-sm ${message.sender === 'bot' ? 'bg-white text-gray-700 rounded-tl-none border border-gray-100' : 'bg-purple-600 text-white rounded-tr-none'}`}><div>{message.text}</div><div className={`text-[9px] mt-1 ${message.sender === 'bot' ? 'text-gray-400' : 'text-purple-200'}`}>{message.time}</div></div></div>)}
          {loading && <div className="flex items-start gap-2"><div className="w-7 h-7 rounded-full overflow-hidden shrink-0"><img src="/pedeja-assistant-avatar.png" alt="Paula" className="w-full h-full object-cover" /></div><div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3"><Loader2 size={15} className="animate-spin text-purple-600" /></div></div>}
          <div ref={bottomRef} />
        </div>
        <div className="bg-white border-t border-gray-100 p-3 shrink-0"><div className="flex gap-2 overflow-x-auto pb-2">{QUICK_PROMPTS.map(prompt => <button key={prompt} onClick={() => handleSend(prompt)} disabled={loading} className="shrink-0 bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-3 py-1.5 text-[10px] font-semibold disabled:opacity-50">{prompt}</button>)}</div><form onSubmit={event => { event.preventDefault(); handleSend(); }} className="flex items-center gap-2"><input value={inputText} onChange={event => setInputText(event.target.value)} placeholder="Escreve à Paula..." className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-purple-200" aria-label="Mensagem para Paula" /><button type="submit" disabled={loading || !inputText.trim()} className="w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center disabled:opacity-40" aria-label="Enviar mensagem"><Send size={17} /></button></form></div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.getElementById('modal-root') || document.body);
}
