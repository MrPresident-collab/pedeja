import { Check, Timer } from 'lucide-react';
import { formatKz } from '@/utils/format';
import { repositories } from '@/repositories';
import type { ParcelEstimate, PaymentMethod } from '@/types';
import type { ParcelVehicleOption } from '@/types';

type Props = {
  vehicleOption: ParcelVehicleOption | null;
  estimate: ParcelEstimate | null;
  paymentMethod: PaymentMethod;
  onPaymentChange: (method: PaymentMethod) => void;
};

const METHOD_ICONS = { cash: 'Dinheiro', multicaixa: 'Multicaixa', future: 'Mais métodos' } as const;

export function EstimateStep({
  vehicleOption,
  estimate,
  paymentMethod,
  onPaymentChange,
}: Props) {
  const methods = repositories.payment.listMethods().filter((m) => m.available);

  return (
    <div className="step-content">
      {estimate && vehicleOption ? (
        <>
          <div className="confirm-estimate">
            <div className="estimate-row">
              <span>Distância estimada</span>
              <strong>{estimate.distanceKm.toFixed(1)} km</strong>
            </div>
            <div className="estimate-row">
              <span>Duração estimada</span>
              <strong>
                <Timer size={15} /> ~{estimate.durationMinutes} min
              </strong>
            </div>
            {estimate.adjustments.map((adjustment) => (
              <div className="estimate-row" key={adjustment.code}>
                <span>{adjustment.label}</span>
                <strong>{adjustment.amount > 0 ? formatKz(adjustment.amount) : '—'}</strong>
              </div>
            ))}
            <div className="estimate-row total">
              <span>Total estimado</span>
              <strong>{formatKz(estimate.total)}</strong>
            </div>
          </div>

          <p className="step-section-title">Como pagas?</p>
          <div className="payment-pills">
            {methods.map((method) => (
              <button
                key={method.id}
                className={`payment-pill ${paymentMethod === method.id ? 'selected' : ''}`}
                onClick={() => onPaymentChange(method.id)}
              >
                <span>{METHOD_ICONS[method.id]}</span>
                {paymentMethod === method.id && <Check size={16} />}
              </button>
            ))}
          </div>
          {paymentMethod === 'multicaixa' && (
            <p className="input-hint">O pagamento é confirmado numa app parceira, à entrega.</p>
          )}

          {estimate.isMockEstimate && (
            <p className="estimate-disclaimer">
              Estimativa simulada (demonstração). A distância real é medida quando o estafeta
              aceita o envio — o valor pode variar ligeiramente.
            </p>
          )}
        </>
      ) : (
        <p className="input-hint">Seleciona um veículo para ver a estimativa.</p>
      )}
    </div>
  );
}