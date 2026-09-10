import { useState } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Megaphone,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import type { OperationsRepository } from '@/repositories/operationsTypes';

export type OpsSection =
  | 'overview'
  | 'pedidos'
  | 'entregadores'
  | 'receita'
  | 'clientes'
  | 'relatorios'
  | 'config';

type Props = {
  repo: OperationsRepository;
  section: OpsSection;
  onSection: (s: OpsSection) => void;
  children: React.ReactNode;
};

const nav: { id: OpsSection; label: string; icon: typeof ClipboardList }[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { id: 'entregadores', label: 'Entregadores', icon: Users },
  { id: 'receita', label: 'Receita', icon: Wallet },
  { id: 'clientes', label: 'Clientes', icon: Megaphone },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'config', label: 'Configurações', icon: Settings },
];

export function OperationsLayout({ repo, section, onSection, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const operator = repo.getOperator();

  function handleNav(id: OpsSection) {
    onSection(id);
    setMobileOpen(false);
  }

  return (
    <div className={`ops-shell ${collapsed ? 'ops-collapsed' : ''}`}>
      {mobileOpen && <div className="ops-backdrop" onClick={() => setMobileOpen(false)} />}
      <aside className={`ops-sidebar ${mobileOpen ? 'ops-mobile-open' : ''}`}>
        <div className="ops-sidebar-header">
          <BrandMark className="ops-brand on-dark" />
          {!collapsed && <span className="ops-brand-sub">OPERATIONS</span>}
          <button className="ops-sidebar-collapse" onClick={() => setCollapsed(!collapsed)} aria-label="Recolher sidebar">
            {collapsed ? <ChevronLeft size={18} className="ops-rotated" /> : <ChevronLeft size={18} />}
          </button>
          <button className="ops-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <nav className="ops-sidebar-nav">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={section === id ? 'active' : ''} onClick={() => handleNav(id)} title={label}>
              <Icon size={19} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className="ops-sidebar-bottom">
          {!collapsed && (
            <button className="ops-sidebar-help" onClick={() => undefined} title="Ajuda interna">
              <HelpCircle size={17} />
              <span>Centro de operações</span>
            </button>
          )}
          <div className="ops-sidebar-operator">
            <span className="ops-avatar">{operator.initials}</span>
            {!collapsed && (
              <div>
                <strong>{operator.name}</strong>
                <small>{operator.role}</small>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="ops-main">
        <header className="ops-header">
          <button className="ops-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            <Menu size={21} />
          </button>
          <div className="ops-header-context">
            <h1>{nav.find((n) => n.id === section)?.label}</h1>
            <span>Hoje · Luanda</span>
          </div>
          <div className="ops-header-right">
            <span className="ops-env-badge">DEVELOPMENT PREVIEW</span>
            <button className="ops-notification-bell" aria-label="Notificações">
              <span className="ops-notification-dot" />
            </button>
            <span className="ops-header-avatar">{operator.initials}</span>
          </div>
        </header>
        <div className="ops-content">{children}</div>
      </div>
    </div>
  );
}