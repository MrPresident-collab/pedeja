import { useState } from 'react';
import { Banknote, CreditCard, Landmark, Shield, Store } from 'lucide-react';
import type { OperationsRepository } from '@/repositories/operationsTypes';

type Props = {
  repo: OperationsRepository;
};

export function OpsConfig({ repo }: Props) {
  const settings = repo.getSettings();
  const staff = repo.listStaff();
  const [local, setLocal] = useState({ ...settings });

  function update<K extends keyof typeof local>(key: K, value: (typeof local)[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
    repo.updateSettings({ [key]: value });
  }

  return (
    <div className="ops-config">
      <section className="ops-preview">
        <span className="ops-env-badge">CONTROLES CONCEPTUAIS</span>
        <p>Estes são controles de configuração <b>conceptuais</b>. A autoridade real será validada do lado do servidor. Não confundir capacidades de mercado com autoridade interna.</p>
      </section>

      <div className="ops-config-grid">
        <section className="ops-panel">
          <h3 className="ops-config-title"><Store size={15} /> Negócios</h3>
          <div className="ops-config-row">
            <span>Restaurantes planeados (alvo 2026)</span>
            <strong>{local.plannedRestaurants}</strong>
          </div>
          <div className="ops-config-row">
            <span>Restaurantes ativos</span>
            <strong>{local.activeRestaurants}</strong>
          </div>
          <div className="ops-config-row">
            <span>Ganho de pesquisa — cidade</span>
            <strong>Luanda</strong>
          </div>
        </section>

        <section className="ops-panel">
          <h3 className="ops-config-title"><Landmark size={15} /> Taxas de entrega</h3>
          <label className="ops-config-field">
            <span>Taxa base (Kz)</span>
            <input type="number" value={local.deliveryBaseFee} onChange={(e) => update('deliveryBaseFee', Number(e.target.value))} />
          </label>
          <label className="ops-config-field">
            <span>Por km (Kz)</span>
            <input type="number" value={local.deliveryPerKm} onChange={(e) => update('deliveryPerKm', Number(e.target.value))} />
          </label>
          <label className="ops-config-field">
            <span>Alerta de preparação (min)</span>
            <input type="number" value={local.minPrepAlertMin} onChange={(e) => update('minPrepAlertMin', Number(e.target.value))} />
          </label>
        </section>

        <section className="ops-panel">
          <h3 className="ops-config-title"><Banknote size={15} /> Métodos de pagamento</h3>
          <div className="ops-config-toggle-row">
            <span className="ops-config-toggle-label">
              <Banknote size={16} />
              <div><strong>Dinheiro</strong><small>Pagamento na entrega</small></div>
            </span>
            <button className={`ops-toggle ${local.cashEnabled ? 'on' : ''}`} onClick={() => update('cashEnabled', !local.cashEnabled)}>
              <span className="ops-toggle-thumb" />
            </button>
          </div>
          <div className="ops-config-toggle-row">
            <span className="ops-config-toggle-label">
              <CreditCard size={16} />
              <div><strong>Multicaixa</strong><small>Pagamento eletrónico</small></div>
            </span>
            <button className={`ops-toggle ${local.multicaixaEnabled ? 'on' : ''}`} onClick={() => update('multicaixaEnabled', !local.multicaixaEnabled)}>
              <span className="ops-toggle-thumb" />
            </button>
          </div>
        </section>

        <section className="ops-panel">
          <h3 className="ops-config-title"><Shield size={15} /> Regras operacionais</h3>
          <p className="ops-config-note">Separação estrita entre <b>capacidades de mercado</b> e <b>autoridade interna</b>.</p>
          <div className="ops-config-tags">
            <span>Merchant approval: revogável pelo staff</span>
            <span>Estafeta: aprovação via documentos</span>
            <span>Operations: autoridade verificada no servidor</span>
            <span>Sem toggle de "admin" em apps de consumo</span>
          </div>
        </section>
      </div>

      <section className="ops-panel">
        <div className="ops-panel-header">
          <h3>Equipa interna & permissões</h3>
          <span className="ops-muted">Padrão InternalStaff · Permission (mock)</span>
        </div>
        <table className="ops-table ops-staff-table">
          <thead><tr><th>Membro</th><th>E-mail</th><th>Função</th><th>Permissões</th><th>Última atividade</th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td className="ops-mono">{s.email}</td>
                <td>{s.role}</td>
                <td><div className="ops-perm-chips">{s.permissions.map((p) => <span key={p}>{p}</span>)}</div></td>
                <td className="ops-muted">{s.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}