import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Utensils,
} from 'lucide-react';
import { FilterChip } from '@/components/FilterChip';
import { repositories } from '@/repositories';
import type { Business } from '@/types';

const filters = ['Perto de ti', 'Mais pedidos', 'Baixou', 'Novo'];

const iconMap = { utensils: Utensils, store: Store, 'shopping-bag': ShoppingBag, send: Send };

type Props = {
  onBack: () => void;
  onBusiness: (b: Business) => void;
};

export function MarketplaceView({ onBack, onBusiness }: Props) {
  const [selectedFilter, setSelectedFilter] = useState('Perto de ti');
  const allBusinesses = repositories.merchant.listNearby();
  const nearBusinesses = repositories.merchant.listNearby(4);

  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? allBusinesses.filter(
        (b) =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.type.toLowerCase().includes(query.toLowerCase()),
      )
    : allBusinesses;

  return (
    <main className="page marketplace-page">
      <header className="category-header">
        <button className="icon-button back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Marketplace</h1>
        </div>
      </header>

      <div className="search-bar">
        <Search size={19} />
        <input
          type="text"
          placeholder="O que procuras?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="marketplace-search-input"
        />
        <button className="marketplace-ai-btn">
          <Sparkles size={17} />
        </button>
      </div>

      <div className="filter-row">
        {filters.map((filter) => (
          <FilterChip
            key={filter}
            active={selectedFilter === filter}
            onClick={() => setSelectedFilter(filter)}
          >
            {filter}
          </FilterChip>
        ))}
      </div>

      <section className="marketplace-category-pills">
        <button className="marketplace-pill">
          <span className="marketplace-pill-icon food"><Utensils size={16} /></span>
          Comida
        </button>
        <button className="marketplace-pill">
          <span className="marketplace-pill-icon shop"><ShoppingBag size={16} /></span>
          Compras
        </button>
        <button className="marketplace-pill">
          <span className="marketplace-pill-icon stores"><Store size={16} /></span>
          Lojas
        </button>
        <button className="marketplace-pill">
          <span className="marketplace-pill-icon send"><Send size={16} /></span>
          Enviar
        </button>
      </section>

      {query.trim() ? (
        <section className="section-block">
          <p className="eyebrow">RESULTADOS</p>
          <div className="business-list">
            {filtered.length > 0 ? (
              filtered.map((b) => {
                const Icon = iconMap[b.icon];
                return (
                  <button className="business-row" key={b.id} onClick={() => onBusiness(b)}>
                    <span className={`business-avatar ${b.tone}`}>
                      <Icon size={22} />
                    </span>
                    <span className="business-info">
                      <strong>{b.name}</strong>
                      <small>{b.type}</small>
                      <small className="business-meta">
                        <Star size={12} fill="currentColor" /> {b.rating} · {b.deliveryMin}–{b.deliveryMax} min
                      </small>
                    </span>
                    <span className="business-right">
                      <small>{b.priceLabel}</small>
                      <ChevronRight size={17} />
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="marketplace-empty">Nenhum resultado encontrado.</p>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="section-block">
            <p className="eyebrow">PERTO DE TI</p>
            <div className="business-list">
              {nearBusinesses.map((b) => {
                const Icon = iconMap[b.icon];
                return (
                  <button className="business-row" key={b.id} onClick={() => onBusiness(b)}>
                    <span className={`business-avatar ${b.tone}`}>
                      <Icon size={22} />
                    </span>
                    <span className="business-info">
                      <strong>{b.name}</strong>
                      <small>{b.type}</small>
                      <small className="business-meta">
                        <Star size={12} fill="currentColor" /> {b.rating} · {b.deliveryMin}–{b.deliveryMax} min
                      </small>
                    </span>
                    <span className="business-right">
                      <small>{b.priceLabel}</small>
                      <ChevronRight size={17} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="section-block">
            <p className="eyebrow">RECOMENDADOS</p>
            <div className="business-list">
              {allBusinesses.slice(2).map((b) => {
                const Icon = iconMap[b.icon];
                return (
                  <button className="business-row" key={b.id} onClick={() => onBusiness(b)}>
                    <span className={`business-avatar ${b.tone}`}>
                      <Icon size={22} />
                    </span>
                    <span className="business-info">
                      <strong>{b.name}</strong>
                      <small>{b.type}</small>
                      <small className="business-meta">
                        <Star size={12} fill="currentColor" /> {b.rating} · {b.deliveryMin}–{b.deliveryMax} min
                      </small>
                    </span>
                    <span className="business-right">
                      <small>{b.priceLabel}</small>
                      <ChevronRight size={17} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <div className="bottom-space" />
    </main>
  );
}
