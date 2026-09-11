import { Camera, FolderOpen, Info, MapPin, Bell } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';

type Props = {
  open: boolean;
  onClose: () => void;
};

const rows = [
  { icon: <MapPin size={17} />, title: 'Localização', desc: 'Usada durante a entrega, para o estafeta chegar até ti.', chip: 'Por contexto' },
  { icon: <Bell size={17} />, title: 'Notificações', desc: 'Avisos dos teus pedidos, quando ativares.', chip: 'Por configurar' },
  { icon: <Camera size={17} />, title: 'Câmara', desc: 'Fotografias de prova nos envios.', chip: 'Por contexto' },
  { icon: <FolderOpen size={17} />, title: 'Fotos e ficheiros', desc: 'Fotos das tuas encomendas, quando precisares.', chip: 'Por contexto' },
];

export function PermissionsSheet({ open, onClose }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} eyebrow="INFORMAÇÃO" title="Permissões">
      <div className="sheet-content">
        <div className="profile-links">
          {rows.map((r) => (
            <div className="profile-link" key={r.title}>
              <span className="profile-link-icon">{r.icon}</span>
              <span>
                <strong>{r.title}</strong>
                <small>{r.desc}</small>
              </span>
              <span className="chip chip-purple">{r.chip}</span>
            </div>
          ))}
        </div>

        <div className="sheet-mode">
          <span className="sheet-mode-icon"><Info size={18} /></span>
          <p>Neste momento não pedimos nenhuma permissão do dispositivo. Quando houver funcionalidades que precisem, pedimos sempre em contexto, nunca em segundo plano.</p>
        </div>
      </div>
    </BottomSheet>
  );
}