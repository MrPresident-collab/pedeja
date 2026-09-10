import { useState } from 'react';
import {
  Bike,
  ChevronRight,
  Clock3,
  FileCheck,
  FileWarning,
  Moon,
  MessageCircle,
  Scale,
  ScrollText,
  ShieldCheck,
  Star,
  Sun,
  Banknote,
  TrendingUp,
} from 'lucide-react';
import type { RiderRepository } from '@/repositories/riderTypes';
import { formatKz } from '@/utils/format';

type Props = {
  riderRepo: RiderRepository;
  onAction: (label: string) => void;
  onThemeChange?: () => void;
};

export function RiderProfileView({ riderRepo, onAction, onThemeChange }: Props) {
  const profile = riderRepo.getProfile();
  const stats = riderRepo.getStats();
  const [dark, setDark] = useState(() => riderRepo.isDarkTheme());
  const [cash, setCash] = useState(() => riderRepo.isCashOrders());

  function toggleDark() {
    const next = !dark;
    setDark(next);
    riderRepo.setDarkTheme(next);
    onThemeChange?.();
  }

  function toggleCash() {
    const next = !cash;
    setCash(next);
    riderRepo.setCashOrders(next);
  }

  return (
    <main className="page rider-page inner-page profile-page">
      <header className="inner-header">
        <p className="eyebrow">PERFIL</p>
        <h1>Ola, {profile.name.split(' ')[0]}.</h1>
        <p>A tua conta de estafeta.</p>
      </header>

      <div className="profile-identity">
        <span className="profile-avatar">{profile.initials}</span>
        <div>
          <strong>{profile.name}</strong>
          <small>{profile.phone} · desde {profile.joinedDate}</small>
        </div>
        <button>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rider-profile-stats">
        <div className="rider-profile-stat">
          <Star size={16} fill="currentColor" />
          <strong>{profile.rating}</strong>
          <small>Avaliacao</small>
        </div>
        <div className="rider-profile-stat">
          <Clock3 size={16} />
          <strong>{profile.onlineHours}h</strong>
          <small>Hoje</small>
        </div>
        <div className="rider-profile-stat">
          <Bike size={16} />
          <strong>{stats.totalDeliveries}</strong>
          <small>Entregas</small>
        </div>
        <div className="rider-profile-stat">
          <TrendingUp size={16} />
          <strong>{formatKz(stats.avgPerDelivery.amount)}</strong>
          <small>Media</small>
        </div>
      </div>

      <section className="profile-group">
        <p className="eyebrow">PREFERENCIAS</p>
        <div className="profile-links">
          <div className="profile-link rider-toggle-row">
            <span className="profile-link-icon">{dark ? <Moon size={17} /> : <Sun size={17} />}</span>
            <span>
              <strong>Tema escuro</strong>
              <small>{dark ? 'Ativado' : 'Desativado'}</small>
            </span>
            <button className={`rider-switch ${dark ? 'on' : ''}`} onClick={toggleDark} aria-label="Alternar tema">
              <span className="rider-switch-thumb" />
            </button>
          </div>
          <div className="profile-link rider-toggle-row">
            <span className="profile-link-icon"><Banknote size={17} /></span>
            <span>
              <strong>Pedidos em dinheiro</strong>
              <small>{cash ? 'Ativado' : 'Desativado'}</small>
            </span>
            <button className={`rider-switch ${cash ? 'on' : ''}`} onClick={toggleCash} aria-label="Alternar pedidos em dinheiro">
              <span className="rider-switch-thumb" />
            </button>
          </div>
        </div>
        <p className="rider-settings-note">
          Pedidos em dinheiro depende de autorizacao operacional do servidor.
        </p>
      </section>

      <section className="profile-group">
        <p className="eyebrow">DOCUMENTOS</p>
        <div className="profile-links">
          {Object.entries(profile.documentsState).map(([doc, state]) => (
            <div className="profile-link" key={doc}>
              <span className="profile-link-icon">
                {state === 'verified' ? <FileCheck size={17} /> : <FileWarning size={17} />}
              </span>
              <span>
                <strong>{doc}</strong>
                <small>{state === 'verified' ? 'Verificado' : state === 'pending' ? 'Em revisao' : 'Rejeitado'}</small>
              </span>
              <span className={`profile-badge ${state === 'verified' ? '' : state === 'pending' ? '' : 'rejected'}`}>
                {state === 'verified' ? '✓' : state === 'pending' ? '...' : '!'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-group">
        <p className="eyebrow">VEICULO</p>
        <div className="profile-links">
          <div className="profile-link">
            <span className="profile-link-icon"><Bike size={17} /></span>
            <span>
              <strong>{profile.vehicleLabel}</strong>
              <small>Veiculo registado</small>
            </span>
            <ChevronRight size={17} className="profile-chevron" />
          </div>
        </div>
      </section>

      <section className="profile-group">
        <p className="eyebrow">SUPORTE</p>
        <div className="profile-links">
          <button className="profile-link" onClick={() => onAction('support')}>
            <span className="profile-link-icon"><MessageCircle size={17} /></span>
            <span>
              <strong>Precisas de ajuda?</strong>
              <small>Fala com o suporte Pedeja</small>
            </span>
            <ChevronRight size={17} className="profile-chevron" />
          </button>
          <button className="profile-link" onClick={() => onAction('calculator')}>
            <span className="profile-link-icon"><TrendingUp size={17} /></span>
            <span>
              <strong>Calculadora de ganhos</strong>
              <small>Simula os teus ganhos</small>
            </span>
            <ChevronRight size={17} className="profile-chevron" />
          </button>
        </div>
      </section>

      <section className="profile-group">
        <p className="eyebrow">LEGAL</p>
        <div className="profile-links">
          <button className="profile-link" onClick={() => onAction('terms')}>
            <span className="profile-link-icon"><ScrollText size={17} /></span>
            <span><strong>Termos de uso</strong></span>
            <ChevronRight size={17} className="profile-chevron" />
          </button>
          <button className="profile-link" onClick={() => onAction('privacy')}>
            <span className="profile-link-icon"><Scale size={17} /></span>
            <span><strong>Politica de privacidade</strong></span>
            <ChevronRight size={17} className="profile-chevron" />
          </button>
          <button className="profile-link" onClick={() => onAction('security')}>
            <span className="profile-link-icon"><ShieldCheck size={17} /></span>
            <span>
              <strong>Seguranca da conta</strong>
              <small>Palavra-passe e verificacoes</small>
            </span>
            <ChevronRight size={17} className="profile-chevron" />
          </button>
        </div>
      </section>

      <p className="profile-footer">
        Pedeja v1.0.0
      </p>

      <button className="logout-button" onClick={() => onAction('logout')}>
        Terminar sessao
      </button>

      <div className="danger-zone">
        <button className="danger-button" onClick={() => onAction('delete-account')}>
          Eliminar conta
        </button>
      </div>
    </main>
  );
}
