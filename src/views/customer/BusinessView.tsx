import { useState } from 'react';
import {
  ArrowLeft,
  Clock3,
  Minus,
  Plus,
  Send,
  ShoppingBag,
  Star,
  Store,
  Utensils,
} from 'lucide-react';
import { repositories } from '@/repositories';
import { showToast } from '@/components/toastStore';
import { formatKz } from '@/utils/format';
import type { Business, Product } from '@/types';

const detailIconMap = { utensils: Utensils, store: Store, 'shopping-bag': ShoppingBag, send: Send };

function deliveryFeeFor(business: Business): number {
  if (business.category === 'compras') return 500;
  if (business.category === 'lojas') return 1000;
  return 700;
}

type Props = { business: Business; onBack: () => void; onCart: () => void };

export function BusinessView({ business, onBack, onCart }: Props) {
  const Icon = detailIconMap[business.icon];
  const cart = repositories.cart;
  const products = repositories.product.listByBusiness(business.id);
  const lines = cart.getLines();
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const [, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  const groups: { category: string; items: Product[] }[] = [];
  for (const p of products) {
    const group = groups.find((g) => g.category === p.category);
    if (group) group.items.push(p);
    else groups.push({ category: p.category, items: [p] });
  }

  function add(product: Product) {
    const current = cart.getBusiness();
    if (current && current.id !== business.id && cart.getLines().length > 0) {
      showToast(`Cesto iniciado de novo para ${business.name}.`);
    }
    cart.setBusiness(business, deliveryFeeFor(business));
    cart.addProduct(product);
    refresh();
  }

  function adjust(productId: string, delta: number) {
    const line = lines.find((l) => l.productId === productId);
    if (!line) return;
    cart.setQuantity(productId, line.quantity + delta);
    refresh();
    if (line.quantity + delta <= 0) {
      const remaining = repositories.cart.getLines();
      if (remaining.length === 0) cart.clear();
    }
  }

  return (
    <main className="page inner-page business-page">
      <header className="category-header">
        <button className="icon-button back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">{business.type.toUpperCase()}</p>
          <h1>{business.name}</h1>
        </div>
      </header>

      <div className="business-hero">
        <span className={`business-hero-icon ${business.tone}`}>
          <Icon size={40} strokeWidth={1.5} />
        </span>
        <div className="business-hero-info">
          <div className="business-hero-meta">
            <Star size={14} fill="currentColor" /> {business.rating} · {business.deliveryMin}–{business.deliveryMax} min
          </div>
          <small>{business.priceLabel}</small>
          <span className={`open-badge ${business.open ? 'open' : 'closed'}`}>
            {business.open ? 'Aberto agora' : 'Fechado'}
          </span>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="business-menu-placeholder">
          <p>Este negócio ainda não tem menu disponível no Pedejá.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section className="menu-group" key={group.category}>
            <p className="eyebrow menu-group-title">{group.category}</p>
            <div className="menu-list">
              {group.items.map((p) => {
                const qty = lines.find((l) => l.productId === p.id)?.quantity ?? 0;
                return (
                  <article className={`menu-item ${p.available ? '' : 'unavailable'}`} key={p.id}>
                    <div className="menu-item-info">
                      <strong>{p.name}</strong>
                      {p.description && <small>{p.description}</small>}
                      <span className="menu-item-meta">
                        <strong>{formatKz(p.price)}</strong>
                        <span className="menu-prep">
                          <Clock3 size={11} /> {p.prepTime} min
                        </span>
                      </span>
                    </div>
                    {qty === 0 ? (
                      <button
                        className="menu-add"
                        onClick={() => add(p)}
                        aria-label={`Adicionar ${p.name}`}
                      >
                        <Plus size={16} />
                      </button>
                    ) : (
                      <div className="menu-stepper">
                        <button onClick={() => adjust(p.id, -1)} aria-label="Remover um">
                          <Minus size={14} />
                        </button>
                        <strong>{qty}</strong>
                        <button onClick={() => adjust(p.id, 1)} aria-label="Adicionar um">
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      <div className="bottom-space" />

      {count > 0 && (
        <button className="cart-bar" onClick={onCart}>
          <span className="cart-bar-icon">
            <ShoppingBag size={18} />
          </span>
          <span className="cart-bar-count">{count} {count === 1 ? 'item' : 'itens'}</span>
          <strong>{formatKz(total)}</strong>
          <span className="cart-bar-arrow">Ver cesto ›</span>
        </button>
      )}
    </main>
  );
}