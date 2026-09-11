import { ArrowLeft, ChevronRight, Search, Star } from 'lucide-react';
import { FilterChip } from '@/components/FilterChip';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { repositories } from '@/repositories';
import type { Business, Category } from '@/types';
import { useState } from 'react';
import { Utensils, ShoppingBag, Store, Send } from 'lucide-react';

const iconMap = { utensils: Utensils, store: Store, 'shopping-bag': ShoppingBag, send: Send };

const categoryConfig: Record<Category, { title: string; eyebrow: string; description: string; filters: string[] }> = {
  comida: { title: 'Comida', eyebrow: 'COMIDA', description: 'Restaurantes e cozinhas perto de ti.', filters: ['Perto de ti', 'Mais pedidos', 'Promo', 'Aberto', '<20 min'] },
  compras: { title: 'Compras', eyebrow: 'COMPRAS', description: 'O que precisas no dia a dia.', filters: ['Perto de ti', 'Aberto', 'Farmácia', 'Mercearia', 'Promo'] },
  lojas: { title: 'Lojas', eyebrow: 'LOJAS', description: 'Supermercados e grandes lojas.', filters: ['Perto de ti', 'Supermercados', 'Centros comerciais', 'Aberto', 'Promo'] },
  enviar: { title: 'Enviar', eyebrow: 'ENVIAR', description: 'Envia algo para alguém.', filters: [] },
};

type Props = {
  category: Category;
  onBack: () => void;
  onBusiness: (b: Business) => void;
};

export function CategoryView({ category, onBack, onBusiness }: Props) {
  const config = categoryConfig[category];
  const [selectedFilter, setSelectedFilter] = useState(config.filters[0] ?? '');
  const businesses = repositories.merchant.listByCategory(category);

  if (category === 'enviar') {
    return null;
  }

  return (
    <main className="page inner-page">
      <header className="category-header">
        <button className="icon-button back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
        </div>
      </header>

      <div className="search-bar">
        <Search size={19} />
        <span>Procurar em {config.title}...</span>
      </div>

      {config.filters.length > 0 && (
        <div className="filter-row">
          {config.filters.map((filter) => (
            <FilterChip key={filter} active={selectedFilter === filter} onClick={() => setSelectedFilter(filter)}>
              {filter}
            </FilterChip>
          ))}
        </div>
      )}

      {businesses.length > 0 ? (
        <section className="section-block">
          <SectionHeader eyebrow="RESULTADOS" title={`${businesses.length} ${businesses.length === 1 ? 'negócio' : 'negócios'} perto de ti`} />
          <div className="business-list">
            {businesses.map((b) => {
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
      ) : (
        <EmptyState
          icon={<Store size={28} />}
          title={`Não encontrámos ${config.title.toLowerCase()} perto de ti.`}
          message="Tenta mudar a tua localização ou voltar mais tarde."
        />
      )}
    </main>
  );
}
