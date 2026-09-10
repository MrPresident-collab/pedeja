import { Bike, Home } from 'lucide-react';

export function EstafetaView() {
  return (
    <main className="dev-interface">
      <header className="dev-interface-header">
        <a href="/" className="icon-button"><Home size={20} /></a>
        <div>
          <p className="eyebrow">ESTAFETA</p>
          <h1>Painel do estafeta</h1>
        </div>
      </header>
      <div className="dev-placeholder">
        <span className="dev-placeholder-icon"><Bike size={40} /></span>
        <h2>Interface do Estafeta</h2>
        <p>Em desenvolvimento. Aqui o estafeta verá entregas, ganhos e navegação.</p>
        <a href="/" className="btn-secondary" style={{ marginTop: 16, display: 'inline-flex', width: 'auto', padding: '12px 20px' }}>
          Voltar ao Development Hub
        </a>
      </div>
    </main>
  );
}
