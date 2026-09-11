import {
  ArrowRight,
  Bell,
  ChevronRight,
  MapPin,
  Send,
  ShoppingBag,
  Store,
  Utensils,
} from 'lucide-react';
import { repositories } from '@/repositories';
import { showToast } from '@/components/toastStore';
import type { Address, Category } from '@/types';

const categoryMeta: { label: string; detail: string; icon: typeof Utensils; tone: string; cat: Category }[] = [
  { label: 'Comida', detail: 'Restaurantes perto de ti', icon: Utensils, tone: 'food', cat: 'comida' },
  { label: 'Compras', detail: 'O que precisas no dia a dia', icon: ShoppingBag, tone: 'shop', cat: 'compras' },
  { label: 'Enviar', detail: 'Envia algo para alguém', icon: Send, tone: 'send', cat: 'enviar' },
  { label: 'Lojas', detail: 'Supermercados e grandes lojas', icon: Store, tone: 'stores', cat: 'lojas' },
];

type Props = {
  onAddress: () => void;
  onCategory: (cat: Category) => void;
  onMarketplace: () => void;
  defaultAddress: Address | null;
};

export function HomeView({ onAddress, onCategory, onMarketplace, defaultAddress }: Props) {
  const profile = repositories.profile.getProfile();
  const activeOrders = repositories.order.listActive();
  const activeCount = activeOrders.length;

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
              {defaultAddress?.line ?? 'Adiciona um endereço'} <ChevronRight size={14} />
            </strong>
          </span>
        </button>
        <button
          className="icon-button notification-button"
          onClick={() => {
            if (activeCount > 0) {
              const o = activeOrders[0];
              showToast(`Pedido ${o.id}: ${o.merchant}`);
            } else {
              showToast('Sem notificacoes novas.');
            }
          }}
        >
          <Bell size={20} />
          {activeCount > 0 && <span />}
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

      <section className="promo-banner">
        <div>
          <span className="promo-label">PARA COMEÇAR</span>
          <h2>
            O teu primeiro pedido
            <br />
            começa aqui.
          </h2>
          <button onClick={onMarketplace}>
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

      <div className="bottom-space" />
    </main>
  );
}
