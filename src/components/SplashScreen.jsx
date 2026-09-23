import { useState } from 'react';

const LUANDA_IMAGE =
  'https://images.pexels.com/photos/29568692/pexels-photo-29568692.jpeg?cs=srgb&dl=pexels-cardoso-lopes-lopes-2017574706-29568692.jpg&fm=jpg';

export default function SplashScreen({ onContinue }) {
  const [pressed, setPressed] = useState(false);

  const handleContinue = () => {
    setPressed(true);
    window.setTimeout(onContinue, 180);
  };

  return (
    <main
      className="pedeja-splash"
      aria-label="Pedejá"
      style={{ '--pedeja-purple': '#6D28D9' }}
    >
      <svg
        className="pedeja-splash__city"
        viewBox="0 0 430 932"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pedeja-city-tint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4C1D95" stopOpacity="0.92" />
            <stop offset="0.38" stopColor="#4C1D95" stopOpacity="0.42" />
            <stop offset="1" stopColor="#2E1065" stopOpacity="0.58" />
          </linearGradient>
        </defs>

        <image
          href={LUANDA_IMAGE}
          x="0"
          y="0"
          width="430"
          height="932"
          preserveAspectRatio="xMidYMid slice"
          style={{ filter: 'saturate(.78) contrast(1.04) brightness(.76)' }}
        />

        <rect
          x="0"
          y="0"
          width="430"
          height="932"
          fill="url(#pedeja-city-tint)"
        />
      </svg>

      <div className="pedeja-splash__wash" aria-hidden="true" />

      <section className="pedeja-splash__content">
        <div className="pedeja-splash__brand">
          <span>Pedejá</span><span className="pedeja-splash__dot">.</span>
        </div>

        <p className="pedeja-splash__tagline">A promessa que se move</p>
      </section>

      <button
        type="button"
        className={`pedeja-splash__next${pressed ? ' is-pressed' : ''}`}
        onClick={handleContinue}
        aria-label="Próximo"
      >
        <span>Proximo</span>
        <span className="pedeja-splash__arrow" aria-hidden="true">→</span>
      </button>
    </main>
  );
}
