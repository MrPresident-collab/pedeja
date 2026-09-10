import { Briefcase, Home } from 'lucide-react';

export function MerchantView() {
  return (
    <main className="dev-interface">
      <header className="dev-interface-header">
        <a href="/" className="icon-button"><Home size={20} /></a>
        <div>
          <p className="eyebrow">MERCHANT</p>
          <h1>Painel do comerciante</h1>
        </div>
      </header>
      <div className="dev-placeholder">
        <span className="dev-placeholder-icon"><Briefcase size={40} /></span>
        <h2>Interface do Merchant</h2>
        <p>Em desenvolvimento. Aqui o comerciante verá pedidos, menu e relatórios.</p>
        <a href="/" className="btn-secondary" style={{ marginTop: 16, display: 'inline-flex', width: 'auto', padding: '12px 20px' }}>
          Voltar ao Development Hub
        </a>
      </div>
    </main>
  );
}
