import { ArrowRight, ChevronRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { HeroImage } from '@/components/HeroImage';

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

      <HeroImage />

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
