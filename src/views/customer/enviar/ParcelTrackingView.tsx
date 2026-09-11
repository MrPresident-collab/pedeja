import { useState } from 'react';
import { ArrowLeft, MessageCircle, Navigation, Package, Timer } from 'lucide-react';
import { repositories } from '@/repositories';
import { formatAngolaKz } from '@/utils/format';
import { parcelStatusLabel } from '@/services/parcel/labels';
import { cancelParcelOrder } from '@/services/parcel/cancelParcel';
import { CancelParcelSheet } from './CancelParcelSheet';
import { showToast } from '@/components/toastStore';

const CANCELLABLE = new Set([
  'criado',
  'a_procurar_estafeta',
  'estafeta_atribuido',
  'a_caminho_recolha',
  'chegou_recolha',
]);

type Props = {
  orderId: string;
  onBack: () => void;
  onCancelled: (orderId: string) => void;
};

export function ParcelTrackingView({ orderId, onBack, onCancelled }: Props) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [, setTick] = useState(0);
  const order = repositories.order.getById(orderId);
  const parcel = order?.parcel;

  if (!order || !parcel) {
    return (
      <main className="page inner-page">
        <header className="category-header">
          <button className="icon-button back-button" onClick={onBack} aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="eyebrow">ENVIO</p>
            <h1>Acompanhar envio</h1>
          </div>
        </header>
        <p className="input-hint">Não encontrámos este envio.</p>
      </main>
    );
  }

  const cancellable = CANCELLABLE.has(parcel.status);
  const cancelled = parcel.status === 'cancelado';

  function confirmCancel(reason: string) {
    const result = cancelParcelOrder(orderId, reason);
    setCancelOpen(false);
    if (result.ok) {
      showToast('Envio cancelado.');
      onCancelled(orderId);
    } else {
      showToast(result.message);
    }
    setTick((t) => t + 1);
  }

  function whatsapp() {
    window.open(
      `https://wa.me/+244900000000?text=${encodeURIComponent(`Olá Pedejá, preciso de ajuda com o envio ${orderId}.`)}`,
      '_blank',
    );
  }

  return (
    <main className="page inner-page parcel-tracking">
      <header className="category-header">
        <button className="icon-button back-button" onClick={onBack} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">ENVIO · {order.id}</p>
          <h1>Acompanhar envio</h1>
        </div>
      </header>

      <div className={`tracking-hero ${cancelled ? 'cancelled' : ''}`}>
        <span className="tracking-status-dot" />
        <div>
          <strong>{parcelStatusLabel(parcel.status)}</strong>
          <small>
            {cancelled
              ? 'Este envio foi cancelado.'
              : `Encomenda: ${parcel.package.description}`}
          </small>
        </div>
      </div>

      <div className="route-block tracking-route">
        <div className="route-block-top">
          <span className="route-pin">A</span>
          <div className="route-block-main">
            <small>Recolha</small>
            <strong>{parcel.pickup.label}</strong>
            <small>{parcel.pickup.line}</small>
          </div>
        </div>
        <div className="route-block-top">
          <span className="route-pin route-pin-b">B</span>
          <div className="route-block-main">
            <small>Destino</small>
            <strong>{parcel.destination.label}</strong>
            <small>{parcel.destination.line}</small>
          </div>
        </div>
      </div>

      {parcel.estimate && (
        <div className="tracking-meta">
          <div className="tracking-meta-item">
            <Timer size={16} />
            <span>~{parcel.estimate.durationMinutes} min</span>
          </div>
          <div className="tracking-meta-item">
            <Navigation size={16} />
            <span>{parcel.estimate.distanceKm.toFixed(1)} km</span>
          </div>
          <div className="tracking-meta-item">
            <Package size={16} />
            <span>{parcel.vehicle.configurationLabel}</span>
          </div>
        </div>
      )}

      <p className="step-section-title">Trajeto da encomenda</p>
      <div className="tracking-timeline">
        {parcel.timeline.map((event, i) => (
          <div
            key={`${event.status}-${i}`}
            className={`timeline-item done ${i === parcel.timeline.length - 1 ? 'active' : ''}`}
          >
            <span className="timeline-marker">{event.at ? '✓' : ''}</span>
            <span>{event.label}</span>
            <time>{formatParcelTime(event.at)}</time>
          </div>
        ))}
      </div>

      {!cancelled && (
        <>
          <div className="confirm-estimate tracking-price">
            <div className="estimate-row">
              <span>Quem recebe</span>
              <strong>
                {parcel.recipient.name} · {parcel.recipient.phone}
              </strong>
            </div>
            <div className="estimate-row total">
              <span>Total estimado</span>
              <strong>{formatAngolaKz(parcel.estimate.total)}</strong>
            </div>
          </div>

          <div className="order-actions tracking-actions">
            <button className="whatsapp-action" onClick={whatsapp}>
              <MessageCircle size={15} /> Suporte WhatsApp
            </button>
          </div>

          {cancellable && (
            <button className="cancel-send-action" onClick={() => setCancelOpen(true)}>
              Cancelar envio
            </button>
          )}
        </>
      )}

      <CancelParcelSheet
        open={cancelOpen}
        orderId={orderId}
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
      />
      <div className="bottom-space" />
    </main>
  );
}

function formatParcelTime(at: string): string {
  if (!at) return '—';
  const now = new Date();
  const date = new Date(at);
  const diffMin = Math.round((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin} min`;
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}