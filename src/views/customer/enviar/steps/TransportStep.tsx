import { Bike, Car, Check, Lock, Truck } from 'lucide-react';
import { formatAngolaKz } from '@/utils/format';
import type { ParcelVehicleType } from '@/types';
import type { ParcelOptionWithEstimate, ParcelPlan } from '../types';

const icons: Record<ParcelVehicleType, typeof Bike> = {
  motorcycle: Bike,
  three_wheeler: Bike,
  car: Car,
  van: Truck,
};

type Props = {
  plan: ParcelPlan | null;
  selected: ParcelOptionWithEstimate | null;
  onSelect: (option: ParcelOptionWithEstimate | null) => void;
};

export function TransportStep({ plan, selected, onSelect }: Props) {
  if (!plan || plan.options.length === 0) {
    return (
      <div className="step-content">
        <p className="input-hint">Escolhe o tamanho e a descrição da encomenda para vermos as opções.</p>
      </div>
    );
  }

  return (
    <div className="step-content">
      <p className="input-hint">
        Comparámos as opções para a tua encomenda. Escolhe como queremos entregar.
      </p>

      <div className="vehicle-options">
        {plan.options.map((option) => {
          const Icon = icons[option.type];
          const recommended = plan.recommended?.type === option.type;
          const selectable = option.eligible && option.available;
          const isSelected = selected?.type === option.type;
          return (
            <button
              key={option.type}
              className={`vehicle-option ${isSelected ? 'selected' : ''} ${
                recommended && selectable ? 'recommended' : ''
              } ${selectable ? '' : 'unavailable'}`}
              disabled={!selectable}
              onClick={() => onSelect(selectable ? option : null)}
            >
              <span className="vehicle-icon">
                {selectable ? <Icon size={24} /> : <Lock size={20} />}
              </span>
              <div className="vehicle-option-main">
                <strong>{option.label}</strong>
                <small className="vehicle-config">{option.configurationLabel}</small>
                {selectable && option.estimate ? (
                  <small className="vehicle-price">
                    ~{option.estimate.durationMinutes} min · {formatAngolaKz(option.estimate.total)}
                  </small>
                ) : null}
                {!selectable && (
                  <small className="vehicle-reason">
                    {option.eligible
                      ? option.unavailableReason
                      : option.issues[0]?.message ?? 'Não compatível com a encomenda.'}
                  </small>
                )}
              </div>
              {recommended && selectable && <span className="recommend-badge">Recomendado</span>}
              {isSelected && <Check size={18} className="vehicle-check" />}
            </button>
          );
        })}
      </div>

      {selected?.estimate?.isMockEstimate && (
        <p className="estimate-disclaimer">
          Estimativa simulada para demonstração. O valor final é confirmado quando o estafeta aceita.
        </p>
      )}
    </div>
  );
}