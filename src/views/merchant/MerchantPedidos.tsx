import { useState } from 'react';
import {
  Clock3,
  MapPin,
  MessageCircle,
  Pause,
  Phone,
  User,
} from 'lucide-react';
import type { MerchantRepository, MerchantOrder, MerchantOrderStatus } from '@/repositories/merchantTypes';
import { formatKz } from '@/utils/format';

type Props = {
  repo: MerchantRepository;
};

const statusLabels: Record<MerchantOrderStatus, string> = {
  novo: 'NOVO',
  em_preparacao: 'EM PREPARACAO',
  pronto: 'PRONTO',
  em_entrega: 'EM ENTREGA',
  concluido: 'CONCLUIDO',
  cancelado: 'CANCELADO',
};

const statusColors: Record<MerchantOrderStatus, string> = {
  novo: 'status-novo',
  em_preparacao: 'status-preparacao',
  pronto: 'status-pronto',
  em_entrega: 'status-entrega',
  concluido: 'status-concluido',
  cancelado: 'status-cancelado',
};

const nextStatus: Partial<Record<MerchantOrderStatus, MerchantOrderStatus>> = {
  novo: 'em_preparacao',
  em_preparacao: 'pronto',
  pronto: 'em_entrega',
};

const nextLabel: Partial<Record<MerchantOrderStatus, string>> = {
  novo: 'Comecar preparacao',
  em_preparacao: 'Marcar pronto',
  pronto: 'Marcar em entrega',
};

export function MerchantPedidos({ repo }: Props) {
  const [, setTick] = useState(0);
  const orders = repo.listOrders();
  const report = repo.getReport();
  const ordersPaused = repo.isOrdersPaused();
  const refresh = () => setTick((t) => t + 1);
  const [selected, setSelected] = useState<MerchantOrder | null>(null);

  const active = orders.filter((o) => o.status !== 'concluido' && o.status !== 'cancelado');
  const completed = orders.filter((o) => o.status === 'concluido');

  function advance(order: MerchantOrder) {
    const next = nextStatus[order.status];
    if (next) {
      repo.updateOrderStatus(order.id, next);
      refresh();
      if (selected?.id === order.id) {
        const updated = repo.getOrder(order.id);
        if (updated) setSelected(updated);
      }
    }
  }

  function handleCallPhone(phone: string) {
    window.location.href = `tel:${phone.replace(/[\s+]/g, '')}`;
  }

  function handleMessage(phone: string) {
    const number = phone.replace(/[\s+]/g, '');
    window.open(`https://wa.me/${number}?text=${encodeURIComponent('Ola, falemos sobre o teu pedido Pedeja.')}`, '_blank');
  }

  return (
    <div className="merchant-pedidos">
      <div className="merchant-page-header">
        <h1>Pedidos</h1>
        <p>Gestao de pedidos em tempo real.</p>
      </div>

      {ordersPaused && (
        <div className="merchant-orders-paused-banner">
          <Pause size={16} />
          <span>Pedidos pausados. O restaurante nao esta a aceitar novos pedidos.</span>
        </div>
      )}

      <div className="merchant-summary-row">
        <div className="merchant-summary-card">
          <span className="merchant-summary-value">{report.totalOrders}</span>
          <small>Pedidos hoje</small>
        </div>
        <div className="merchant-summary-card">
          <span className="merchant-summary-value">{formatKz(report.totalRevenue)}</span>
          <small>Receita hoje</small>
        </div>
        <div className="merchant-summary-card">
          <span className="merchant-summary-value">{report.avgPrepTime} min</span>
          <small>Tempo medio</small>
        </div>
      </div>

      <div className="merchant-pedidos-layout">
        <div className="merchant-order-list">
          {active.length > 0 && (
            <div className="merchant-order-section">
              <h3>Ativos ({active.length})</h3>
              {active.map((order) => (
                <button
                  key={order.id}
                  className={`merchant-order-card ${selected?.id === order.id ? 'selected' : ''} ${order.status === 'novo' ? 'is-new' : ''}`}
                  onClick={() => setSelected(order)}
                >
                  <div className="merchant-order-card-header">
                    <span className={`merchant-order-status ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    <span className="merchant-order-id">{order.id}</span>
                  </div>
                  <div className="merchant-order-card-body">
                    <strong>{order.customer}</strong>
                    <small>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'} · {order.createdAt}</small>
                  </div>
                  <div className="merchant-order-card-footer">
                    <strong>{formatKz(order.total)}</strong>
                    {order.assignedRider && <small>{order.assignedRider}</small>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="merchant-order-section">
              <h3>Concluidos ({completed.length})</h3>
              {completed.map((order) => (
                <button
                  key={order.id}
                  className={`merchant-order-card ${selected?.id === order.id ? 'selected' : ''}`}
                  onClick={() => setSelected(order)}
                >
                  <div className="merchant-order-card-header">
                    <span className={`merchant-order-status ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    <span className="merchant-order-id">{order.id}</span>
                  </div>
                  <div className="merchant-order-card-body">
                    <strong>{order.customer}</strong>
                    <small>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'} · {order.createdAt}</small>
                  </div>
                  <div className="merchant-order-card-footer">
                    <strong>{formatKz(order.total)}</strong>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="merchant-order-detail">
          {selected ? (
            <OrderDetail
              order={selected}
              onAdvance={() => advance(selected)}
              onCallPhone={handleCallPhone}
              onMessage={handleMessage}
            />
          ) : (
            <div className="merchant-empty-detail">
              <p>Seleciona um pedido para ver detalhes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetail({ order, onAdvance, onCallPhone, onMessage }: { order: MerchantOrder; onAdvance: () => void; onCallPhone: (phone: string) => void; onMessage: (phone: string) => void }) {
  const action = nextLabel[order.status];
  return (
    <div className="merchant-order-detail-content">
      <div className="merchant-detail-header">
        <div>
          <span className={`merchant-order-status ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
          <h2>{order.id}</h2>
        </div>
        <span className="merchant-detail-time">
          <Clock3 size={14} /> {order.createdAt}
        </span>
      </div>

      <div className="merchant-detail-section">
        <div className="merchant-detail-row">
          <User size={15} />
          <div>
            <strong>{order.customer}</strong>
            <small>{order.customerPhone}</small>
          </div>
          <button className="merchant-detail-action" aria-label="Ligar" onClick={() => onCallPhone(order.customerPhone)}>
            <Phone size={15} />
          </button>
          <button className="merchant-detail-action" aria-label="Mensagem" onClick={() => onMessage(order.customerPhone)}>
            <MessageCircle size={15} />
          </button>
        </div>
      </div>

      {order.instructions && (
        <div className="merchant-detail-section merchant-detail-instructions">
          <small>Instrucoes do cliente: {order.instructions}</small>
        </div>
      )}

      <div className="merchant-detail-section">
        <h3>Itens</h3>
        {order.items.map((item, i) => (
          <div className="merchant-detail-item" key={i}>
            <span>{item.quantity}x {item.name}</span>
            <strong>{formatKz(item.unitPrice * item.quantity)}</strong>
          </div>
        ))}
      </div>

      <div className="merchant-detail-section">
        <div className="merchant-detail-totals">
          <div className="merchant-detail-total-row">
            <span>Subtotal</span><strong>{formatKz(order.subtotal)}</strong>
          </div>
          {order.discount > 0 && (
            <div className="merchant-detail-total-row promo">
              <span>Desconto</span><strong>-{formatKz(order.discount)}</strong>
            </div>
          )}
          <div className="merchant-detail-total-row">
            <span>Entrega</span><strong>{formatKz(order.deliveryFee)}</strong>
          </div>
          {order.tip > 0 && (
            <div className="merchant-detail-total-row">
              <span>Gorjeta</span><strong>{formatKz(order.tip)}</strong>
            </div>
          )}
          <div className="merchant-detail-total-row total">
            <span>Total</span><strong>{formatKz(order.total)}</strong>
          </div>
          <div className="merchant-detail-total-row payment">
            <span>Método de pagamento</span>
            <strong className={order.paymentMethod === 'cash' ? 'pay-cash' : 'pay-card'}>
              {order.paymentMethod === 'cash' ? 'Dinheiro' : 'Multicaixa'}
            </strong>
          </div>
        </div>
      </div>

      {order.assignedRider && (
        <div className="merchant-detail-section">
          <div className="merchant-detail-row">
            <MapPin size={15} />
            <div>
              <strong>{order.assignedRider}</strong>
              <small>Estafeta atribuido</small>
            </div>
          </div>
        </div>
      )}

      <div className="merchant-detail-timeline">
        {order.timeline.map((step, i) => (
          <div key={i} className={`merchant-timeline-step ${step.done ? 'done' : ''}`}>
            <span className="merchant-timeline-dot" />
            <span className="merchant-timeline-label">{step.label}</span>
            <span className="merchant-timeline-time">{step.time}</span>
          </div>
        ))}
      </div>

      {action && (
        <button className="btn-primary merchant-advance-btn" onClick={onAdvance}>
          {action}
        </button>
      )}
    </div>
  );
}
