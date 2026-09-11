import { Check, Package, Scale, ShieldCheck } from 'lucide-react';
import type { ParcelPackageDraft } from '@/types';
import type { ParcelSize } from '@/types';
import type { ParcelFieldErrors } from '@/services/parcel/validation';

type Props = {
  pkg: ParcelPackageDraft;
  onChange: (pkg: ParcelPackageDraft) => void;
  restrictionAcknowledged: boolean;
  onRestrictionChange: (acknowledged: boolean) => void;
  errors?: ParcelFieldErrors;
};

const sizes: { id: ParcelSize; label: string; detail: string }[] = [
  { id: 'pequeno', label: 'Pequeno', detail: 'Documentos, pequenas encomendas' },
  { id: 'medio', label: 'Médio', detail: 'Caixas, sacos de compras' },
  { id: 'grande', label: 'Grande', detail: 'Móveis, electrodomésticos' },
];

export function PackageStep({
  pkg,
  onChange,
  restrictionAcknowledged,
  onRestrictionChange,
  errors,
}: Props) {
  return (
    <div className="step-content">
      <p className="field-label">
        <span>O que envias? *</span>
        <div className="input-group">
          <Package className="input-icon" size={18} />
          <input
            value={pkg.description}
            onChange={(e) => onChange({ ...pkg, description: e.target.value })}
            placeholder="Ex.: Documentos do trabalho"
          />
        </div>
        {errors?.description && <small className="field-error">{errors.description}</small>}
      </p>

      <p className="step-section-title">Tamanho *</p>
      <div className="size-options">
        {sizes.map((s) => (
          <button
            key={s.id}
            className={`size-option ${pkg.size === s.id ? 'selected' : ''}`}
            onClick={() => onChange({ ...pkg, size: s.id })}
          >
            <div>
              <strong>{s.label}</strong>
              <small>{s.detail}</small>
            </div>
            {pkg.size === s.id && <Check size={20} />}
          </button>
        ))}
      </div>

      <p className="field-label">
        <span>Peso estimado <small>(opcional)</small></span>
        <div className="input-group">
          <Scale className="input-icon" size={18} />
          <input
            type="number"
            min={0}
            step={0.5}
            value={pkg.approximateWeightKg ?? ''}
            placeholder="Em quilogramas"
            onChange={(e) =>
              onChange({
                ...pkg,
                approximateWeightKg: Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <small className="input-hint">Ajuda a escolher o melhor veículo.</small>
      </p>

      <p className="field-label">
        <span>Conteúdo frágil?</span>
        <div className={`toggle-row ${pkg.isFragile ? 'on' : ''}`}>
          <span>
            Imagens, vidro, equipamentos <small>Requer cabine fechada (exceto pequenos).</small>
          </span>
          <button
            className={`toggle ${pkg.isFragile ? 'on' : ''}`}
            onClick={() => onChange({ ...pkg, isFragile: !pkg.isFragile })}
            aria-pressed={Boolean(pkg.isFragile)}
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      </p>

      <p className="field-label">
        <span>Notas <small>(opcional)</small></span>
        <textarea
          className="rating-comment"
          rows={2}
          value={pkg.notes ?? ''}
          onChange={(e) => onChange({ ...pkg, notes: e.target.value })}
          placeholder="Ex.: Não dobrar."
        />
      </p>

      <button
        className={`restriction-check ${restrictionAcknowledged ? 'done' : ''}`}
        onClick={() => onRestrictionChange(!restrictionAcknowledged)}
        aria-pressed={restrictionAcknowledged}
      >
        <span className="restriction-box">{restrictionAcknowledged && <Check size={16} />}</span>
        <span>
          <ShieldCheck size={18} />
          Confirmo que a encomenda não contém artigos perigosos, ilegais ou proibidos por lei.
        </span>
      </button>
      {errors?.restriction && <small className="field-error">{errors.restriction}</small>}
    </div>
  );
}