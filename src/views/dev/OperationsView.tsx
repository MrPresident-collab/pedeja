import { Home, ShieldCheck } from 'lucide-react';

export function OperationsView() {
  return (
    <main className="dev-interface">
      <header className="dev-interface-header">
        <a href="/" className="icon-button"><Home size={20} /></a>
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Painel de operações</h1>
        </div>
      </header>
      <div className="dev-placeholder">
        <span className="dev-placeholder-icon"><ShieldCheck size={40} /></span>
        <h2>Interface de Operações</h2>
        <p>Em desenvolvimento. Esta interface pertence a operacoes.pedeja.ao em produção.</p>
        <div className="dev-ops-note">
          <strong>Arquitectura de segurança</strong>
          <small>Operações é internamente autorizado. Este preview é apenas para validação de UI em desenvolvimento local.</small>
        </div>
        <a href="/" className="btn-secondary" style={{ marginTop: 16, display: 'inline-flex', width: 'auto', padding: '12px 20px' }}>
          Voltar ao Development Hub
        </a>
      </div>
    </main>
  );
}
