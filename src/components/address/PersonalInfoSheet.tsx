import { Lock, MessageCircle } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { repositories } from '@/repositories';

type Props = { open: boolean; onClose: () => void; onSupport: () => void };

export function PersonalInfoSheet({ open, onClose, onSupport }: Props) {
  const profile = repositories.profile.getProfile();
  return (
    <BottomSheet open={open} onClose={onClose} eyebrow="A MINHA CONTA" title="Dados pessoais">
      <div className="sheet-content">
        <div className="profile-info-row">
          <span>Nome</span>
          <strong>{profile.name}</strong>
        </div>
        <div className="profile-info-row">
          <span>Telefone</span>
          <strong>{profile.phone}</strong>
        </div>
        <div className="profile-info-row">
          <span>Email</span>
          <strong>{profile.email}</strong>
        </div>
        <div className="sheet-mode">
          <span className="sheet-mode-icon">
            <Lock size={18} />
          </span>
          <p>Estes dados identificam-te. Por segurança, só podem ser alterados com verificação de identidade. Para atualizares, contacta o suporte.</p>
        </div>
        <button className="btn-secondary" onClick={onSupport}>
          <MessageCircle size={17} /> Contactar suporte
        </button>
      </div>
    </BottomSheet>
  );
}