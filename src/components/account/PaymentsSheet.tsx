import { useState } from 'react';
import { Banknote, CreditCard, ShieldCheck, ShoppingBag } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { repositories } from '@/repositories';
import { setDefaultPaymentMethod } from '@/services/preferences';
import { showToast } from '@/components/toastStore';
import type { PaymentMethod } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
};

function methodIcon(id: PaymentMethod) {
  if (id === 'cash') return <Banknote size={19} />;
  if (id === 'multicaixa') return <CreditCard size={19} />;
  return <ShoppingBag size={19} />;
}

function methodDetail(id: PaymentMethod, available: boolean) {
  if (!available) return 'Desbloqueamos novos métodos em breve';
  if (id === 'cash') return 'Pagar em dinheiro à entrega';
  if (id === 'multicaixa') return 'Cartão Multicaixa ou transferência';
  return '';
}

export function PaymentsSheet({ open, onClose }: Props) {
  const [defaultId, setDefaultId] = useState<PaymentMethod>(() => repositories.payment.getDefaultMethod());
  const methods = repositories.payment.listMethods();

  function select(id: PaymentMethod) {
    if (defaultId === id) return;
    setDefaultPaymentMethod(id);
    setDefaultId(id);
    const label = methods.find((m) => m.id === id)?.label ?? id;
    showToast(`${label} é agora o teu método predefinido.`);
  }

  return (
    <BottomSheet open={open} onClose={onClose} eyebrow="PAGAMENTOS" title="Métodos de pagamento">
      <div className="sheet-content">
        <div className="profile-links">
          {methods.map((m) => (
            <button
              key={m.id}
              className={`profile-link ${m.available ? '' : 'disabled'}`}
              disabled={!m.available}
              onClick={() => select(m.id)}
            >
              <span className="profile-link-icon">{methodIcon(m.id)}</span>
              <span>
                <strong>{m.label}</strong>
                <small>{methodDetail(m.id, m.available)}</small>
              </span>
              {m.available && defaultId === m.id && <span className="chip chip-purple">Predefinido</span>}
              {!m.available && <small>Em breve</small>}
            </button>
          ))}
        </div>

        <div className="sheet-mode">
          <span className="sheet-mode-icon"><ShieldCheck size={18} /></span>
          <p>Só pagas com o método que escolheres. O predefinido aparece já selecionado no checkout e podes trocá-lo a qualquer momento.</p>
        </div>
      </div>
    </BottomSheet>
  );
}