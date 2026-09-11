import { useState } from 'react';
import { MapPin, Navigation, Phone, User } from 'lucide-react';
import { AddressSheet } from '@/components/address/AddressSheet';
import { repositories } from '@/repositories';
import { showToast } from '@/components/toastStore';
import type { Address, ParcelRecipientDraft } from '@/types';
import type { ParcelFieldErrors } from '@/services/parcel/validation';

type Props = {
  destination: Address | null;
  onChange: (address: Address | null) => void;
  recipient: ParcelRecipientDraft;
  onRecipientChange: (recipient: ParcelRecipientDraft) => void;
  errors?: ParcelFieldErrors;
};

export function DestinationStep({
  destination,
  onChange,
  recipient,
  onRecipientChange,
  errors,
}: Props) {
  const [open, setOpen] = useState(false);
  const addresses = repositories.location.listAddresses();

  return (
    <div className="step-content">
      {addresses.length > 0 && (
        <>
          <p className="step-section-title">Destino rápido</p>
          <div className="quick-addresses">
            {addresses.map((address) => (
              <button
                key={address.id}
                className={`quick-address ${destination?.id === address.id ? 'selected' : ''}`}
                onClick={() => {
                  onChange(address);
                  showToast(`Destino: ${address.label}.`);
                }}
              >
                <MapPin size={16} />
                <span>
                  <strong>{address.label}</strong>
                  <small>{address.line}</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <button className="btn-secondary route-change" onClick={() => setOpen(true)}>
        <Navigation size={18} /> {destination ? 'Escolher outro destino' : 'Escolher destino'}
      </button>

      {destination && (
        <div className="route-block">
          <div className="route-block-top">
            <span className="route-pin route-pin-b">B</span>
            <div className="route-block-main">
              <strong>{destination.label}</strong>
              <small>{destination.line}</small>
            </div>
          </div>
        </div>
      )}

      <p className="step-section-title">Quem recebe? <small>(obrigatório)</small></p>

      <p className="field-label">
        <span>Nome</span>
        <div className="input-group">
          <User className="input-icon" size={18} />
          <input
            value={recipient.name}
            onChange={(e) => onRecipientChange({ ...recipient, name: e.target.value })}
            placeholder="Nome do destinatário"
          />
        </div>
        {errors?.recipientName && <small className="field-error">{errors.recipientName}</small>}
      </p>

      <p className="field-label">
        <span>Telefone</span>
        <div className="input-group">
          <Phone className="input-icon" size={18} />
          <input
            value={recipient.phone}
            onChange={(e) => onRecipientChange({ ...recipient, phone: e.target.value })}
            placeholder="+244 9xx xxx xxx"
            inputMode="tel"
          />
        </div>
        {errors?.recipientPhone && <small className="field-error">{errors.recipientPhone}</small>}
        <small className="input-hint">Só usamos para contactar quem recebe.</small>
      </p>

      <p className="field-label">
        <span>Instruções <small>(opcional)</small></span>
        <textarea
          className="rating-comment"
          rows={2}
          value={recipient.instructions ?? ''}
          onChange={(e) => onRecipientChange({ ...recipient, instructions: e.target.value })}
          placeholder="Ex.: Entregar ao porteiro, tocar duas vezes."
        />
      </p>

      <AddressSheet
        open={open}
        selectMode
        eyebrow="ENTREGAR EM"
        title="Escolhe o destino"
        confirmLabel="Fechar"
        onClose={() => setOpen(false)}
        onSelect={onChange}
        onChanged={() => undefined}
      />
    </div>
  );
}