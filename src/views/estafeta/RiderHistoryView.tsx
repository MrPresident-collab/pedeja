import { MapPin, Star } from 'lucide-react';
import type { RiderRepository } from '@/repositories/riderTypes';
import { formatKz } from '@/utils/format';

type Props = {
  riderRepo: RiderRepository;
};

export function RiderHistoryView({ riderRepo }: Props) {
  const history = riderRepo.getHistory();
  const stats = riderRepo.getStats();

  return (
    <main className="page rider-page inner-page">
      <header className="inner-header">
        <p className="eyebrow">HISTORICO</p>
        <h1>Entregas recentes.</h1>
        <p>O teu historico de trabalho no Pedeja.</p>
      </header>

      <section className="rider-monthly-summary">
        <p className="eyebrow">RESUMO DO MES</p>
        <div className="rider-summary-grid">
          <div className="rider-summary-item">
            <span className="rider-summary-value">{stats.totalDeliveries}</span>
            <small>Entregas</small>
          </div>
          <div className="rider-summary-item">
            <span className="rider-summary-value">{formatKz(stats.todayEarnings.amount * 30)}</span>
            <small>Ganhos</small>
          </div>
          <div className="rider-summary-item">
            <span className="rider-summary-value">{formatKz(stats.avgPerDelivery.amount)}</span>
            <small>Media/corrida</small>
          </div>
          <div className="rider-summary-item">
            <span className="rider-summary-value">{stats.onTimePct}%</span>
            <small>Pontualidade</small>
          </div>
        </div>
      </section>

      <section className="rider-history-list">
        <p className="eyebrow">ENTREGAS</p>
        {history.map((item) => (
          <div className="rider-history-item" key={item.id}>
            <div className="rider-history-left">
              <span className={`rider-history-status ${item.status}`}>
                {item.status === 'completed' ? '✓' : '✕'}
              </span>
            </div>
            <div className="rider-history-info">
              <strong>{item.business}</strong>
              <small>{item.businessType} · {item.date}</small>
              <small className="rider-history-dest">
                <MapPin size={11} /> {item.destination} · {item.distanceLabel}
              </small>
            </div>
            <div className="rider-history-right">
              <strong>{formatKz(item.payout.amount)}</strong>
              {item.rating && (
                <small className="rider-history-rating">
                  <Star size={11} fill="currentColor" /> {item.rating}
                </small>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="bottom-space" />
    </main>
  );
}
