import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, eyebrow, children }: Props) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {(title || eyebrow) && (
          <header>
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              {title && <h2>{title}</h2>}
            </div>
            <button className="icon-button" onClick={onClose}>
              <X size={20} />
            </button>
          </header>
        )}
        {children}
      </section>
    </div>
  );
}
