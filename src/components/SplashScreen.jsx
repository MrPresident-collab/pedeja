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
          <clipPath id="pedeja-luanda-ribbon" clipPathUnits="userSpaceOnUse">
            <path
              d="M0 248
                 C55 250 94 284 126 350
                 C165 431 213 505 280 548
                 C327 578 378 594 430 602
                 L430 932
                 L0 932 Z"
            />
          </clipPath>

          <linearGradient id="pedeja-city-tint" x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#6D28D9" stopOpacity="0.30" />
            <stop offset="0.42" stopColor="#5B21B6" stopOpacity="0.50" />
            <stop offset="1" stopColor="#2E1065" stopOpacity="0.72" />
          </linearGradient>

          <linearGradient id="pedeja-ribbon-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6D28D9" stopOpacity="0.88" />
            <stop offset="0.72" stopColor="#6D28D9" stopOpacity="0.12" />
            <stop offset="1" stopColor="#6D28D9" stopOpacity="0" />
          </linearGradient>
        </defs>

        <image
          href={LUANDA_IMAGE}
          x="0"
          y="210"
          width="430"
          height="722"
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#pedeja-luanda-ribbon)"
          style={{ filter: 'saturate(.72) contrast(1.05) brightness(.72)' }}
        />

        <path
          d="M0 248
             C55 250 94 284 126 350
             C165 431 213 505 280 548
             C327 578 378 594 430 602
             L430 932
             L0 932 Z"
          fill="url(#pedeja-city-tint)"
        />

        <path
          d="M0 248
             C55 250 94 284 126 350
             C165 431 213 505 280 548
             C327 578 378 594 430 602"
          fill="none"
          stroke="url(#pedeja-ribbon-edge)"
          strokeWidth="22"
          strokeLinecap="round"
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
