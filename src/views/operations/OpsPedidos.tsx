import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Phone, Mail, RefreshCw, X } from 'lucide-react';
import type { OperationsRepository, OpsOrder, OpsOrderStatus } from '@/repositories/operationsTypes';
import { formatKz } from '@/utils/format';

type Props = {
  repo: OperationsRepository;
};

const statusLabels: Record<OpsOrderStatus, string> = {
  novo: 'NOVO',
  aceite: 'ACEITE',
  em_preparacao: 'PREPARAÇÃO',
  pronto: 'PRONTO',
  recolhido: 'RECOLHIDO',
  em_entrega: 'EM ENTREGA',
  entregue: 'ENTREGUE',
  cancelado: 'CANCELADO',
  aguardando_estafeta: 'S/ ESTAFETA',
};

const statusClass: Record<OpsOrderStatus, string> = {
  novo: 's-novo',
  aceite: 's-aceite',
  em_preparacao: 's-preparacao',
  pronto: 's-pronto',
  recolhido: 's-recolhido',
  em_entrega: 's-entrega',
  entregue: 's-entregue',
  cancelado: 's-cancelado',
  aguardando_estafeta: 's-sem-rider',
};

type FilterKey = 'all' | 'activos' | 'late' | 'sem_rider' | 'aguardando' | 'pag_pendente' | 'dinheiro' | 'multicaixa';

const paymentLabel = (m: 'cash' | 'multicaixa' | 'future') => (m === 'cash' ? 'Dinheiro' : 'Multicaixa');

export function OpsPedidos({ repo }: Props) {
  const [, setTick] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('activos');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const refresh = () => setTick((t) => t + 1);

  const orders = repo.listOrders();
  const isLate = (o: OpsOrder) => o.flags.late;

  const sortedByTime = [...orders]
    .sort((a, b) => (a.time < b.time ? 1 : -1))
    .filter((o) => {
      if (filter === 'all') return true;
      if (filter === 'activos') return !['entregue', 'cancelado'].includes(o.status);
      if (filter === 'late') return o.flags.late;
      if (filter === 'sem_rider') return o.flags.noRider;
      if (filter === 'aguardando') return o.flags.awaitingAcceptance;
      if (filter === 'pag_pendente') return o.flags.paymentPending;
      if (filter === 'dinheiro') return o.paymentMethod === 'cash';
      if (filter === 'multicaixa') return o.paymentMethod === 'multicaixa';
      return true;
    });
  const needle = query.trim().toLowerCase();
  const filtered = !needle
    ? sortedByTime
    : sortedByTime.filter(
        (o) =>
          o.id.toLowerCase().includes(needle) ||
          o.customer.toLowerCase().includes(needle) ||
          o.merchant.toLowerCase().includes(needle) ||
          o.rider.toLowerCase().includes(needle)
      );

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  if (selected) {
    return (
      <OrderDetailPanel
        repo={repo}
        order={selected}
        onBack={() => setSelectedId(null)}
        onChanged={() => refresh()}
      />
    );
  }

  return (
    <div className="ops-pedidos">
      <div className="ops-toolbar">
        <div className="ops-filter-row">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
          <button className={filter === 'activos' ? 'active' : ''} onClick={() => setFilter('activos')}>Ativos</button>
          <button className={`${filter === 'late' ? 'active' : ''} warn`} onClick={() => setFilter('late')}>Atrasados</button>
          <button className={filter === 'sem_rider' ? 'active' : ''} onClick={() => setFilter('sem_rider')}>Sem estafeta</button>
          <button className={filter === 'aguardando' ? 'active' : ''} onClick={() => setFilter('aguardando')}>Aguardando aceitação</button>
          <button className={filter === 'pag_pendente' ? 'active' : ''} onClick={() => setFilter('pag_pendente')}>Pagamento pendente</button>
          <button className={filter === 'dinheiro' ? 'active' : ''} onClick={() => setFilter('dinheiro')}>Dinheiro</button>
          <button className={filter === 'multicaixa' ? 'active' : ''} onClick={() => setFilter('multicaixa')}>Multicaixa</button>
        </div>
        <div className="ops-search">
          <input
            type="search"
            placeholder="Buscar pedidos, clientes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Negócio</th>
              <th>Estafeta</th>
              <th>Status</th>
              <th>Pagamento</th>
              <th>Valor</th>
              <th>Tempo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="ops-clickable" onClick={() => setSelectedId(o.id)}>
                <td>
                  <span className={`ops-order-id ${isLate(o) ? 'late' : ''}`}>{o.id}</span>
                  {isLate(o) && <span className="ops-flag" title="Atrasado"><AlertTriangle size={11} /></span>}
                  {o.flags.noRider && <span className="ops-flag warn" title="Sem estafeta">!</span>}
                </td>
                <td className="ops-mono">{o.time}</td>
                <td>{o.customer}</td>
                <td>{o.merchant}</td>
                <td>{o.rider === '—' ? <span className="ops-muted">—</span> : o.rider}</td>
                <td><span className={`ops-status ${statusClass[o.status]}`}>{statusLabels[o.status]}</span></td>
                <td>
                  <span className={`ops-pay ${o.paymentMethod === 'cash' ? 'cash' : 'card'}`}>
                    {paymentLabel(o.paymentMethod)}
                  </span>
                </td>
                <td className="ops-val">{formatKz(o.value)}</td>
                <td className={`ops-time ${isLate(o) ? 'late' : ''}`}>
                  {o.elapsedMin}/{o.targetMin} min
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="ops-empty-row">Sem pedidos para os filtros escolhidos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const advanceMap: Partial<Record<OpsOrderStatus, { next: OpsOrderStatus; label: string }>> = {
  aguardando_estafeta: { next: 'aceite', label: 'Marcar aceite' },
  em_preparacao: { next: 'pronto', label: 'Marcar pronto' },
  pronto: { next: 'recolhido', label: 'Marcar recolhido' },
  recolhido: { next: 'em_entrega', label: 'Marcar em entrega' },
  em_entrega: { next: 'entregue', label: 'Marcar entregue' },
};

function OrderDetailPanel({
  repo,
  order,
  onBack,
  onChanged,
}: {
  repo: OperationsRepository;
  order: OpsOrder;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState<'cancel' | null>(null);
  const [assigning, setAssigning] = useState(false);
  const advance = advanceMap[order.status];
  const riders = repo.listRiders().filter((r) => r.status === 'online' || r.status === 'em_entrega');

  return (
    <div className="ops-order-detail-page">
      <button className="ops-back" onClick={onBack}><ArrowLeft size={16} /> Voltar aos pedidos</button>

      <div className="ops-detail-head">
        <div>
          <span className={`ops-status ops-status-lg ${statusClass[order.status]}`}>{statusLabels[order.status]}</span>
          <h2>{order.id}</h2>
        </div>
        <div className="ops-detail-head-meta">
          <span className={`ops-pay ops-pay-lg ${order.paymentMethod === 'cash' ? 'cash' : 'card'}`}>
            {paymentLabel(order.paymentMethod)} · {order.paymentStatus}
          </span>
          <span className="ops-muted">{order.time} · {order.distance} · ETA {order.eta}</span>
        </div>
      </div>

      {order.flags.late && (
        <div className="ops-alert-banner">
          <AlertTriangle size={16} /> Pedido atrasado ({order.elapsedMin} min vs alvo {order.targetMin} min).
        </div>
      )}

      <div className="ops-detail-grid">
        <section className="ops-panel">
          <h3>Partes</h3>
          <div className="ops-party">
            <span className="ops-party-icon">C</span>
            <div><strong>Cliente</strong><small>{order.customer}</small><small className="ops-mono">{order.customerPhone}</small></div>
            <span className="ops-party-area">{order.customerArea}</span>
            <button className="ops-contact" title="Ligar"><Phone size={14} /></button>
            <button className="ops-contact" title="WhatsApp"><Mail size={14} /></button>
          </div>
          <div className="ops-party">
            <span className="ops-party-icon">N</span>
            <div><strong>Negócio</strong><small>{order.merchant}</small></div>
            <span className="ops-party-area">{order.merchantArea}</span>
            <button className="ops-contact" title="Ligar"><Phone size={14} /></button>
          </div>
          <div className="ops-party">
            <span className="ops-party-icon">E</span>
            <div><strong>Estafeta</strong>{order.rider === '—' ? <small className="ops-warn">Sem atribuição</small> : <small>{order.rider}</small>}</div>
            {order.riderPhone && <span className="ops-party-area ops-mono">{order.riderPhone}</span>}
            <button className="ops-contact" title="Ligar"><Phone size={14} /></button>
            <button className="ops-contact" title="Mensagem"><Mail size={14} /></button>
          </div>
          {order.instructions && <p className="ops-instructions">Instruções: {order.instructions}</p>}
        </section>

        <section className="ops-panel">
          <h3>Itens</h3>
          <div className="ops-items">
            {order.items.map((item, i) => (
              <div className="ops-item" key={i}>
                <span>{item.quantity}× {item.name}</span>
                <span className="ops-mono">{formatKz(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="ops-totals">
            <div><span>Subtotal</span><span className="ops-mono">{formatKz(order.subtotal)}</span></div>
            {order.discount > 0 && <div><span>Desconto</span><span className="ops-mono ops-green">−{formatKz(order.discount)}</span></div>}
            <div><span>Entrega</span><span className="ops-mono">{formatKz(order.deliveryFee)}</span></div>
            {order.tip > 0 && <div><span>Gorjeta</span><span className="ops-mono">{formatKz(order.tip)}</span></div>}
            <div className="ops-total"><span>Total</span><span className="ops-mono">{formatKz(order.value)}</span></div>
            <div className="ops-total-row"><span>Método de pagamento</span><span className="ops-pay">{paymentLabel(order.paymentMethod)}</span></div>
          </div>
        </section>

        <section className="ops-panel ops-timeline-panel">
          <h3>Linha de vida</h3>
          <div className="ops-timeline">
            {order.events.map((event, i) => (
              <div key={i} className={`ops-timeline-step ${event.done ? 'done' : ''}`}>
                <span className="ops-timeline-dot" />
                <span>{event.label}</span>
                <span className="ops-mono ops-muted">{event.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="ops-panel ops-interventions">
        <h3>Intervenção operacional</h3>
        <div className="ops-intervention-actions">
          {advance && (
            <button
              className="ops-btn primary"
              onClick={() => { repo.updateOrderStatus(order.id, advance.next); onChanged(); }}
            >
              {advance.label}
            </button>
          )}

          {assigning ? (
            <div className="ops-assign-box">
              <select id="ops-rider-select">
                {riders.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.area} · {r.status}</option>)}
              </select>
              <button
                className="ops-btn"
                onClick={() => {
                  const el = document.getElementById('ops-rider-select') as HTMLSelectElement;
                  repo.reassignDelivery(order.id, el.value);
                  onChanged();
                  setAssigning(false);
                }}
              >
                Confirmar atribuição
              </button>
              <button className="ops-btn ghost" onClick={() => setAssigning(false)}>Cancelar</button>
            </div>
          ) : (
            <button className="ops-btn" onClick={() => setAssigning(true)}>
              <RefreshCw size={14} /> Reatribuir estafeta
            </button>
          )}

          <button className="ops-btn"><Phone size={14} /> Contactar cliente</button>
          <button className="ops-btn"><Phone size={14} /> Contactar estafeta</button>
          <button className="ops-btn"><Phone size={14} /> Contactar negócio</button>

          {confirming === 'cancel' ? (
            <span className="ops-confirm">
              <span>Cancelar definitivamente?</span>
              <button className="ops-btn danger" onClick={() => { repo.cancelOrder(order.id); onChanged(); setConfirming(null); }}>Sim, cancelar</button>
              <button className="ops-btn ghost" onClick={() => setConfirming(null)}>Voltar</button>
            </span>
          ) : (
            <button className="ops-btn danger" onClick={() => setConfirming('cancel')}>
              <X size={14} /> Cancelar pedido
            </button>
          )}
        </div>
      </section>
    </div>
  );
}