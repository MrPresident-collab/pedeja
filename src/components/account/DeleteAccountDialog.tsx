import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { requestAccountDeletion } from '@/services/account';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DeleteAccountDialog({ open, onClose }: Props) {
  const [stage, setStage] = useState<'confirm' | 'sending' | 'sent'>('confirm');

  async function handleConfirm() {
    if (stage === 'sending') return;
    setStage('sending');
    const result = await requestAccountDeletion();
    setStage(result.ok ? 'sent' : 'confirm');
  }

  function handleClose() {
    onClose();
    setStage('confirm');
  }

  return (
    <>
      <ConfirmDialog
        open={open && stage !== 'sent'}
        title="Eliminar a tua conta?"
        message="Vais perder o acesso ao Pedejá nesta app. O teu histórico de pedidos fica preservado para efeitos de registo."
        confirmLabel={stage === 'sending' ? 'A enviar…' : 'Eliminar conta'}
        tone="danger"
        onConfirm={() => void handleConfirm()}
        onCancel={handleClose}
      />
      {open && stage === 'sent' && (
        <div className="confirm-backdrop" onClick={handleClose}>
          <section className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <span className="confirm-icon success">
              <ShieldCheck size={22} />
            </span>
            <h3>Pedido de eliminação enviado</h3>
            <p>Simulámos o pedido de eliminação da tua conta. Nenhum dado foi realmente apagado e o teu histórico de pedidos continua disponível.</p>
            <div className="confirm-actions">
              <button className="btn-primary confirm-btn" onClick={handleClose}>
                Percebido
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}