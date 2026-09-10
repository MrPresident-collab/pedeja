import { TrendingUp, Wallet } from 'lucide-react';
import type { RiderRepository } from '@/repositories/riderTypes';
import { formatKz } from '@/utils/format';

type Props = {
  riderRepo: RiderRepository;
};

export function RiderWalletView({ riderRepo }: Props) {
  const earnings = riderRepo.getEarningsBreakdown();
  const stats = riderRepo.getStats();

  const lines: { label: string; amount: number; note?: string; negative?: boolean }[] = [
    { label: 'Base', amount: earnings.basePay.amount },
    { label: 'Distancia', amount: earnings.distancePay.amount },
    { label: 'Tempo de espera', amount: earnings.waitingPay.amount },
    { label: 'Bonus de pico', amount: earnings.peakBonus.amount },
    { label: 'Gorjeta', amount: earnings.customerTip.amount },
    { label: 'Taxas/descontos da plataforma', amount: earnings.platformFee.amount, negative: earnings.platformFee.amount < 0 },
  ];

  return (
    <main className="page rider-page inner-page">
      <header className="inner-header">
        <p className="eyebrow">CARTEIRA</p>
        <h1>Os teus ganhos.</h1>
        <p>Tudo o que ganhaste, transparente.</p>
      </header>

      <div className="rider-balance-hero">
        <Wallet size={28} />
        <div>
          <small>Saldo / ganhos disponiveis</small>
          <strong>{formatKz(earnings.total.amount)}</strong>
        </div>
      </div>

      <section className="rider-earnings-section">
        <p className="eyebrow">DETALHE DE HOJE</p>
        <div className="rider-earnings-list">
          {lines.map((line) => (
            <div className={`rider-earnings-row ${line.negative ? 'negative' : ''}`} key={line.label}>
              <span>{line.label}</span>
              <strong>{line.negative ? '-' : ''}{formatKz(Math.abs(line.amount))}</strong>
            </div>
          ))}
          <div className="rider-earnings-row total">
            <span>Total bruto</span>
            <strong>{formatKz(earnings.total.amount)}</strong>
          </div>
        </div>
      </section>

      <section className="rider-stats-row">
        <div className="rider-stat-mini">
          <span className="rider-stat-mini-value">{stats.deliveriesCompleted}</span>
          <small>Entregas</small>
        </div>
        <div className="rider-stat-mini">
          <span className="rider-stat-mini-value">{formatKz(stats.avgPerDelivery.amount)}</span>
          <small>Media/entrega</small>
        </div>
        <div className="rider-stat-mini">
          <span className="rider-stat-mini-value">{stats.onTimePct}%</span>
          <small>Pontualidade</small>
        </div>
      </section>

      <button className="btn-primary rider-withdraw-btn">
        <TrendingUp size={18} /> Levantar ganhos
      </button>

      <div className="bottom-space" />
    </main>
  );
}
