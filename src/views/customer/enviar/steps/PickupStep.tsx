import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { AddressSheet } from '@/components/address/AddressSheet';
import { repositories } from '@/repositories';
import type { Address } from '@/types';

type Props = {
  pickup: Address | null;
  onChange: (address: Address | null) => void;
};

export function PickupStep({ pickup, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = pickup ?? repositories.location.getDefaultAddress();

  function refresh() {
    const current = repositories.location.getDefaultAddress();
    if (pickup?.id !== current?.id) onChange(current);
  }

  return (
    <div className="step-content">
      {selected ? (
        <div className="route-block">
          <div className="route-block-top">
            <span className="route-pin">A</span>
            <div className="route-block-main">
              <strong>{selected.label}</strong>
              <small>{selected.line}</small>
              {selected.landmark && <small className="route-landmark">{selected.landmark}</small>}
            </div>
          </div>

          <div className="confirm-row">
            <small>Bairro</small>
            <strong>{selected.neighborhood || '—'}</strong>
          </div>
          <div className="confirm-row">
            <small>Instruções</small>
            <strong>{selected.deliveryInstructions || '—'}</strong>
          </div>
        </div>
      ) : (
        <div className="address-empty">
          <MapPin size={20} />
          <p>Ainda não temos um endereço de recolha.</p>
        </div>
      )}

      <button className="btn-secondary route-change" onClick={() => setOpen(true)}>
        <MapPin size={18} /> Alterar ponto de recolha
      </button>

      <p className="input-hint">
        O estafeta vai até aqui buscar a encomenda. Usa o endereço atual por
        predefinição — podes mudar.
      </p>

      <AddressSheet
        open={open}
        eyebrow="RECOLHER EM"
        title="Ponto de recolha"
        confirmLabel="Usar este endereço"
        onClose={() => {
          setOpen(false);
          refresh();
        }}
        onChanged={refresh}
      />
    </div>
  );
}