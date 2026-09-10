import { Bike, Briefcase, ShieldCheck, ShoppingCart } from 'lucide-react';

const surfaces = [
  { id: 'customer', label: 'Customer', desc: 'Customer-facing app', icon: ShoppingCart, path: '/customer' },
  { id: 'estafeta', label: 'Estafeta', desc: 'Delivery partner interface', icon: Bike, path: '/estafeta' },
  { id: 'merchant', label: 'Merchant', desc: 'Merchant dashboard', icon: Briefcase, path: '/merchant' },
  { id: 'operations', label: 'Operations', desc: 'Internal staff preview', icon: ShieldCheck, path: '/operations' },
];

export function DevSwitcherView() {
  return (
    <main className="dev-switcher">
      <header className="dev-switcher-header">
        <span className="dev-brand">
          <span className="brand-name">Pedejá</span>
          <span className="brand-dot">.</span>
        </span>
        <p className="eyebrow">DEVELOPMENT</p>
        <h1>Escolhe a interface</h1>
        <p className="dev-subtitle">Navegação de desenvolvimento — não é autorização.</p>
      </header>

      <div className="dev-surface-list">
        {surfaces.map(({ id, label, desc, icon: Icon, path }) => (
          <a key={id} href={path} className="dev-surface-card">
            <span className="dev-surface-icon">
              <Icon size={22} />
            </span>
            <span className="dev-surface-info">
              <strong>{label}</strong>
              <small>{desc}</small>
            </span>
          </a>
        ))}
      </div>

      <p className="dev-note">
        Em produção, cada interface tem o seu próprio domínio e autorização server-side.
        Esta página é apenas para navegação local de desenvolvimento.
      </p>
    </main>
  );
}
