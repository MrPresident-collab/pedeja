import { useEffect, useState } from 'react';
import {
  Bike,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Store,
  HelpCircle,
} from 'lucide-react';
import type { RiderRepository, ActiveDelivery, RiderStep } from '@/repositories/riderTypes';
import { formatKz } from '@/utils/format';

type Props = {
  riderRepo: RiderRepository;
  onChat: (name: string) => void;
  onSupport: () => void;
};

const stepLabels: Record<RiderStep, string> = {
  pickup: 'Cheguei',
  picked_up: 'Recolhido',
  delivered: 'Entregue',
};

const stepIcons: Record<RiderStep, typeof Store> = {
  pickup: Store,
  picked_up: Bike,
  delivered: Check,
};

export function RiderHomeView({ riderRepo, onChat, onSupport }: Props) {
  const [, setTick] = useState(0);
  const online = riderRepo.isOnline();
  const stats = riderRepo.getStats();
  const activeDelivery = riderRepo.getActiveDelivery();
  const request = riderRepo.getDeliveryRequest();

  const refresh = () => setTick((t) => t + 1);

  function toggleOnline() {
    riderRepo.setOnline(!online);
    refresh();
  }

  function accept() {
    if (request) {
      riderRepo.acceptDelivery(request.id);
      refresh();
    }
  }

  function advance() {
    riderRepo.advanceStep();
    refresh();
  }

  function callPhone(phone: string) {
    window.location.href = `tel:${phone.replace(/[\s+]/g, '')}`;
  }

  return (
    <main className="page rider-page">
      <header className="rider-topbar">
        <div className="rider-topbar-left">
          <div className="rider-logo-small">
            <span className="brand-mark logo-sm">Pedej<span className="brand-dot">a</span></span>
          </div>
          <div className="rider-balance">
            <small>Ganhos de hoje</small>
            <strong>{formatKz(stats.todayEarnings.amount)}</strong>
          </div>
        </div>
        <button
          className={`rider-toggle ${online ? 'online' : ''}`}
          onClick={toggleOnline}
        >
          <span className="rider-toggle-dot" />
          {online ? 'Online' : 'Offline'}
        </button>
      </header>

      {!online && !activeDelivery && (
        <div className="rider-offline-panel">
          <div className="rider-offline-stats">
            <div className="rider-stat-card">
              <span className="rider-stat-value">{formatKz(stats.todayEarnings.amount)}</span>
              <small>Ganhos de hoje</small>
            </div>
            <div className="rider-stat-card">
              <span className="rider-stat-value">{stats.deliveriesCompleted}</span>
              <small>Entregas</small>
            </div>
            <div className="rider-stat-card">
              <span className="rider-stat-value">{stats.onTimePct}%</span>
              <small>Pontualidade</small>
            </div>
          </div>
          <button className="btn-primary rider-go-online" onClick={toggleOnline}>
            Ficar online
          </button>
          <p className="rider-offline-hint">
            Fica online para receberes entregas na tua zona.
          </p>
        </div>
      )}

      {online && !activeDelivery && (
        <div className="rider-online-area">
          <div className="rider-map-placeholder">
            <div className="rider-map-grid" />
            <div className="rider-pulse" />
            <MapPin size={24} className="rider-map-pin" />
            <span className="rider-map-label">Tu</span>
          </div>
          {request ? (
            <DeliveryRequestCard
              request={request}
              onAccept={accept}
              riderRepo={riderRepo}
              onRefresh={refresh}
            />
          ) : (
            <div className="rider-empty-radar">
              <div className="rider-radar-ring" />
              <div className="rider-radar-ring ring-2" />
              <div className="rider-radar-ring ring-3" />
              <p>A procurar entregas nearby...</p>
            </div>
          )}
        </div>
      )}

      {activeDelivery && (
        <ActiveDeliveryPanel
          delivery={activeDelivery}
          onAdvance={advance}
          onCall={() => callPhone(activeDelivery.customerPhone)}
          onChat={() => onChat(activeDelivery.customer)}
          onSupport={onSupport}
          onNavigate={() => showToast('A abrir navegacao...')}
        />
      )}

      <div className="bottom-space" />
    </main>
  );
}

function showToast(msg: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-check">✓</span> ${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function DeliveryRequestCard({
  request,
  onAccept,
  riderRepo,
  onRefresh,
}: {
  request: { id: string; orderId: string; business: string; businessType: string; customer: string; customerAddress: string; pickupAddress: string; distanceLabel: string; etaLabel: string; earnings: { amount: number }; instructions?: string };
  onAccept: () => void;
  riderRepo: RiderRepository;
  onRefresh: () => void;
}) {
  const [remaining, setRemaining] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          riderRepo.expireDelivery(request.id);
          onRefresh();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [request.id, riderRepo, onRefresh]);

  const pct = (remaining / 15) * 100;

  return (
    <div className="rider-request-card">
      <div className="rider-request-header">
        <span className="rider-request-badge">CORRIDA DISPONIVEL</span>
        <span className="rider-request-timer">{remaining}s</span>
      </div>
      <div className="rider-request-timer-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="rider-request-route">
        <div className="rider-route-point">
          <Store size={14} />
          <div>
            <strong>{request.business}</strong>
            <small>{request.pickupAddress}</small>
          </div>
        </div>
        <div className="rider-route-line" />
        <div className="rider-route-point">
          <MapPin size={14} fill="currentColor" />
          <div>
            <strong>{request.customer}</strong>
            <small>{request.customerAddress}</small>
          </div>
        </div>
      </div>
      <div className="rider-request-meta">
        <span>{request.distanceLabel}</span>
        <span>{request.etaLabel}</span>
        <strong>{formatKz(request.earnings.amount)}</strong>
      </div>
      {request.instructions && (
        <p className="rider-request-instructions">{request.instructions}</p>
      )}
      <button className="btn-primary rider-accept-btn" onClick={onAccept}>
        ACEITAR
      </button>
    </div>
  );
}

function ActiveDeliveryPanel({
  delivery,
  onAdvance,
  onCall,
  onChat,
  onSupport,
  onNavigate,
}: {
  delivery: ActiveDelivery;
  onAdvance: () => void;
  onCall: () => void;
  onChat: () => void;
  onSupport: () => void;
  onNavigate: () => void;
}) {
  const steps: RiderStep[] = ['pickup', 'picked_up', 'delivered'];
  const currentIdx = steps.indexOf(delivery.step);

  return (
    <div className="rider-active-delivery">
      <div className="rider-progress">
        {steps.map((s, i) => {
          const Icon = stepIcons[s];
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={s}
              className={`rider-progress-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <span className="rider-step-dot">
                {isDone ? <Check size={14} /> : <Icon size={14} />}
              </span>
              <span className="rider-step-label">{stepLabels[s]}</span>
              {i < steps.length - 1 && <div className="rider-step-connector" />}
            </div>
          );
        })}
      </div>

      <div className="rider-delivery-info">
        <div className="rider-delivery-route">
          <div className="rider-route-point">
            <Store size={14} />
            <div>
              <strong>{delivery.business}</strong>
              <small>{delivery.pickupAddress}</small>
            </div>
          </div>
          <div className="rider-route-line" />
          <div className="rider-route-point">
            <MapPin size={14} fill="currentColor" />
            <div>
              <strong>{delivery.customer}</strong>
              <small>{delivery.dropoffAddress}</small>
            </div>
          </div>
        </div>

        <div className="rider-delivery-meta">
          <span><Navigation size={13} /> {delivery.distanceLabel}</span>
          <span><Clock3 size={13} /> {delivery.etaLabel}</span>
          <strong>{formatKz(delivery.earnings.amount)}</strong>
        </div>

        {delivery.instructions && (
          <div className="rider-delivery-instructions">
            <small>Instrucao: {delivery.instructions}</small>
          </div>
        )}

        {delivery.tip && delivery.tip.amount > 0 && (
          <div className="rider-delivery-tip">
            Gorjeta: {formatKz(delivery.tip.amount)}
          </div>
        )}
      </div>

      <div className="rider-delivery-actions">
        <button className="btn-primary" onClick={onAdvance}>
          {delivery.step === 'pickup' && 'Cheguei ao local'}
          {delivery.step === 'picked_up' && 'Pedido recolhido'}
          {delivery.step === 'delivered' && 'Marcar como entregue'}
        </button>
        <div className="rider-action-row">
          <button className="rider-action-btn" onClick={onNavigate}>
            <Navigation size={16} /> Navegar
          </button>
          <button className="rider-action-btn" onClick={onCall}>
            <Phone size={16} /> Ligar
          </button>
          <button className="rider-action-btn" onClick={onChat}>
            <MessageCircle size={16} /> Mensagem
          </button>
          <button className="rider-action-btn" onClick={onSupport}>
            <HelpCircle size={16} /> Suporte
          </button>
        </div>
      </div>
    </div>
  );
}
