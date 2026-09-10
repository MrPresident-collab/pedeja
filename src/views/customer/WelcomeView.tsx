import { ArrowRight, ChevronRight, MapPin } from 'lucide-react';
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

      <div className="welcome-hero-visual" aria-hidden="true">
        <div className="hero-visual-layer hero-skyline" />
        <div className="hero-visual-layer hero-road" />
        <div className="hero-visual-layer hero-rider">
          <svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-rider-svg">
            <circle cx="30" cy="55" r="11" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.85" />
            <circle cx="88" cy="55" r="11" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.85" />
            <path d="M30 55 L48 28 L72 28 L88 55" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
            <path d="M48 28 L55 55" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M62 28 L72 55" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <rect x="40" y="20" width="22" height="8" rx="3" fill="#fff" opacity="0.7" />
            <circle cx="60" cy="28" r="4" fill="#8A2BE2" />
            <rect x="64" y="18" width="10" height="12" rx="2" fill="#8A2BE2" opacity="0.5" />
            <path d="M90 50 L105 44 L108 40" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
            <path d="M92 55 L108 52 L110 48" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
          </svg>
        </div>
        <div className="hero-visual-layer hero-badge">
          <MapPin size={14} fill="currentColor" /> LUANDA
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
