import { useState } from 'react';
import { ArrowLeft, Banknote, CreditCard, MapPin, ShoppingBag } from 'lucide-react';
import { repositories } from '@/repositories';
import { computePricing } from '@/services/ordering/pricing';
import { placeOrder } from '@/services/ordering/placeOrder';
import { showToast } from '@/components/toastStore';
import { EmptyState } from '@/components/EmptyState';
import { formatKz } from '@/utils/format';
import type { Address } from '@/types';
import type { PaymentMethod } from '@/types/common';

type Props = {
  onBack: () => void;
  onPlaced: (orderId: string) => void;
  address: Address | null;
  onChangeAddress: () => void;
};

const tipOptions = [0, 200, 500, 1000];

export function CheckoutView({ onBack, onPlaced, address, onChangeAddress }: Props) {
  const cart = repositories.cart;
  const business = cart.getBusiness();
  const lines = cart.getLines();
  const [tip, setTip] = useState<number>(() => cart.getTip());
  const methods = repositories.payment.listMethods();
  const [method, setMethod] = useState<PaymentMethod>(() =>
    methods.find((m) => m.id === 'cash')?.id ?? 'cash'
  );
  const [submitting, setSubmitting] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const [creationError, setCreationError] = useState(false);

  const pricing = computePricing(lines, business?.promo === true, cart.getDeliveryFee(), tip);

  if (!business || lines.length === 0) {
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
        <EmptyState
          icon={<ShoppingBag size={28} />}
          title="O teu cesto está vazio"
          message="Adiciona itens a um negócio para continuares."
          action={
            <button className="btn-primary" onClick={onBack}>
              Voltar
            </button>
          }
        />
      </main>
    );
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setCreationError(false);
    const outcome = await placeOrder({ paymentMethod: method, tip });
    if (outcome.ok) {
      onPlaced(outcome.order.id);
      return;
    }
    setSubmitting(false);
    if (outcome.reason === 'no-address') {
      setAddressError(true);
      onChangeAddress();
    } else {
      showToast(outcome.message);
      if (outcome.reason !== 'empty-cart') setCreationError(true);
    }
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

      {address ? (
        <section className="checkout-delivery">
          <span className="checkout-delivery-icon">
            <MapPin size={19} />
          </span>
          <div className="checkout-delivery-main">
            <small>ENTREGAR EM</small>
            <strong>
              {address.label} · {address.line}
            </strong>
            {address.neighborhood && <small>{address.neighborhood}</small>}
          </div>
          <button className="link-button" onClick={onChangeAddress}>
            Trocar
          </button>
        </section>
      ) : (
        <div className={`checkout-note ${addressError ? 'error' : ''}`}>
          <MapPin size={16} />
          <span>Define o teu endereço principal para receberes com precisão.</span>
          <button className="link-button" onClick={onChangeAddress}>
            Adicionar endereço
          </button>
        </div>
      )}

      <section className="checkout-block">
        <div className="checkout-title-row">
          <p className="eyebrow">RESUMO · {pricing.count} {pricing.count === 1 ? 'ITEM' : 'ITENS'}</p>
          <strong>{business.name}</strong>
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
            <strong>{formatKz(pricing.subtotal)}</strong>
          </div>
          {pricing.discount > 0 && (
            <div className="checkout-row promo">
              <span>Promoção primeiro pedido <small>(−10%)</small></span>
              <strong>−{formatKz(pricing.discount)}</strong>
            </div>
          )}
          <div className="checkout-row">
            <span>Entrega</span>
            <strong>{formatKz(pricing.deliveryFee)}</strong>
          </div>
          <div className="checkout-row">
            <span>Gorjeta</span>
            <strong>{tip > 0 ? formatKz(tip) : '—'}</strong>
          </div>
          <div className="checkout-row total">
            <span>Total</span>
            <strong>{formatKz(pricing.total)}</strong>
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

      {creationError && (
        <p className="checkout-error" role="alert">
          Não conseguimos criar o pedido. Verifica a ligação e tenta de novo.
        </p>
      )}

      <button
        className="btn-primary checkout-submit"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {submitting ? 'A criar pedido…' : `Fazer pedido · ${formatKz(pricing.total)}`}
      </button>
    </main>
  );
}