import { useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { repositories } from '@/repositories';
import { computePricing } from '@/services/ordering/pricing';
import { EmptyState } from '@/components/EmptyState';
import { formatKz } from '@/utils/format';
import type { Business } from '@/types';

type Props = { business: Business | null; onBack: () => void; onCheckout: () => void };

export function CartView({ business, onBack, onCheckout }: Props) {
  const cart = repositories.cart;
  const lines = cart.getLines();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const pricing = computePricing(lines, business?.promo === true, cart.getDeliveryFee(), 0);

  function adjust(productId: string, delta: number) {
    const line = lines.find((l) => l.productId === productId);
    if (!line) return;
    cart.setQuantity(productId, line.quantity + delta);
    refresh();
  }

  function remove(productId: string) {
    cart.removeProduct(productId);
    refresh();
  }

  return (
    <main className="page inner-page cart-page">
      <header className="category-header">
        <button className="icon-button back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">CESTO</p>
          <h1>{business?.name ?? 'O teu cesto'}</h1>
        </div>
      </header>

      {!business || lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} />}
          title="O teu cesto está vazio"
          message="Escolhe algo num negócio para começares."
          action={
            <button className="btn-primary" onClick={onBack}>
              Ir explorar
            </button>
          }
        />
      ) : (
        <>
          <div className="checkout-lines">
            {lines.map((l) => (
              <div className="cart-line" key={l.productId}>
                <div className="cart-line-info">
                  <strong>{l.name}</strong>
                  <small>{formatKz(l.unitPrice)} cada</small>
                </div>
                <div className="menu-stepper">
                  <button onClick={() => adjust(l.productId, -1)} aria-label="Remover um">
                    <Minus size={14} />
                  </button>
                  <strong>{l.quantity}</strong>
                  <button onClick={() => adjust(l.productId, 1)} aria-label="Adicionar um">
                    <Plus size={14} />
                  </button>
                </div>
                <strong className="cart-line-total">{formatKz(l.unitPrice * l.quantity)}</strong>
                <button
                  className="cart-line-remove"
                  onClick={() => remove(l.productId)}
                  aria-label={`Remover ${l.name} do cesto`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="checkout-rows">
            <div className="checkout-row">
              <span>Subtotal</span>
              <strong>{formatKz(pricing.subtotal)}</strong>
            </div>
            <div className="checkout-row">
              <span>Entrega</span>
              <strong>{formatKz(pricing.deliveryFee)}</strong>
            </div>
            {pricing.discount > 0 && (
              <div className="checkout-row promo">
                <span>Promoção primeiro pedido <small>(−10%)</small></span>
                <strong>−{formatKz(pricing.discount)}</strong>
              </div>
            )}
            <div className="checkout-row total">
              <span>Total</span>
              <strong>{formatKz(pricing.total)}</strong>
            </div>
          </div>

          <button className="btn-primary cart-submit" onClick={onCheckout}>
            Continuar para o checkout · {formatKz(pricing.total)}
          </button>
        </>
      )}
      <div className="bottom-space" />
    </main>
  );
}