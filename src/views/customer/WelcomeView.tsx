import { ArrowRight, ChevronRight, MapPin, Package } from 'lucide-react';
import { Logo } from '@/components/Logo';

type Props = { onEnter: () => void; onCreate: () => void; onGuest: () => void };

export function WelcomeView({ onEnter, onCreate, onGuest }: Props) {
  return (
    <main className="onboarding welcome-screen">
      <div className="welcome-glow" />
      <div className="welcome-top">
        <Logo dark />
        <span className="language-pill">
          PT <ChevronRight size={14} />
        </span>
      </div>
      <div className="welcome-art" aria-hidden="true">
        <div className="art-blob blob-back" />
        <div className="art-blob blob-front">
          <Package size={56} strokeWidth={1.5} />
        </div>
        <div className="art-line line-one" />
        <div className="art-line line-two" />
        <div className="art-pin">
          <MapPin size={20} fill="currentColor" />
        </div>
      </div>
      <div className="welcome-copy">
        <p className="eyebrow">ANGOLA, ESTAMOS JUNTOS</p>
        <h1>
          O que precisares,
          <br />
          <span>nós levamos.</span>
        </h1>
        <p>Comida, compras, lojas ou uma encomenda. Tudo o que precisas, a mover-se contigo.</p>
      </div>
      <div className="welcome-actions">
        <button className="btn-primary" onClick={onEnter}>
          Entrar <ArrowRight size={18} />
        </button>
        <button className="btn-secondary" onClick={onCreate}>
          Criar conta
        </button>
        <button className="guest-link" onClick={onGuest}>
          Continuar como convidado
        </button>
      </div>
    </main>
  );
}
