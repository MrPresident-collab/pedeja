import { Banknote, CreditCard, TrendingUp } from 'lucide-react';
import type { OperationsRepository } from '@/repositories/operationsTypes';
import { formatKz, formatKzShort } from '@/utils/format';

type Props = {
  repo: OperationsRepository;
};

export function OpsReceita({ repo }: Props) {
  const revenue = repo.getRevenue();
  const reconciliation = repo.getReconciliation();
  const cash = repo.getCashPosition();

  const gross = revenue.breakdown.find((b) => b.label === 'Volume bruto')?.value ?? revenue.daily;

  return (
    <div className="ops-receita">
      <section className="ops-kpis">
        <div className="ops-kpi-card accent">
          <span className="ops-kpi-icon"><TrendingUp size={18} /></span>
          <div><strong>{formatKzShort(revenue.daily)}</strong><small>Receita diária</small></div>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-icon"><TrendingUp size={18} /></span>
          <div><strong>{formatKzShort(revenue.weekly)}</strong><small>Receita semanal</small></div>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-icon"><TrendingUp size={18} /></span>
          <div><strong>{formatKzShort(revenue.monthly)}</strong><small>Receita mensal</small></div>
        </div>
      </section>

      <div className="ops-receita-grid">
        <section className="ops-panel">
          <h3>Volume por métodos de pagamento</h3>
          <div className="ops-payment-split">
            {revenue.byPaymentMethod.map((m) => {
              const pct = gross > 0 ? Math.round((m.volume / gross) * 100) : 0;
              return (
                <div key={m.method} className="ops-payment-method">
                  <span className={`ops-pay-icon ${m.method}`}>
                    {m.method === 'cash' ? <Banknote size={16} /> : <CreditCard size={16} />}
                  </span>
                  <div>
                    <strong>{m.method === 'cash' ? 'Dinheiro' : 'Multicaixa'}</strong>
                    <small>{m.orders} pedidos</small>
                  </div>
                  <b className="ops-mono">{formatKz(m.volume)}</b>
                  <span className="ops-payment-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="ops-split-bar">
            {revenue.byPaymentMethod.map((m) => {
              const pct = gross > 0 ? (m.volume / gross) * 100 : 0;
              return (
                <span
                  key={m.method}
                  className={m.method === 'cash' ? 'cash' : 'card'}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        </section>

        <section className="ops-panel">
          <h3>Capote da receita</h3>
          <div className="ops-breakdown">
            {revenue.breakdown.map((b) => (
              <div key={b.label} className="ops-breakdown-row">
                <span>{b.label}</span>
                <span className={`ops-mono ${b.value < 0 ? 'ops-red' : ''}`}>{formatKz(b.value)}</span>
              </div>
            ))}
            <div className="ops-breakdown-row total">
              <span>Resultado líquido</span>
              <span className="ops-mono">{formatKz(-21600)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="ops-cash-position">
        <h3 className="ops-section-title">Operações de caixa</h3>
        <div className="ops-cash-grid">
          <div className="ops-cash-card"><span>Dinheiro recebido</span><strong>{formatKz(cash.received)}</strong></div>
          <div className="ops-cash-card warn"><span>Dinheiro pendente</span><strong>{formatKz(cash.pending)}</strong></div>
          <div className="ops-cash-card"><span>Dinheiro a entregar</span><strong>{formatKz(cash.toDeliver)}</strong></div>
          <div className="ops-cash-card danger"><span>Diferenças de caixa</span><strong>{formatKz(cash.differences)}</strong></div>
        </div>
      </section>

      <section className="ops-panel">
        <div className="ops-panel-header">
          <h3>Reconciliação Multicaixa</h3>
          <span className="ops-muted">Última sincronização: há 12 min</span>
        </div>
        <table className="ops-table ops-recon-table">
          <thead>
            <tr><th>Ref</th><th>Pedido</th><th>Valor</th><th>Estado</th><th>Atualizado</th></tr>
          </thead>
          <tbody>
            {reconciliation.map((item) => (
              <tr key={item.id}>
                <td className="ops-mono">{item.id}</td>
                <td className="ops-mono">{item.orderId}</td>
                <td className="ops-mono">{formatKz(item.amount)}</td>
                <td>
                  <span className={`ops-recon-state ${item.state}`}>
                    {item.state === 'confirmado' ? 'Confirmado' : item.state === 'pendente' ? 'Pendente' : 'Divergente'}
                  </span>
                </td>
                <td className="ops-muted">{item.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}