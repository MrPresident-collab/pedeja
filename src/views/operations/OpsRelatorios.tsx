import { useMemo } from 'react';
import { Download } from 'lucide-react';
import type { OperationsRepository } from '@/repositories/operationsTypes';
import { formatKz, formatKzShort } from '@/utils/format';

type Props = {
  repo: OperationsRepository;
};

function exportCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OpsRelatorios({ repo }: Props) {
  const report = repo.getReports();
  const orders = repo.listOrders();
  const totalOrders = orders.length;

  const latePct = (needle: string) => {
    const found = report.late.byReason.find((r) => r.label === needle)?.value ?? 0;
    return report.late.count > 0 ? Math.round((found / report.late.count) * 100) : 0;
  };

  const reportRows = useMemo(() => ({
    late: report.late.byReason.map((r) => [r.label, String(r.value)]),
  }), [report]);

  function exportLateReport() {
    exportCsv('relatorio-atrasos', [
      ['Motivo', 'Quantidade'],
      ...reportRows.late,
    ]);
  }

  function exportPaymentMix() {
    exportCsv('relatorio-pagamentos', [
      ['Método', 'Pedidos'],
      ...report.paymentMix.map((p) => [p.method === 'cash' ? 'Dinheiro' : 'Multicaixa', String(p.count)]),
    ]);
  }

  function exportRiders() {
    exportCsv('relatorio-estafetas', [
      ['Estafeta', 'Entregas', '% No tempo', 'Tempo médio (min)', 'Avaliação'],
      ...report.riderPerformance.map((r) => [r.rider, String(r.deliveries), String(r.onTimePct), String(r.avgMin), String(r.rating)]),
    ]);
  }

  return (
    <div className="ops-relatorios">
      <section className="ops-preview">
        <span className="ops-env-badge">REPORTING MOCK</span>
        <p>Os relatórios abaixo operam sobre dados simulados. Serão ligados ao backend operacional depois.</p>
      </section>

      <section className="ops-panel">
        <div className="ops-panel-header">
          <h3>Atrasos de entrega — porquê?</h3>
          <button className="ops-btn" onClick={exportLateReport}><Download size={14} /> Exportar CSV</button>
        </div>
        <div className="ops-report-grid">
          <div className="ops-bars">
            {report.late.byReason.map((reason) => (
              <div key={reason.label} className="ops-report-bar">
                <span className="ops-report-label">{reason.label} <b>{reason.value}</b></span>
                <div className="ops-report-track">
                  <div className="ops-report-fill" style={{ width: `${latePct(reason.label)}%` }} />
                </div>
                <span className="ops-report-pct">{latePct(reason.label)}%</span>
              </div>
            ))}
          </div>
          <div className="ops-report-callout">
            <span className="ops-report-big">{report.late.count}</span>
            <small>pedidos atrasados hoje</small>
            <p>Motivo principal: <b>{report.late.byReason.sort((a, b) => b.value - a.value)[0].label}</b>.</p>
            <p className="ops-muted">Recomendação: rever o tempo de preparação dos negócios com maior incidência e a disponibilidade de estafetas na zona.</p>
          </div>
        </div>
      </section>

      <div className="ops-report-2col">
        <section className="ops-panel">
          <div className="ops-panel-header">
            <h3>Desempenho de estafetas</h3>
            <button className="ops-btn ghost" onClick={exportRiders}><Download size={14} /> CSV</button>
          </div>
          <table className="ops-table">
            <thead><tr><th>Estafeta</th><th>Entregas</th><th>% No tempo</th><th>Tempo médio</th><th>Ó</th></tr></thead>
            <tbody>
              {report.riderPerformance.map((r) => (
                <tr key={r.rider}>
                  <td><strong>{r.rider}</strong></td>
                  <td>{r.deliveries}</td>
                  <td>
                    <span className={`ops-perf ${r.onTimePct >= 85 ? 'good' : r.onTimePct >= 75 ? 'mid' : 'low'}`}>
                      {r.onTimePct}%
                    </span>
                  </td>
                  <td>{r.avgMin} min</td>
                  <td>{r.rating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ops-panel">
          <div className="ops-panel-header">
            <h3>Desempenho de negócios</h3>
            <button className="ops-btn ghost" onClick={() => exportCsv('relatorio-negocios', [
              ['Negócio', 'Pedidos', 'Atrasos', 'Prep. média'],
              ...report.merchantPerformance.map((m) => [m.merchant, String(m.orders), String(m.lateCount), `${m.avgPrepMin} min`]),
            ])}><Download size={14} /> CSV</button>
          </div>
          <table className="ops-table">
            <thead><tr><th>Negócio</th><th>Pedidos</th><th>Atrasos</th><th>Prep. média</th></tr></thead>
            <tbody>
              {report.merchantPerformance.map((m) => (
                <tr key={m.merchant}>
                  <td><strong>{m.merchant}</strong></td>
                  <td>{m.orders}</td>
                  <td className={m.lateCount > 3 ? 'ops-red' : ''}>{m.lateCount}</td>
                  <td>{m.avgPrepMin > 0 ? `${m.avgPrepMin} min` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="ops-panel">
        <div className="ops-panel-header">
          <h3>Resumo operacional</h3>
        </div>
        <div className="ops-summary-grid">
          <div><span>Pedidos (amostra)</span><strong>{totalOrders}</strong></div>
          <div><span>Pedidos cancelados</span><strong className="ops-red">{report.cancelledOrders}</strong></div>
          <div><span>Tempo médio de entrega</span><strong>{report.avgDeliveryMin} min</strong></div>
          <div><span>Receita diária</span><strong>{formatKzShort(report.revenue.daily)}</strong></div>
          <div><span>Receita semanal</span><strong>{formatKzShort(report.revenue.weekly)}</strong></div>
          <div><span>Receita mensal</span><strong>{formatKzShort(report.revenue.monthly)}</strong></div>
        </div>
        <div className="ops-method-mix">
          <span className="ops-method-chip cash">Dinheiro · {report.paymentMix.find((p) => p.method === 'cash')?.count ?? 0} pedidos</span>
          <span className="ops-method-chip card">Multicaixa · {report.paymentMix.find((p) => p.method === 'multicaixa')?.count ?? 0} pedidos</span>
          <button className="ops-btn ghost" onClick={exportPaymentMix}><Download size={14} /> Exportar mix de pagamentos</button>
        </div>
      </section>

      <section className="ops-panel">
        <div className="ops-panel-header">
          <h3>Receita (7 dias)</h3>
          <span className="ops-panel-total">{formatKz(5735744)}</span>
        </div>
        <div className="ops-bar-chart">
          {[
            { label: 'Seg', value: 620400 }, { label: 'Ter', value: 581200 }, { label: 'Qua', value: 745900 },
            { label: 'Qui', value: 690300 }, { label: 'Sex', value: 988700 }, { label: 'Sáb', value: 1104500 },
            { label: 'Dom', value: 842550 },
          ].map((day) => {
            const max = 1104500;
            return (
              <div key={day.label} className="ops-bar">
                <div className="ops-bar-track"><div className="ops-bar-fill" style={{ height: `${(day.value / max) * 100}%` }} /></div>
                <span className="ops-bar-label">{day.label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}