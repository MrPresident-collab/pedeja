import { useState } from 'react';
import { Bell, Building2, LogOut, MapPin, Phone, Volume2, VolumeX } from 'lucide-react';
import type { MerchantRepository } from '@/repositories/merchantTypes';

type Props = {
  repo: MerchantRepository;
  onSignOut: () => void;
};

const SENSITIVE_FIELDS = ['businessName', 'address', 'phone', 'nif', 'basePrepTime'] as const;
const MOCK_PASSWORD = '1234';

export function MerchantConfig({ repo, onSignOut }: Props) {
  const settings = repo.getSettings();
  const [local, setLocal] = useState({ ...settings });
  const [confirming, setConfirming] = useState<{ field: string; value: unknown } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function update<K extends keyof typeof local>(key: K, value: (typeof local)[K]) {
    if (SENSITIVE_FIELDS.includes(key as (typeof SENSITIVE_FIELDS)[number])) {
      setConfirming({ field: key, value });
      setPasswordInput('');
      setPasswordError('');
      return;
    }
    setLocal((prev) => ({ ...prev, [key]: value }));
    repo.updateSettings({ [key]: value });
  }

  function confirmPassword() {
    if (passwordInput === MOCK_PASSWORD && confirming) {
      const { field, value } = confirming;
      setLocal((prev) => ({ ...prev, [field]: value }));
      repo.updateSettings({ [field]: value });
      setConfirming(null);
    } else {
      setPasswordError('Palavra-passe incorreta.');
    }
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
            <label>
              <span>Telefone</span>
              <div className="merchant-input-with-icon">
                <Phone size={16} />
                <input type="tel" value={local.phone} onChange={(e) => update('phone', e.target.value)} />
              </div>
            </label>
            <label>
              <span>NIF</span>
              <div className="merchant-input-with-icon">
                <Building2 size={16} />
                <input type="text" value={local.nif} onChange={(e) => update('nif', e.target.value)} placeholder="Numero de identificacao fiscal" />
              </div>
            </label>
          </div>
        </section>

        <section className="merchant-config-section">
          <h3>Pedidos</h3>
          <div className="merchant-config-toggle-row">
            <span>
              <strong>{local.ordersPaused ? 'Pedidos pausados' : 'Pedidos ativos'}</strong>
              <small>{local.ordersPaused ? 'Nao esta a aceitar novos pedidos' : 'A aceitar novos pedidos normalmente'}</small>
            </span>
            <button
              className={`merchant-toggle ${local.ordersPaused ? '' : 'on'}`}
              onClick={() => update('ordersPaused', !local.ordersPaused)}
            >
              <span className="merchant-toggle-thumb" />
            </button>
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

        <section className="merchant-config-section merchant-danger-section">
          <h3>Sessao</h3>
          <button className="merchant-signout-btn" onClick={onSignOut}>
            <LogOut size={16} /> Terminar sessao
          </button>
        </section>
      </div>

      {confirming && (
        <div className="merchant-modal-backdrop" onClick={() => setConfirming(null)}>
          <div className="merchant-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar alteracao</h3>
            <p className="merchant-password-desc">
              Introduz a palavra-passe para alterar <strong>{confirming.field}</strong>.
            </p>
            <div className="merchant-form">
              <label>
                <span>Palavra-passe</span>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && confirmPassword()}
                  placeholder="1234"
                  autoFocus
                />
              </label>
              {passwordError && <p className="merchant-password-error">{passwordError}</p>}
              <div className="merchant-form-actions">
                <button className="btn-ghost" onClick={() => setConfirming(null)}>Cancelar</button>
                <button className="btn-primary" style={{ width: 'auto', minWidth: 120 }} onClick={confirmPassword}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
