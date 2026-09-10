import { AlertTriangle, Clock3, MapPin, Wallet, Zap, UserX, Hourglass, CreditCard } from 'lucide-react';
import type { OperationsRepository } from '@/repositories/operationsTypes';
import { formatKzShort } from '@/utils/format';
import type { OpsSection } from './OperationsLayout';

type Props = {
  repo: OperationsRepository;
  onSection: (s: OpsSection) => void;
};

export function OpsOverview({ repo, onSection }: Props) {
  const overview = repo.getOverview();

  return (
    <div className="ops-overview">
      <section className="ops-kpis">
        <div className="ops-kpi-card">
          <span className="ops-kpi-icon"><ClipboardListIcon /></span>
          <div>
            <strong>{overview.ordersToday}</strong>
            <small>Pedidos hoje</small>
          </div>
        </div>
        <div className="ops-kpi-card accent">
          <span className="ops-kpi-icon"><Wallet size={18} /></span>
          <div>
            <strong>{formatKzShort(overview.revenueToday)}</strong>
            <small>Receita hoje</small>
          </div>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-icon green"><Zap size={18} /></span>
          <div>
            <strong>{overview.activeRiders}</strong>
            <small>Entregadores ativos</small>
          </div>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-icon dangerous"><AlertTriangle size={18} /></span>
          <div>
            <strong>{overview.lateOrders}</strong>
            <small>Pedidos atrasados</small>
          </div>
        </div>
      </section>

      <section className="ops-overview-grid">
        <div className="ops-panel ops-live-panel">
          <div className="ops-panel-header">
            <h3>Atividade em tempo real</h3>
            <span className="ops-live-badge"><span className="ops-live-dot" /> LIVE</span>
          </div>
          <div className="ops-live-map">
            <div className="ops-map-grid" />
            <div className="ops-map-route r1" />
            <div className="ops-map-route r2" />
            {overview.riders.map((rider, i) => {
              const positions = [
                { top: '18%', left: '22%' }, { top: '34%', left: '58%' }, { top: '56%', left: '30%' },
                { top: '26%', left: '76%' }, { top: '62%', left: '64%' }, { top: '74%', left: '36%' },
                { top: '44%', left: '16%' }, { top: '68%', left: '82%' }, { top: '12%', left: '48%' },
                { top: '82%', left: '60%' }, { top: '38%', left: '42%' }, { top: '50%', left: '88%' },
              ];
              const pos = positions[i % positions.length];
              return (
                <span
                  key={rider.id}
                  className={`ops-rider-dot ${rider.status === 'em_entrega' ? 'busy' : ''}`}
                  style={{ top: pos.top, left: pos.left }}
                  title={`${rider.name} — ${rider.area}`}
                >
                  <span className="ops-rider-ping" />
                </span>
              );
            })}
          </div>
          <p className="ops-live-note">Representação visual aproximada. Sem posicionamento GPS real nesta preview.</p>
        </div>

        <div className="ops-panel">
          <div className="ops-panel-header">
            <h3>Exceções operacionais</h3>
            <button className="ops-link" onClick={() => onSection('pedidos')}>Ver pedidos</button>
          </div>
          <div className="ops-exception-list">
            <button className="ops-exception-item" onClick={() => onSection('pedidos')}>
              <span className="ops-exception-icon danger"><Clock3 size={16} /></span>
              <div><strong>Pedidos atrasados</strong><small>Precisam de intervenção</small></div>
              <b>{overview.exceptions.late}</b>
            </button>
            <button className="ops-exception-item" onClick={() => onSection('pedidos')}>
              <span className="ops-exception-icon warn"><UserX size={16} /></span>
              <div><strong>Pedidos sem estafeta</strong><small>Não atribuídos</small></div>
              <b>{overview.exceptions.noRider}</b>
            </button>
            <button className="ops-exception-item" onClick={() => onSection('pedidos')}>
              <span className="ops-exception-icon info"><Hourglass size={16} /></span>
              <div><strong>Aguardando aceitação</strong><small>Negócio ainda não aceitou</small></div>
              <b>{overview.exceptions.awaitingAcceptance}</b>
            </button>
            <button className="ops-exception-item" onClick={() => onSection('receita')}>
              <span className="ops-exception-icon purple"><CreditCard size={16} /></span>
              <div><strong>Pagamentos pendentes</strong><small>Reconciliação em aberto</small></div>
              <b>{overview.exceptions.paymentsPending}</b>
            </button>
          </div>
        </div>
      </section>

      <section className="ops-panel ops-revenue-panel">
        <div className="ops-panel-header">
          <h3>Receita — últimos 7 dias</h3>
          <span className="ops-panel-total">{formatKzShort(overview.revenue7d.reduce((a, d) => a + d.value, 0))}</span>
        </div>
        <div className="ops-bar-chart">
          {overview.revenue7d.map((day) => {
            const max = Math.max(...overview.revenue7d.map((d) => d.value));
            return (
              <div key={day.label} className="ops-bar">
                <div className="ops-bar-track">
                  <div className="ops-bar-fill" style={{ height: `${(day.value / max) * 100}%` }} />
                </div>
                <span className="ops-bar-label">{day.label}</span>
                <span className="ops-bar-value">{formatKzShort(day.value)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ops-overview-footer">
        <div className="ops-panel ops-quick-panel">
          <div className="ops-panel-header">
            <h3>Acesso rápido</h3>
          </div>
          <div className="ops-quick-actions">
            <button onClick={() => onSection('pedidos')}><MapPin size={16} /> Ver pedidos ativos</button>
            <button onClick={() => onSection('entregadores')}><Zap size={16} /> Entregadores online</button>
            <button onClick={() => onSection('receita')}><Wallet size={16} /> Posição de caixa</button>
            <button onClick={() => onSection('relatorios')}><Clock3 size={16} /> Análise de atrasos</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClipboardListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}