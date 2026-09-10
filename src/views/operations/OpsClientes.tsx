import { useState } from 'react';
import { Eye, Flag, Phone } from 'lucide-react';
import type { OperationsRepository } from '@/repositories/operationsTypes';
import { formatKzShort } from '@/utils/format';

type Props = {
  repo: OperationsRepository;
  onOrders: () => void;
};

export function OpsClientes({ repo, onOrders }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'suspeito' | 'suspenso'>('all');

  const customers = repo
    .listCustomers()
    .filter((c) => {
      if (filter === 'suspeito') return c.state === 'suspeito';
      if (filter === 'suspenso') return c.state === 'suspenso';
      return true;
    })
    .filter((c) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return c.name.toLowerCase().includes(needle) || c.phone.includes(needle) || c.neighborhood.toLowerCase().includes(needle);
    });

  return (
    <div className="ops-clientes">
      <div className="ops-toolbar">
        <div className="ops-filter-row">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
          <button className={filter === 'suspeito' ? 'active' : ''} onClick={() => setFilter('suspeito')}>Suspeitos</button>
          <button className={filter === 'suspenso' ? 'active' : ''} onClick={() => setFilter('suspenso')}>Suspensos</button>
        </div>
        <div className="ops-search">
          <input type="search" placeholder="Buscar clientes..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Pedidos</th>
              <th>LTV</th>
              <th>Último pedido</th>
              <th>Zona</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong> <span className="ops-muted">desde {c.memberSince}</span></td>
                <td className="ops-mono">{c.phone}</td>
                <td>{c.orders}</td>
                <td className="ops-val">{formatKzShort(c.ltv)}</td>
                <td className="ops-muted">{c.lastOrder}</td>
                <td>{c.neighborhood}</td>
                <td>
                  <span className={`ops-customer-state ${c.state}`}>
                    {c.state === 'ativo' ? 'Ativo' : c.state === 'suspeito' ? 'Suspeito' : 'Suspenso'}
                  </span>
                </td>
                <td>
                  <div className="ops-row-actions">
                    <button className="ops-icon-btn" title="Ver perfil"><Eye size={15} /></button>
                    <button className="ops-icon-btn" title="Ver pedidos" onClick={onOrders}><Flag size={15} /></button>
                    <button className="ops-icon-btn" title="Contactar"><Phone size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={8} className="ops-empty-row">Sem clientes para os filtros escolhidos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}