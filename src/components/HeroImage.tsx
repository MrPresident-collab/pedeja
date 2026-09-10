import { MapPin } from 'lucide-react';

export function HeroImage() {
  return (
    <div className="hero-photo" aria-hidden="true">
      <img
        src="/hero.webp"
        alt=""
        width={520}
        height={300}
        loading="lazy"
        decoding="async"
      />
      <span className="hero-badge">
        <MapPin size={14} fill="currentColor" /> LUANDA
      </span>
    </div>
  );
}
