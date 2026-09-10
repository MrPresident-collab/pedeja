import { Home, Wallet, History, UserRound } from 'lucide-react';

export type RiderTab = 'inicio' | 'carteira' | 'historico' | 'perfil';

type Props = {
  tab: RiderTab;
  onChange: (tab: RiderTab) => void;
};

const items: { id: RiderTab; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'carteira', label: 'Carteira', icon: Wallet },
  { id: 'historico', label: 'Historico', icon: History },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
];

export function RiderBottomNav({ tab, onChange }: Props) {
  return (
    <nav className="bottom-nav rider-nav">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={tab === id ? 'active' : ''}
          onClick={() => onChange(id)}
        >
          <Icon size={21} strokeWidth={tab === id ? 2.4 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
