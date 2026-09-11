import { Boxes, Check } from 'lucide-react';
import { formatAngolaKz } from '@/utils/format';
import { repositories } from '@/repositories';
import { parcelStatusLabel } from '@/services/parcel/labels';

type Props = {
  orderId: string;
  onTrack: () => void;
  onDone: () => void;
};

export function ParcelCreatedView({ orderId, onTrack, onDone }: Props) {
  const order = repositories.order.getById(orderId);
  const parcel = order?.parcel;

  return (
    <main className="page inner-page parcel-created">
      <div className="success-hero">
        <div className="success-check">
          <Check size={38} />
        </div>
        <p className="eyebrow">ENVIO CRIADO</p>
        <h1>Tudo pronto.</h1>
        <p className="input-hint">
          Estamos a procurar o melhor estafeta para a tua encomenda. Assim que estiver
          confirmado, vês o acompanhamento em tempo real.
        </p>
        <span className="order-id-chip">Envio {orderId}</span>
      </div>

      {parcel && (
        <div className="route-block parcel-success-route">
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
          <div className="confirm-row">
            <small>Entrega</small>
            <strong>{parcel.vehicle.configurationLabel}</strong>
          </div>
          <div className="confirm-row">
            <small>Estado</small>
            <strong>{parcelStatusLabel(parcel.status)}</strong>
          </div>
          <div className="confirm-row total">
            <small>Total estimado</small>
            <strong>{formatAngolaKz(parcel.estimate.total)}</strong>
          </div>
        </div>
      )}

      <div className="success-actions">
        <button className="btn-primary" onClick={onTrack}>
          <Boxes size={18} /> Acompanhar envio
        </button>
        <button className="btn-ghost" onClick={onDone}>
          Feito
        </button>
      </div>
    </main>
  );
}