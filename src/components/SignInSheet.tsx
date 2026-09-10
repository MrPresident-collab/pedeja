import { useState } from 'react';
import { ArrowRight, Check, Smartphone } from 'lucide-react';
import { repositories } from '@/repositories';
import { showToast } from '@/components/toastStore';

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export function SignInSheet({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);

  async function sendCode() {
    const digits = phone.replace(/[^\d+]/g, '');
    if (digits.length < 9) {
      showToast('Introduz um número válido.');
      return;
    }
    setSending(true);
    const ok = await repositories.auth.requestOtp(digits);
    setSending(false);
    if (ok) {
      setStep('code');
      showToast('Código enviado por SMS. (modo demo: qualquer código serve)');
    }
  }

  async function verify() {
    if (code.trim().length < 4) return;
    const ok = await repositories.auth.verifyOtp(phone, code.trim());
    if (ok) {
      showToast('Sessão iniciada. Bem-vindo/a ao Pedejá.');
      onSuccess();
    } else {
      showToast('Código incorreto. Tenta de novo.');
    }
  }

  return (
    <div className="sheet-content">
      <div className="sheet-mode">
        <span className="sheet-mode-icon">
          <Smartphone size={22} />
        </span>
        <p>Numero de telefone ou email para começar. Sem palavra-passe — enviamos-te sempre um código.</p>
      </div>

      {step === 'phone' ? (
        <>
          <div className="input-group auth-input">
            <span className="input-icon">+244</span>
            <input
              type="tel"
              placeholder="923 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn-primary auth-submit" onClick={sendCode} disabled={sending}>
            {sending ? 'A enviar…' : 'Enviar código'} <ArrowRight size={18} />
          </button>
        </>
      ) : (
        <>
          <p className="auth-code-note">Inserimos o código no <strong>{phone}</strong>. <button className="link-button" onClick={() => setStep('phone')}>Mudar número</button></p>
          <div className="input-group auth-input">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Código de verificação"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn-primary auth-submit" onClick={verify} disabled={code.trim().length < 4}>
            Verificar e entrar <Check size={18} />
          </button>
        </>
      )}

      <button className="guest-link" onClick={onClose}>
        Cancelar
      </button>
    </div>
  );
}