import { useState } from 'react';
import { Ban, Eye, UserCheck } from 'lucide-react';
import type { OperationsRepository, OpsRiderStatus } from '@/repositories/operationsTypes';
import { formatKzShort } from '@/utils/format';

type Props = {
  repo: OperationsRepository;
  onOrders: () => void;
};

const statusLabels: Record<OpsRiderStatus, string> = {
  online: 'ONLINE',
  em_entrega: 'EM ENTREGA',
  offline: 'OFFLINE',
  indisponivel: 'INDISPONÍVEL',
};

const statusClass: Record<OpsRiderStatus, string> = {
  online: 'r-online',
  em_entrega: 'r-busy',
  offline: 'r-offline',
  indisponivel: 'r-unavailable',
};

export function OpsRiders({ repo, onOrders }: Props) {
  const [, setTick] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'blocked' | 'documents'>('all');
  const refresh = () => setTick((t) => t + 1);

  const riders = repo
    .listRiders()
    .filter((r) => {
      if (filter === 'online') return r.status === 'online' || r.status === 'em_entrega';
      if (filter === 'blocked') return r.blocked;
      if (filter === 'documents') return r.documents !== 'verificado';
      return true;
    })
    .filter((r) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return r.name.toLowerCase().includes(needle) || r.area.toLowerCase().includes(needle) || r.phone.includes(needle);
    })
    .sort((a, b) => Number(b.status === 'em_entrega') - Number(a.status === 'em_entrega'));

  return (
    <div className="ops-riders">
      <div className="ops-toolbar">
        <div className="ops-filter-row">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
          <button className={filter === 'online' ? 'active' : ''} onClick={() => setFilter('online')}>Online / Em entrega</button>
          <button className={filter === 'blocked' ? 'active' : ''} onClick={() => setFilter('blocked')}>Bloqueados</button>
          <button className={filter === 'documents' ? 'active' : ''} onClick={() => setFilter('documents')}>Documentos pendentes</button>
        </div>
        <div className="ops-search">
          <input type="search" placeholder="Buscar estafetas..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="ops-rider-grid">
        {riders.map((r) => (
          <div key={r.id} className={`ops-rider-card ${r.blocked ? 'blocked' : ''}`}>
            <div className="ops-rider-head">
              <span className={`ops-rider-status ${statusClass[r.status]}`}>{statusLabels[r.status]}</span>
              {r.blocked && <span className="ops-rider-blocked">BLOQUEADO</span>}
            </div>
            <div className="ops-rider-identity">
              <span className="ops-rider-avatar">{r.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>
              <div>
                <strong>{r.name}</strong>
                <small className="ops-mono">{r.phone}</small>
              </div>
            </div>
            <div className="ops-rider-facts">
              <span><b>{r.area}</b> <small>zona</small></span>
              <span><b>{r.deliveries}</b> <small>entregas</small></span>
              <span><b>{formatKzShort(r.earnings)}</b> <small>ganhos</small></span>
              <span><b>{r.avgTimeMin}m</b> <small>médio</small></span>
              <span><b>{r.rating.toFixed(1)}</b> <small>avaliação</small></span>
            </div>
            <div className="ops-rider-meta">
              <span className={r.documents === 'verificado' ? 'ok' : 'warn'}>{r.documents === 'verificado' ? 'Documentos verificados' : 'Documentos: ' + r.documents}</span>
              <span className={r.acceptsCash ? 'ok' : 'muted'}>{r.acceptsCash ? 'Aceita dinheiro: Sim' : 'Aceita dinheiro: Não'}</span>
            </div>
            {r.activeOrderId && (
              <button className="ops-btn full" onClick={onOrders}>
                <Eye size={14} /> Entrega ativa · {r.activeOrderId}
              </button>
            )}
            <div className="ops-rider-actions">
              <button className="ops-btn"><Eye size={14} /> Ver perfil</button>
              {r.blocked ? (
                <button className="ops-btn ok" onClick={() => { repo.unblockRider(r.id); refresh(); }}>
                  <UserCheck size={14} /> Desbloquear
                </button>
              ) : (
                <button className="ops-btn danger" onClick={() => { repo.blockRider(r.id); refresh(); }}>
                  <Ban size={14} /> Bloquear
                </button>
              )}
            </div>
          </div>
        ))}
        {riders.length === 0 && <p className="ops-empty-row">Nenhum estafeta encontrado.</p>}
      </div>
    </div>
  );
}