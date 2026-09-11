import { PackageOpen } from 'lucide-react';

export function LandingStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="step-content enviar-landing-content">
      <div className="enviar-hero">
        <div className="enviar-hero-icon">
          <PackageOpen size={34} />
        </div>
        <p className="eyebrow">ENVIAR </p>
        <h1>Entregamos por ti</h1>
        <p className="input-hint">
          Envia documentos, pacotes ou compras para qualquer ponto da cidade.
          Escolhes a recolha, o destino e nós tratamos do resto.
        </p>
      </div>

      <div className="enviar-perks">
        <div className="enviar-perk">
          <strong>Recolha onde quiseres</strong>
          <small>Passamos no teu ponto de partida.</small>
        </div>
        <div className="enviar-perk">
          <strong>Preço claro antecipado</strong>
          <small>Vês a estimativa antes de confirmar.</small>
        </div>
        <div className="enviar-perk">
          <strong>Acompanhamento em tempo real</strong>
          <small>Sabes onde está a tua encomenda.</small>
        </div>
      </div>

      <button className="btn-primary enviar-start" onClick={onStart}>
        Criar envio
      </button>
    </div>
  );
}