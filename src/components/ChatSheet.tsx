import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';

type ChatMessage = {
  id: string;
  text: string;
  from: 'customer' | 'rider';
  time: string;
};

const initialMessages: ChatMessage[] = [
  { id: 'm1', text: 'Olá! Estou a caminho do teu pedido.', from: 'rider', time: '12:12' },
  { id: 'm2', text: 'Obrigado! Está quase pronto?', from: 'customer', time: '12:13' },
  { id: 'm3', text: 'Sim, vou recolher agora. Em 5 minutos estou aí.', from: 'rider', time: '12:14' },
];

type Props = {
  riderName: string;
  orderId: string;
  onClose: () => void;
};

export function ChatSheet({ riderName, orderId, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMessages((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, text, from: 'customer', time },
    ]);
    setInput('');

    setTimeout(() => {
      const replies = [
        'Ok, vou verificar.',
        'Entendido!',
        'Já estou quase aí.',
        'Sem problema, estou a caminho.',
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      const t2 = new Date();
      const time2 = `${String(t2.getHours()).padStart(2, '0')}:${String(t2.getMinutes()).padStart(2, '0')}`;
      setMessages((prev) => [
        ...prev,
        { id: `r-${Date.now()}`, text: reply, from: 'rider', time: time2 },
      ]);
    }, 1200 + Math.random() * 1500);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-sheet">
      <header className="chat-header">
        <button className="icon-button" onClick={onClose} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div className="chat-header-info">
          <strong>{riderName}</strong>
          <small>Pedido {orderId}</small>
        </div>
      </header>

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.from}`}>
            <p>{m.text}</p>
            <time>{m.time}</time>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="chat-composer">
        <input
          type="text"
          placeholder="Escreve uma mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className="chat-send" onClick={send} disabled={!input.trim()} aria-label="Enviar">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
