import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  ChevronRight,
  MapPin,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Utensils,
} from 'lucide-react';
import { FilterChip } from '@/components/FilterChip';
import { SectionHeader } from '@/components/SectionHeader';
import { repositories } from '@/repositories';
import type { Business, Category } from '@/types';

const filters = ['Perto de ti', 'Mais pedidos', 'Promo', 'Aberto', '<20 min'];

const categoryMeta: { label: string; detail: string; icon: typeof Utensils; tone: string; cat: Category }[] = [
  { label: 'Comida', detail: 'Restaurantes perto de ti', icon: Utensils, tone: 'food', cat: 'comida' },
  { label: 'Compras', detail: 'O que precisas no dia a dia', icon: ShoppingBag, tone: 'shop', cat: 'compras' },
  { label: 'Enviar', detail: 'Envia algo para alguém', icon: Send, tone: 'send', cat: 'enviar' },
  { label: 'Lojas', detail: 'Supermercados e grandes lojas', icon: Store, tone: 'stores', cat: 'lojas' },
];

const iconMap = { utensils: Utensils, store: Store, 'shopping-bag': ShoppingBag, send: Send };

type Props = {
  onAddress: () => void;
  onCategory: (cat: Category) => void;
  onBusiness: (b: Business) => void;
};

export function HomeView({ onAddress, onCategory, onBusiness }: Props) {
  const [selectedFilter, setSelectedFilter] = useState('Perto de ti');
  const profile = repositories.profile.getProfile();
  const nearby = repositories.merchant.listNearby(4);

  return (
    <main className="page home-page">
      <header className="topbar">
        <button className="location-button" onClick={onAddress}>
          <span className="location-icon">
            <MapPin size={16} fill="currentColor" />
          </span>
          <span>
            <small>Entregar em</small>
            <strong>
              Talatona, Luanda <ChevronRight size={14} />
            </strong>
          </span>
        </button>
        <button className="icon-button notification-button">
          <Bell size={20} />
          <span />
        </button>
      </header>

      <section className="home-intro">
        <p className="greeting">Olá, {profile.name.split(' ')[0]}</p>
        <h1>
          O que precisas
          <br />
          <span>hoje?</span>
        </h1>
      </section>

      <section className="category-grid">
        {categoryMeta.map(({ label, detail, icon: Icon, tone, cat }) => (
          <button
            className={`category-item ${tone}`}
            key={label}
            onClick={() => onCategory(cat)}
          >
            <span className="category-icon">
              <Icon size={24} strokeWidth={1.8} />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <ChevronRight size={16} className="category-arrow" />
          </button>
        ))}
      </section>

      <div className="search-bar">
        <Search size={19} />
        <span>O que procuras?</span>
        <button>
          <Sparkles size={17} />
        </button>
      </div>

      <section className="promo-banner">
        <div>
          <span className="promo-label">PARA COMEÇAR</span>
          <h2>
            O teu primeiro pedido
            <br />
            começa aqui.
          </h2>
          <button onClick={() => onCategory('comida')}>
            Explorar agora <ArrowRight size={15} />
          </button>
        </div>
        <div className="promo-art">
          <div className="promo-bag">
            <ShoppingBag size={34} />
          </div>
          <span className="promo-spark spark-a">✦</span>
          <span className="promo-spark spark-b">✦</span>
        </div>
      </section>

      <section className="section-block">
        <SectionHeader
          eyebrow="DESCOBRIR PERTO DE TI"
          title="Escolhe por onde começar"
          action={
            <button className="see-all">
              Ver tudo <ChevronRight size={15} />
            </button>
          }
        />
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
        <div className="business-list">
          {nearby.map((b) => {
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

      <div className="bottom-space" />
    </main>
  );
}
