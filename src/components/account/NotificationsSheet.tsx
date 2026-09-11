import { useState } from 'react';
import { BellRing, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { repositories } from '@/repositories';
import { setPromotionsEnabled } from '@/services/preferences';
import type { NotificationPreferences } from '@/repositories/types';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NotificationsSheet({ open, onClose }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => repositories.notification.getPreferences());

  function togglePromotions() {
    const next = !prefs.promotions;
    setPromotionsEnabled(next);
    setPrefs({ ...prefs, promotions: next });
  }

  return (
    <BottomSheet open={open} onClose={onClose} eyebrow="PREFERÊNCIAS" title="Notificações">
      <div className="sheet-content">
        <div className="profile-links">
          <div className="profile-link toggle-row">
            <span className="profile-link-icon"><BellRing size={17} /></span>
            <span>
              <strong>Atualizações dos pedidos</strong>
              <small>Estado dos teus pedidos e entregas</small>
            </span>
            <span className="chip chip-purple"><Lock size={9} /> Sempre ativo</span>
          </div>
          <div className="profile-link toggle-row">
            <span className="profile-link-icon"><ShieldCheck size={17} /></span>
            <span>
              <strong>Segurança e conta</strong>
              <small>Alertas de entrada e alterações</small>
            </span>
            <span className="chip chip-purple"><Lock size={9} /> Sempre ativo</span>
          </div>
          <div className="profile-link toggle-row">
            <span className="profile-link-icon"><Sparkles size={17} /></span>
            <span>
              <strong>Promoções e novidades</strong>
              <small>Ofertas e campanhas Pedejá</small>
            </span>
            <button
              className={`toggle ${prefs.promotions ? 'on' : ''}`}
              onClick={togglePromotions}
              aria-pressed={prefs.promotions}
              aria-label="Alternar promoções"
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        </div>

        <div className="sheet-mode">
          <span className="sheet-mode-icon"><BellRing size={18} /></span>
          <p>Pedidos e segurança são sempre ativos para nunca perderes uma entrega. As notificações por push chegam quando ligares o teu dispositivo — até lá, acompanhas tudo dentro da app.</p>
        </div>
      </div>
    </BottomSheet>
  );
}