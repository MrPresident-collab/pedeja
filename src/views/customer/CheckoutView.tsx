import { useState } from 'react';
import { ArrowLeft, Banknote, CreditCard, MapPin, ShoppingBag } from 'lucide-react';
import { repositories } from '@/repositories';
import { formatKz } from '@/utils/format';
import type { PaymentMethod } from '@/types/domain';

type Props = { onBack: () => void; onPlaced: (orderId: string) => void };

const tipOptions = [0, 200, 500, 1000];

function promoDiscount(subtotal: number): number {
  return Math.round(subtotal * 0.1);
}

export function CheckoutView({ onBack, onPlaced }: Props) {
  const cart = repositories.cart;
  const business = cart.getBusiness();
  const lines = cart.getLines();
  const [tip, setTip] = useState<number>(() => cart.getTip());
  const methods = repositories.payment.listMethods();
  const [method, setMethod] = useState<PaymentMethod>(() =>
    methods.find((m) => m.id === 'cash')?.id ?? 'cash'
  );
  const defaultAddress = repositories.location.getDefaultAddress();

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = business?.promo ? promoDiscount(subtotal) : 0;
  const deliveryFee = cart.getDeliveryFee();
  const total = subtotal - discount + deliveryFee + tip;
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  function placeOrder() {
    if (!business || lines.length === 0) return;
    cart.setTip(tip);
    const order = repositories.order.create({
      merchant: business.name,
      merchantId: business.id,
      type: business.type,
      icon: business.icon,
      lines,
      subtotal,
      discounts: discount,
      deliveryFee,
      tip,
      total,
    });
    cart.clear();
    onPlaced(order.id);
  }

  return (
    <main className="page inner-page checkout-page">
      <header className="category-header">
        <button className="icon-button back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">CHECKOUT</p>
          <h1>Confirmar pedido</h1>
        </div>
      </header>

      {!defaultAddress && (
        <div className="checkout-note">
          <MapPin size={16} />
          <span>Define o teu endereço principal para receberes com precisão.</span>
        </div>
      )}

      <section className="checkout-block">
        <div className="checkout-title-row">
          <p className="eyebrow">RESUMO · {count} {count === 1 ? 'ITEM' : 'ITENS'}</p>
          <strong>{business?.name}</strong>
        </div>
        <div className="checkout-lines">
          {lines.map((l) => (
            <div className="checkout-line" key={l.productId}>
              <span>
                <strong>{l.quantity}×</strong> {l.name}
              </span>
              <span>{formatKz(l.unitPrice * l.quantity)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="checkout-block">
        <div className="checkout-rows">
          <div className="checkout-row">
            <span>Subtotal</span>
            <strong>{formatKz(subtotal)}</strong>
          </div>
          {discount > 0 && (
            <div className="checkout-row promo">
              <span>Promoção primeiro pedido <small>(−10%)</small></span>
              <strong>−{formatKz(discount)}</strong>
            </div>
          )}
          <div className="checkout-row">
            <span>Entrega</span>
            <strong>{formatKz(deliveryFee)}</strong>
          </div>
          <div className="checkout-row">
            <span>Gorjeta</span>
            <strong>{tip > 0 ? formatKz(tip) : '—'}</strong>
          </div>
          <div className="checkout-row total">
            <span>Total</span>
            <strong>{formatKz(total)}</strong>
          </div>
        </div>
      </section>

      <p className="step-section-title">Gorjeta para o estafeta</p>
      <div className="tip-options">
        {tipOptions.map((value) => (
          <button
            key={value}
            className={tip === value ? 'selected' : ''}
            onClick={() => setTip(value)}
          >
            {value === 0 ? 'Sem gorjeta' : formatKz(value)}
          </button>
        ))}
      </div>

      <p className="step-section-title">Pagamento</p>
      <div className="payment-options">
        {methods.map((m) => {
          const Icon = m.id === 'cash' ? Banknote : m.id === 'multicaixa' ? CreditCard : ShoppingBag;
          return (
            <button
              key={m.id}
              className={`payment-option ${method === m.id ? 'selected' : ''} ${m.available ? '' : 'disabled'}`}
              onClick={() => m.available && setMethod(m.id)}
              disabled={!m.available}
            >
              <span className="payment-option-icon">
                <Icon size={20} />
              </span>
              <span>{m.label}</span>
              {m.available && method === m.id && <span className="payment-check">✓</span>}
              {!m.available && <small>Em breve</small>}
            </button>
          );
        })}
      </div>

      <p className="checkout-tip-note">
        {method === 'cash'
          ? 'Pagas em dinheiro ao estafeta na entrega.'
          : 'O Multicaixa será processado na confirmação do pagamento.'}
      </p>

      <button className="btn-primary checkout-submit" onClick={placeOrder}>
        Fazer pedido · {formatKz(total)}
      </button>
    </main>
  );
}