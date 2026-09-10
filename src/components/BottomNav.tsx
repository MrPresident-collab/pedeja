import { Home, Compass, Receipt, UserRound } from 'lucide-react';

export type Tab = 'home' | 'explore' | 'orders' | 'profile';

type Props = {
  tab: Tab;
  onChange: (tab: Tab) => void;
  badge?: number;
};

const items: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'explore', label: 'Explorar', icon: Compass },
  { id: 'orders', label: 'Pedidos', icon: Receipt },
  { id: 'profile', label: 'Perfil', icon: UserRound },
];

export function BottomNav({ tab, onChange, badge }: Props) {
  return (
    <nav className="bottom-nav">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={tab === id ? 'active' : ''}
          onClick={() => onChange(id)}
        >
          <Icon size={21} strokeWidth={tab === id ? 2.4 : 1.8} />
          <span>{label}</span>
          {id === 'orders' && badge ? <i className="nav-badge">{badge}</i> : null}
        </button>
      ))}
    </nav>
  );
}
