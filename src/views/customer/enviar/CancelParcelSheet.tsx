import { useState } from 'react';
import { BottomSheet } from '@/components/BottomSheet';

type Props = {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function CancelParcelSheet({ open, orderId, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');

  function resetAndClose() {
    setReason('');
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={resetAndClose} eyebrow="CANCELAR ENVIO" title="Cancelar este envio?">
      <div className="sheet-content">
        <p className="input-hint">
          O envio <strong>{orderId}</strong> será cancelado e o estafeta deixa de ser notificado.
        </p>

        <p className="field-label">
          <span>Porquê? <small>(opcional)</small></span>
          <textarea
            className="rating-comment"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: Já não preciso do envio."
          />
        </p>

        <button className="btn-primary" onClick={() => onConfirm(reason)}>
          Cancelar envio
        </button>
        <button className="btn-secondary" onClick={resetAndClose}>
          Manter envio
        </button>
      </div>
    </BottomSheet>
  );
}