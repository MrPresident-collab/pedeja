import { ArrowLeft, MessageCircle } from 'lucide-react';
import { contentTopics, defaultTopic } from '@/data/content';

type Props = {
  topicKey: string;
  onBack: () => void;
  onSupport: () => void;
};

export function ContentView({ topicKey, onBack, onSupport }: Props) {
  const topic = contentTopics[topicKey] ?? defaultTopic;
  return (
    <main className="page inner-page content-page">
      <header className="category-header">
        <button className="icon-button back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">{topic.eyebrow}</p>
          <h1>{topic.title}</h1>
        </div>
      </header>

      <div className="content-body">
        {topic.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <button className="support-link" onClick={onSupport}>
        <MessageCircle size={18} /> Ainda tens dúvidas? Fala connosco
      </button>
    </main>
  );
}