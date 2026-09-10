import { useState } from 'react';
import {
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Receipt,
  Repeat,
  Send,
  ShoppingBag,
  Star,
  Store,
  Utensils,
} from 'lucide-react';
import { repositories } from '@/repositories';
import { formatKz } from '@/utils/format';
import { EmptyState } from '@/components/EmptyState';
import { BottomSheet } from '@/components/BottomSheet';
import { ChatSheet } from '@/components/ChatSheet';
import { showToast } from '@/components/toastStore';
import type { Order } from '@/types';

const iconMap = { utensils: Utensils, store: Store, 'shopping-bag': ShoppingBag, send: Send };

const statusLabel: Record<string, string> = {
  novo: 'Pedido confirmado',
  aceite: 'A preparar',
  preparando: 'Em preparação',
  pronto: 'A caminho de ti',
  recolhido: 'Recolhido',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

type Props = { onAction: (label: string) => void };

export function OrdersView({ onAction }: Props) {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [, setTick] = useState(0);
  const activeOrders = repositories.order.listActive();
  const historyOrders = repositories.order.listHistory();

  const refresh = () => setTick((t) => t + 1);

  function repeat(order: Order) {
    const created = repositories.order.repeat(order.id);
    if (!created) return;
    setTab('active');
    showToast('Pedido enviado de novo.');
  }

  return (
    <main className="page inner-page">
      <header className="inner-header">
        <p className="eyebrow">PEDIDOS</p>
        <h1>Acompanhar pedidos.</h1>
        <p>Tudo o que está a acontecer, num só lugar.</p>
      </header>

      <div className="segmented">
        <button className={tab === 'active' ? 'selected' : ''} onClick={() => setTab('active')}>
          Ativo <span>{activeOrders.length}</span>
        </button>
        <button className={tab === 'history' ? 'selected' : ''} onClick={() => setTab('history')}>
          Histórico
        </button>
      </div>

      {tab === 'active' ? (
        activeOrders.length > 0 ? (
          activeOrders.map((o) => (
            <ActiveOrder
              key={o.id}
              order={o}
              onReceipt={() => setReceiptOrder(o)}
              onChat={() => setChatOrder(o)}
            />
          ))
        ) : (
          <EmptyState
            icon={<ShoppingBag size={28} />}
            title="Sem pedidos ativos"
            message="Quando fizeres um pedido, ele aparece aqui."
          />
        )
      ) : historyOrders.length > 0 ? (
        <section className="history-list">
          {historyOrders.map((o) => {
            const Icon = iconMap[o.icon];
            const rated = repositories.rating.getForOrder(o.id) !== null;
            return (
              <article className="history-item" key={o.id} onClick={() => setReceiptOrder(o)}>
                <span className="history-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <strong>{o.merchant}</strong>
                  <small>
                    {o.type} · {o.date}
                  </small>
                  <small className="history-status">
                    <span /> Entregue · {formatKz(o.total)}
                  </small>
                </div>
                <ChevronRight size={17} />
                {rated && (
                  <span className="rated-badge" title="Avaliado">
                    <Star size={12} fill="currentColor" />
                  </span>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          icon={<Receipt size={28} />}
          title="Não tens pedidos anteriores"
          message="O teu histórico de pedidos vai aparecer aqui."
        />
      )}

      <BottomSheet
        open={receiptOrder !== null}
        onClose={() => setReceiptOrder(null)}
        eyebrow="RECIBO"
        title={receiptOrder ? `Pedido ${receiptOrder.id}` : ''}
      >
        {receiptOrder && (
          <ReceiptContent
            order={receiptOrder}
            onTrack={() => {
              onAction('track');
              setReceiptOrder(null);
            }}
            onRepeat={() => {
              repeat(receiptOrder);
              setReceiptOrder(null);
            }}
            onRating={() => {
              setRatingOrder(receiptOrder);
              setReceiptOrder(null);
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={ratingOrder !== null}
        onClose={() => setRatingOrder(null)}
        eyebrow="AVALIAR ENTREGA"
        title="Como correu?"
      >
        {ratingOrder && (
          <RatingSheet
            order={ratingOrder}
            onDone={() => {
              setRatingOrder(null);
              refresh();
              showToast('Obrigado pela tua avaliação.');
            }}
          />
        )}
      </BottomSheet>

      {chatOrder && (
        <ChatSheet
          riderName={chatOrder.rider ?? 'Estafeta'}
          orderId={chatOrder.id}
          onClose={() => setChatOrder(null)}
        />
      )}

      <div className="bottom-space" />
    </main>
  );
}

function ActiveOrder({
  order,
  onReceipt,
  onChat,
}: {
  order: Order;
  onReceipt: () => void;
  onChat: () => void;
}) {
  const label = statusLabel[order.status] ?? 'A preparar';
  const hasRider = Boolean(order.rider && order.riderPhone);

  function call() {
    if (order.riderPhone) window.location.href = `tel:${order.riderPhone.replace(/ /g, '')}`;
  }

  function whatsapp() {
    const number = (order.merchantPhone ?? '+244 900 000 000').replace(/[\s+]/g, '');
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(`Olá Pedejá, preciso de ajuda com o pedido ${order.id}.`)}`, '_blank');
  }

  function share() {
    const text = `Pedido ${order.id} · ${order.merchant} · ${formatKz(order.total)} via Pedejá`;
    if (navigator.share) {
      navigator.share({ title: 'Pedejá — para onde está a ir o meu pedido', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => showToast('Detalhes copiados.')).catch(() => showToast('Não foi possível partilhar.'));
    }
  }

  function messageRider() {
    onChat();
  }

  return (
    <section className="order-section">
      <div className="order-map">
        <div className="map-grid" />
        <div className="route-line" />
        <span className="map-point point-start">
          <Store size={13} />
        </span>
        <span className="map-point point-end">
          <MapPin size={13} fill="currentColor" />
        </span>
        <span className="map-pill">
          <Clock3 size={14} /> {order.duration}
        </span>
        <span className="map-pill map-pill-distance">
          <Navigation size={13} /> {order.distance}
        </span>
      </div>

      <button className="order-status" onClick={onReceipt}>
        <div>
          <span className={`status-dot ${hasRider ? 'live' : ''}`} /> {hasRider ? 'Estafeta a caminho' : 'À procura de estafeta'}
        </div>
        <strong>{label}</strong>
      </button>

      <div className="order-merchant" onClick={onReceipt}>
        <span className="merchant-mini">
          <Store size={20} />
        </span>
        <span>
          <strong>{order.merchant}</strong>
          <small>
            Pedido #{order.id} · {order.items} {order.items === 1 ? 'item' : 'itens'}
          </small>
        </span>
        <ChevronRight size={18} />
      </div>

      {hasRider && (
        <div className="rider-card">
          <span className="rider-avatar">
            {order.rider?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </span>
          <span className="rider-info">
            <strong>{order.rider}</strong>
            <small>Estafeta do teu pedido</small>
          </span>
          <span className="rider-actions">
            <button onClick={call} aria-label="Ligar ao estafeta">
              <Phone size={16} />
            </button>
            <button onClick={messageRider} aria-label="Mensagem ao estafeta">
              <MessageCircle size={16} />
            </button>
          </span>
        </div>
      )}

      {order.timeline && (
        <div className="timeline">
          {order.timeline.map((event, i) => (
            <div
              key={i}
              className={`timeline-item ${event.done ? 'done' : ''} ${
                event.done && !order.timeline![i + 1]?.done ? 'active' : ''
              }`}
            >
              <span className="timeline-marker">{event.done ? '✓' : ''}</span>
              <span>{event.label}</span>
              <time>{event.timestamp}</time>
            </div>
          ))}
        </div>
      )}

      <div className="order-total">
        <span>Subtotal</span>
        <strong>{formatKz(order.subtotal ?? 0)}</strong>
        {order.discount ? (
          <>
            <span className="order-discount">Desconto</span>
            <strong className="order-discount">−{formatKz(order.discount)}</strong>
          </>
        ) : null}
        <span>Entrega</span>
        <strong>{formatKz(order.deliveryFee ?? 0)}</strong>
        {order.tip ? (
          <>
            <span>Gorjeta</span>
            <strong>{formatKz(order.tip)}</strong>
          </>
        ) : null}
        <span className="total-label">Total</span>
        <strong className="total-value">{formatKz(order.total)}</strong>
      </div>

      <div className="order-actions">
        <button className="btn-primary" onClick={messageRider}>
          <MessageCircle size={17} /> {hasRider ? 'Mensagem ao estafeta' : 'Mensagem ao negócio'}
        </button>
        <div className="order-secondary-actions">
          <button className="text-action" onClick={call}>
            <Phone size={15} /> Ligar
          </button>
          <button className="text-action" onClick={share}>
            <Send size={15} /> Partilhar
          </button>
        </div>
        <button className="whatsapp-action" onClick={whatsapp}>
          <MessageCircle size={15} /> Suporte WhatsApp
        </button>
      </div>
    </section>
  );
}

function ReceiptContent({
  order,
  onTrack,
  onRepeat,
  onRating,
}: {
  order: Order;
  onTrack: () => void;
  onRepeat: () => void;
  onRating: () => void;
}) {
  return (
    <div className="receipt-content">
      <div className="receipt-header">
        <strong>{order.merchant}</strong>
        <small>
          {order.type} · {order.date}
        </small>
      </div>

      {order.lines && order.lines.length > 0 && (
        <div className="checkout-lines">
          {order.lines.map((l) => (
            <div className="checkout-line" key={l.productId}>
              <span>
                <strong>{l.quantity}×</strong> {l.name}
              </span>
              <span>{formatKz(l.unitPrice * l.quantity)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="checkout-rows">
        <div className="checkout-row">
          <span>Subtotal</span>
          <strong>{formatKz(order.subtotal ?? 0)}</strong>
        </div>
        {order.discount ? (
          <div className="checkout-row promo">
            <span>Desconto</span>
            <strong>−{formatKz(order.discount)}</strong>
          </div>
        ) : null}
        <div className="checkout-row">
          <span>Entrega</span>
          <strong>{formatKz(order.deliveryFee ?? 0)}</strong>
        </div>
        {order.tip ? (
          <div className="checkout-row">
            <span>Gorjeta</span>
            <strong>{formatKz(order.tip)}</strong>
          </div>
        ) : null}
        <div className="checkout-row total">
          <span>Total</span>
          <strong>{formatKz(order.total)}</strong>
        </div>
        {order.rider ? (
          <div className="checkout-row">
            <span>Estafeta</span>
            <strong>{order.rider}</strong>
          </div>
        ) : null}
      </div>

      {order.active ? (
        <button className="btn-secondary receipt-btn" onClick={onTrack}>
          Acompanhar em tempo real <Navigation size={16} />
        </button>
      ) : (
        <div className="receipt-actions">
          <button className="btn-secondary receipt-btn" onClick={onRepeat}>
            <Repeat size={16} /> Repetir pedido
          </button>
          <button className="btn-ghost receipt-btn" onClick={onRating}>
            <Star size={16} /> Avaliar entrega
          </button>
        </div>
      )}
    </div>
  );
}

function RatingSheet({
  order,
  onDone,
}: {
  order: Order;
  onDone: () => void;
}) {
  const existing = repositories.rating.getForOrder(order.id);
  const [score, setScore] = useState<number>(existing?.score ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const stars = [1, 2, 3, 4, 5];

  function submit() {
    if (score === 0) return;
    repositories.rating.submitFor(order.id, score as 1 | 2 | 3 | 4 | 5, comment.trim() || undefined);
    onDone();
  }

  return (
    <div className="rating-sheet">
      <p className="rating-prompt">O teu pedido de {order.merchant} já chegou?</p>
      <div className="star-row">
        {stars.map((s) => (
          <button
            key={s}
            className={`star-btn ${s <= score ? 'on' : ''}`}
            onClick={() => setScore(s)}
            aria-label={`${s} estrelas`}
          >
            <Star size={30} fill="currentColor" />
          </button>
        ))}
      </div>
      <textarea
        className="rating-comment"
        placeholder="Queres acrescentar algo? (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <button className="btn-primary" disabled={score === 0} onClick={submit}>
        {existing ? 'Atualizar avaliação' : 'Avaliar entrega'}
      </button>
    </div>
  );
}