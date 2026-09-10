import { useState } from 'react';
import { Bell, MapPin, Volume2, VolumeX } from 'lucide-react';
import type { MerchantRepository } from '@/repositories/merchantTypes';

type Props = {
  repo: MerchantRepository;
};

export function MerchantConfig({ repo }: Props) {
  const settings = repo.getSettings();
  const [local, setLocal] = useState({ ...settings });

  function update<K extends keyof typeof local>(key: K, value: (typeof local)[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
    repo.updateSettings({ [key]: value });
  }

  return (
    <div className="merchant-config">
      <div className="merchant-page-header">
        <h1>Configuracoes</h1>
        <p>Gerir o teu restaurante.</p>
      </div>

      <div className="merchant-config-grid">
        <section className="merchant-config-section">
          <h3>Negocio</h3>
          <div className="merchant-config-form">
            <label>
              <span>Nome do restaurante</span>
              <input type="text" value={local.businessName} onChange={(e) => update('businessName', e.target.value)} />
            </label>
            <label>
              <span>Endereco</span>
              <div className="merchant-input-with-icon">
                <MapPin size={16} />
                <input type="text" value={local.address} onChange={(e) => update('address', e.target.value)} />
              </div>
            </label>
          </div>
        </section>

        <section className="merchant-config-section">
          <h3>Horario</h3>
          <div className="merchant-config-toggle-row">
            <span>
              <strong>{local.open ? 'Restaurante aberto' : 'Restaurante fechado'}</strong>
              <small>{local.open ? 'A receber pedidos' : 'Nao esta a receber pedidos'}</small>
            </span>
            <button
              className={`merchant-toggle ${local.open ? 'on' : ''}`}
              onClick={() => update('open', !local.open)}
            >
              <span className="merchant-toggle-thumb" />
            </button>
          </div>
        </section>

        <section className="merchant-config-section">
          <h3>Preparacao</h3>
          <div className="merchant-config-form">
            <label>
              <span>Tempo base de preparacao (min)</span>
              <input type="number" value={local.basePrepTime} onChange={(e) => update('basePrepTime', Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="merchant-config-section">
          <h3>Notificacoes</h3>
          <div className="merchant-config-toggle-row">
            <span className="merchant-config-toggle-label">
              <Bell size={16} />
              <div>
                <strong>Notificacoes push</strong>
                <small>Receber alertas de novos pedidos</small>
              </div>
            </span>
            <button
              className={`merchant-toggle ${local.notificationEnabled ? 'on' : ''}`}
              onClick={() => update('notificationEnabled', !local.notificationEnabled)}
            >
              <span className="merchant-toggle-thumb" />
            </button>
          </div>
          <div className="merchant-config-toggle-row">
            <span className="merchant-config-toggle-label">
              {local.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <div>
                <strong>Som</strong>
                <small>Som ao receber pedido</small>
              </div>
            </span>
            <button
              className={`merchant-toggle ${local.soundEnabled ? 'on' : ''}`}
              onClick={() => update('soundEnabled', !local.soundEnabled)}
            >
              <span className="merchant-toggle-thumb" />
            </button>
          </div>
        </section>

        <section className="merchant-config-section">
          <h3>Instrucoes para estafetas</h3>
          <div className="merchant-config-form">
            <label>
              <textarea
                value={local.riderInstructions}
                onChange={(e) => update('riderInstructions', e.target.value)}
                rows={4}
                placeholder="Instrucoes de recolha para os estafetas..."
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
