import { Check, Loader2 } from 'lucide-react';
import { formatKz } from '@/utils/format';
import type { Address, ParcelEstimate, ParcelPackageDraft, ParcelRecipientDraft, PaymentMethod } from '@/types';
import type { ParcelVehicleOption } from '@/types';

type Props = {
  pickup: Address | null;
  destination: Address | null;
  recipient: ParcelRecipientDraft;
  pkg: ParcelPackageDraft;
  vehicleOption: ParcelVehicleOption | null;
  estimate: ParcelEstimate | null;
  paymentMethod: PaymentMethod;
  restrictionAcknowledged: boolean;
  onRestrictionChange: (acknowledged: boolean) => void;
  submitting: boolean;
  onSubmit: () => void;
};

const SIZE_LABELS = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' } as const;

export function ConfirmStep({
  pickup,
  destination,
  recipient,
  pkg,
  vehicleOption,
  estimate,
  paymentMethod,
  restrictionAcknowledged,
  onRestrictionChange,
  submitting,
  onSubmit,
}: Props) {
  const ready =
    pickup !== null &&
    destination !== null &&
    vehicleOption !== null &&
    estimate !== null &&
    restrictionAcknowledged;

  return (
    <div className="step-content">
      <div className="confirm-summary">
        <div className="confirm-row">
          <small>Recolha</small>
          <strong>{pickup ? `${pickup.label} · ${pickup.line}` : '—'}</strong>
        </div>
        <div className="confirm-row">
          <small>Destino</small>
          <strong>{destination ? `${destination.label} · ${destination.line}` : '—'}</strong>
        </div>
        <div className="confirm-row">
          <small>Quem recebe</small>
          <strong>{recipient.name} · {recipient.phone}</strong>
        </div>
        <div className="confirm-row">
          <small>Conteúdo</small>
          <strong>{pkg.description}</strong>
        </div>
        <div className="confirm-row">
          <small>Tamanho</small>
          <strong>{SIZE_LABELS[pkg.size]}</strong>
        </div>
        {pkg.approximateWeightKg != null && (
          <div className="confirm-row">
            <small>Peso estimado</small>
            <strong>{pkg.approximateWeightKg} kg</strong>
          </div>
        )}
        {pkg.isFragile && (
          <div className="confirm-row">
            <small>Frágil</small>
            <strong>Avisa no manuseamento</strong>
          </div>
        )}
        <div className="confirm-row">
          <small>Entrega</small>
          <strong>{vehicleOption ? `${vehicleOption.label} · ${vehicleOption.configurationLabel}` : '—'}</strong>
        </div>
        <div className="confirm-row">
          <small>Pagamento</small>
          <strong>{paymentMethod === 'cash' ? 'Dinheiro' : paymentMethod === 'multicaixa' ? 'Multicaixa' : paymentMethod}</strong>
        </div>
      </div>

      <div className="confirm-estimate">
        <div className="estimate-row">
          <span>Distância estimada</span>
          <strong>{estimate ? `${estimate.distanceKm.toFixed(1)} km` : '—'}</strong>
        </div>
        <div className="estimate-row total">
          <span>Total estimado</span>
          <strong>{estimate ? formatKz(estimate.total) : '—'}</strong>
        </div>
      </div>

      <button
        className={`restriction-check ${restrictionAcknowledged ? 'done' : ''}`}
        onClick={() => onRestrictionChange(!restrictionAcknowledged)}
        aria-pressed={restrictionAcknowledged}
      >
        <span className="restriction-box">{restrictionAcknowledged && <Check size={16} />}</span>
        <span>
          Confirmo que a encomenda não contém artigos perigosos, ilegais ou proibidos por lei.
        </span>
      </button>

      <button className="btn-primary step-submit" disabled={!ready || submitting} onClick={onSubmit}>
        {submitting ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> A criar envio...
          </>
        ) : (
          <>Confirmar envio <Check size={18} /></>
        )}
      </button>
    </div>
  );
}