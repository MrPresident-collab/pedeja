import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';

type Props = { onNext: () => void };

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function SplashView({ onNext }: Props) {
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [riderVisible, setRiderVisible] = useState(false);

  useEffect(() => {
    if (prefersReduced) {
      setTaglineVisible(true);
      setRiderVisible(true);
      return;
    }
    const t1 = setTimeout(() => setTaglineVisible(true), 400);
    const t2 = setTimeout(() => setRiderVisible(true), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <main className="onboarding splash-screen">
      <div className="splash-center">
        <Logo dark size="lg" />
        <p className={`splash-tagline ${taglineVisible ? 'visible' : ''}`}>
          A promessa que se move.
        </p>
      </div>

      <div className={`splash-rider-track ${riderVisible ? 'visible' : ''}`} aria-hidden="true">
        <svg
          className="splash-rider"
          viewBox="0 0 80 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="14" cy="30" r="8" stroke="#8A2BE2" strokeWidth="2.5" fill="none" />
          <circle cx="60" cy="30" r="8" stroke="#8A2BE2" strokeWidth="2.5" fill="none" />
          <path
            d="M14 30 L30 14 L52 14 L60 30"
            stroke="#8A2BE2"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M30 14 L36 30"
            stroke="#8A2BE2"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M42 14 L52 30"
            stroke="#8A2BE2"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="24" y="8" width="16" height="6" rx="2" fill="#8A2BE2" opacity="0.8" />
          <circle cx="40" cy="14" r="3" fill="#8A2BE2" />
          <path
            d="M62 26 L72 22 L74 20"
            stroke="#8A2BE2"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M64 30 L74 28 L76 26"
            stroke="#8A2BE2"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.25"
          />
        </svg>
      </div>

      <button className="onboarding-next" onClick={onNext}>
        Próximo
      </button>
    </main>
  );
}
