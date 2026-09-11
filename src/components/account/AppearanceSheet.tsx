import { useState, type ReactNode } from 'react';
import { Check, MonitorSmartphone, Moon, Sun } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { repositories } from '@/repositories';
import { setAppearance } from '@/services/preferences';
import type { AppearanceMode } from '@/repositories/types';

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

const options: { mode: AppearanceMode; icon: ReactNode; title: string; desc: string }[] = [
  { mode: 'auto', icon: <MonitorSmartphone size={19} />, title: 'Automático', desc: 'Acompanha o tema do teu dispositivo' },
  { mode: 'light', icon: <Sun size={19} />, title: 'Claro', desc: 'Sempre claro, em qualquer altura' },
  { mode: 'dark', icon: <Moon size={19} />, title: 'Escuro', desc: 'Sempre escuro, para usar à noite' },
];

export function AppearanceSheet({ open, onClose, onChanged }: Props) {
  const [mode, setMode] = useState<AppearanceMode>(() => repositories.settings.getAppearance());

  function select(next: AppearanceMode) {
    if (mode === next) return;
    setAppearance(next);
    setMode(next);
    onChanged();
  }

  return (
    <BottomSheet open={open} onClose={onClose} eyebrow="PREFERÊNCIAS" title="Aparência">
      <div className="sheet-content">
        <div className="segment-options">
          {options.map((o) => (
            <button
              key={o.mode}
              className={`segment-option ${mode === o.mode ? 'selected' : ''}`}
              onClick={() => select(o.mode)}
              aria-pressed={mode === o.mode}
            >
              <span className="profile-link-icon">{o.icon}</span>
              <span>
                <strong>{o.title}</strong>
                <small>{o.desc}</small>
              </span>
              {mode === o.mode && <span className="segment-check"><Check size={13} /></span>}
            </button>
          ))}
        </div>

        <div className="sheet-mode">
          <span className="sheet-mode-icon"><MonitorSmartphone size={18} /></span>
          <p>O tema aplica-se em toda a app no momento em que escolhes. No modo automático, segue a preferência do teu dispositivo.</p>
        </div>
      </div>
    </BottomSheet>
  );
}