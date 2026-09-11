import { AlertTriangle } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <section className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <span className="confirm-icon">
          <AlertTriangle size={22} />
        </span>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <div className="confirm-actions">
          <button className="btn-secondary confirm-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={tone === 'danger' ? 'btn-danger confirm-btn' : 'btn-primary confirm-btn'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}