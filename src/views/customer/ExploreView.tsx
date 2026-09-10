import { ChevronRight, Facebook, Instagram, Linkedin, MessageCircle, Star } from 'lucide-react';
import { repositories } from '@/repositories';

type Props = { onOpen: (topicKey: string) => void };

export function ExploreView({ onOpen }: Props) {
  const groups = repositories.explore.getGroups();
  return (
    <main className="page inner-page">
      <header className="inner-header">
        <p className="eyebrow">EXPLORAR</p>
        <h1>Descobre o universo Pedejá.</h1>
        <p>Tudo o que precisas para pedir, enviar e fazer parte da nossa rede.</p>
      </header>

      <div className="explore-links">
        {groups.map((group) => (
          <section className="link-group" key={group.title}>
            <p className="eyebrow">{group.title}</p>
            {group.links.map((link) => (
              <button key={link} onClick={() => onOpen(link)}>
                <span>{link}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </section>
        ))}
      </div>

      <section className="social-section">
        <p className="eyebrow">SIGA-NOS</p>
        <div className="social-row">
          <button onClick={() => window.open('https://facebook.com', '_blank')}>
            <Facebook size={18} /> Facebook
          </button>
          <button onClick={() => window.open('https://instagram.com', '_blank')}>
            <Instagram size={18} /> Instagram
          </button>
          <button onClick={() => window.open('https://linkedin.com', '_blank')}>
            <Linkedin size={18} /> LinkedIn
          </button>
          <button onClick={() => onOpen('Contactar suporte')}>
            <MessageCircle size={18} /> WhatsApp
          </button>
        </div>
        <button className="feedback-button" onClick={() => onOpen('feedback')}>
          <Star size={17} /> Dar feedback sobre o Pedejá <ChevronRight size={16} />
        </button>
      </section>
    </main>
  );
}
