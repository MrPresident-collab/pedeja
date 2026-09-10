import { useState } from 'react';
import { Download, Lock } from 'lucide-react';
import type { MerchantRepository } from '@/repositories/merchantTypes';
import { formatKz } from '@/utils/format';

type Props = {
  repo: MerchantRepository;
};

const MOCK_PASSWORD = '1234';

export function MerchantRelatorios({ repo }: Props) {
  const report = repo.getReport();
  const maxRevenue = Math.max(...report.revenueByDay.map((d) => d.amount));
  const [locked, setLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function unlock() {
    if (passwordInput === MOCK_PASSWORD) {
      setLocked(false);
    } else {
      setPasswordError('Palavra-passe incorreta.');
    }
  }

  function exportCsv() {
    const rows = [
      'Dia,Receita',
      ...report.revenueByDay.map((d) => `${d.label},${d.amount}`),
      '',
      'Produto,Pedidos,Receita',
      ...report.topProducts.map((p) => `${p.name},${p.orders},${p.revenue}`),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (locked) {
    return (
      <div className="merchant-config">
        <div className="merchant-page-header">
          <h1>Relatorios</h1>
          <p>Desempenho do teu restaurante.</p>
        </div>
        <div className="merchant-analytics-lock">
          <div className="merchant-analytics-lock-icon"><Lock size={28} /></div>
          <h3>Dados financeiros protegidos</h3>
          <p>Introduz a palavra-passe para aceder aos relatorios e analises.</p>
          <label>
            <span>Palavra-passe</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && unlock()}
              placeholder="1234"
            />
          </label>
          {passwordError && <p className="merchant-password-error">{passwordError}</p>}
          <button className="btn-primary" style={{ width: 'auto', minWidth: 160 }} onClick={unlock}>
            Desbloquear relatorios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-relatorios">
      <div className="merchant-page-header">
        <h1>Relatorios</h1>
        <p>Desempenho do teu restaurante.</p>
      </div>

      <div className="merchant-relatorios-toolbar">
        <button className="btn-secondary merchant-export-btn" onClick={exportCsv}>
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="merchant-report-summary">
        <div className="merchant-report-card">
          <span className="merchant-report-value">{report.totalOrders}</span>
          <small>Pedidos hoje</small>
        </div>
        <div className="merchant-report-card">
          <span className="merchant-report-value">{formatKz(report.totalRevenue)}</span>
          <small>Receita hoje</small>
        </div>
        <div className="merchant-report-card">
          <span className="merchant-report-value">{report.avgPrepTime} min</span>
          <small>Tempo medio</small>
        </div>
        <div className="merchant-report-card">
          <span className="merchant-report-value">{report.targetPrepTime} min</span>
          <small>Tempo alvo</small>
        </div>
        <div className="merchant-report-card">
          <span className="merchant-report-value">{report.lateOrders}</span>
          <small>Pedidos atrasados</small>
        </div>
      </div>

      <div className="merchant-report-grid">
        <div className="merchant-report-section">
          <h3>Receita semanal</h3>
          <div className="merchant-chart">
            {report.revenueByDay.map((day) => (
              <div key={day.label} className="merchant-chart-bar">
                <div className="merchant-chart-bar-track">
                  <div
                    className="merchant-chart-bar-fill"
                    style={{ height: `${(day.amount / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="merchant-chart-label">{day.label}</span>
                <span className="merchant-chart-value">{formatKz(day.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="merchant-report-section">
          <h3>Produtos mais pedidos</h3>
          <div className="merchant-top-products">
            {report.topProducts.map((product, i) => (
              <div className="merchant-top-product" key={i}>
                <span className="merchant-top-rank">#{i + 1}</span>
                <div className="merchant-top-info">
                  <strong>{product.name}</strong>
                  <small>{product.orders} pedidos · {formatKz(product.revenue)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
