import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ClipboardList,
  Menu,
  Settings,
} from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import type { MerchantRepository } from '@/repositories/merchantTypes';

export type MerchantSection = 'pedidos' | 'cardapio' | 'relatorios' | 'config';

type Props = {
  repo: MerchantRepository;
  section: MerchantSection;
  onSection: (s: MerchantSection) => void;
  children: React.ReactNode;
};

const nav: { id: MerchantSection; label: string; icon: typeof ClipboardList }[] = [
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { id: 'cardapio', label: 'Cardapio', icon: BookOpen },
  { id: 'relatorios', label: 'Relatorios', icon: BarChart3 },
  { id: 'config', label: 'Configuracoes', icon: Settings },
];

export function MerchantLayout({ repo, section, onSection, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = repo.getProfile();
  const open = repo.isOpen();

  function handleNav(id: MerchantSection) {
    onSection(id);
    setMobileOpen(false);
  }

  return (
    <div className={`merchant-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <div className="merchant-backdrop" onClick={() => setMobileOpen(false)} />}
      <aside className={`merchant-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="merchant-sidebar-header">
          {!collapsed && <BrandMark className="logo-sm" />}
          <button className="merchant-sidebar-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Recolher sidebar">
            <ChevronLeft size={18} className={collapsed ? 'rotated' : ''} />
          </button>
        </div>
        <nav className="merchant-sidebar-nav">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              onClick={() => handleNav(id)}
              title={label}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>
        <div className="merchant-sidebar-footer">
          {!collapsed && (
            <div className="merchant-sidebar-identity">
              <span className="merchant-sidebar-avatar">{profile.initials}</span>
              <div>
                <strong>{profile.businessName}</strong>
                <small className={open ? 'status-open' : 'status-closed'}>
                  {open ? 'Aberto' : 'Fechado'}
                </small>
              </div>
            </div>
          )}
        </div>
      </aside>
      <div className="merchant-main">
        <header className="merchant-topbar">
          <button className="merchant-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            <Menu size={22} />
          </button>
          <div className="merchant-topbar-right">
            <span className={`merchant-status-pill ${open ? 'open' : 'closed'}`}>
              {open ? 'Aberto' : 'Fechado'}
            </span>
            <span className="merchant-topbar-avatar">{profile.initials}</span>
          </div>
        </header>
        <div className="merchant-content">
          {children}
        </div>
      </div>
    </div>
  );
}
