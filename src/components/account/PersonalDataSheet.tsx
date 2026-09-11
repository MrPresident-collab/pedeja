import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  RefreshCw,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { repositories } from '@/repositories';
import { showToast } from '@/components/toastStore';
import {
  normalizeAngolaPhone,
  requestPhoneChange,
  saveEmail,
  updateDisplayName,
  verifyPhoneChange,
} from '@/services/account';

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  onSupport: () => void;
};

type Step =
  | { kind: 'summary' }
  | { kind: 'name' }
  | { kind: 'phone-enter' }
  | { kind: 'phone-code' }
  | { kind: 'email' };

const RESEND_SECONDS = 30;

export function PersonalDataSheet({ open, onClose, onChanged, onSupport }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'summary' });

  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [newPhone, setNewPhone] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [codeValue, setCodeValue] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [sendCycle, setSendCycle] = useState(0);

  const [emailValue, setEmailValue] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const profile = repositories.profile.getProfile();
  const phoneVerified = repositories.profile.isPhoneVerified();

  useEffect(() => {
    if (step.kind !== 'phone-code') return;
    setResendIn(RESEND_SECONDS);
    const timer = setInterval(() => {
      setResendIn((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step.kind, sendCycle]);

  function beginEdit(next: Step) {
    setStep(next);
    setNameError(null);
    setPhoneError(null);
    setCodeError(null);
    setEmailError(null);
    if (next.kind === 'name') setNameValue(profile.name);
    if (next.kind === 'email') setEmailValue(profile.email);
    if (next.kind === 'phone-enter') setNewPhone(profile.phone);
  }

  function backToSummary() {
    setStep({ kind: 'summary' });
    setPendingPhone(null);
    setCodeValue('');
  }

  async function saveName() {
    if (savingName) return;
    setSavingName(true);
    setNameError(null);
    const result = await updateDisplayName(nameValue);
    setSavingName(false);
    if (result.ok) {
      showToast('Nome atualizado.');
      onChanged();
      backToSummary();
    } else {
      setNameError(result.message);
    }
  }

  async function sendCode() {
    if (sendingOtp) return;
    const normalized = normalizeAngolaPhone(newPhone);
    if (!normalized) {
      setPhoneError('Introduz um número angolano válido (9 dígitos).');
      return;
    }
    setPhoneError(null);
    setSendingOtp(true);
    const result = await requestPhoneChange(newPhone);
    setSendingOtp(false);
    if (result.ok) {
      setPendingPhone(normalized);
      setCodeValue('');
      setCodeError(null);
      setSendCycle((c) => c + 1);
      setStep({ kind: 'phone-code' });
      showToast('Código enviado por SMS. (modo demo: código 1234)');
    } else {
      setPhoneError(result.message);
    }
  }

  async function verify() {
    if (!pendingPhone || verifying) return;
    setVerifying(true);
    setCodeError(null);
    const result = await verifyPhoneChange(pendingPhone, codeValue);
    setVerifying(false);
    if (result.ok) {
      showToast('Número atualizado.');
      onChanged();
      backToSummary();
    } else {
      setCodeError(result.message);
      if (/expirad|mudou/.test(result.message)) {
        setPendingPhone(null);
        setStep({ kind: 'phone-enter' });
      }
    }
  }

  async function submitEmail() {
    if (savingEmail) return;
    setSavingEmail(true);
    setEmailError(null);
    const result = await saveEmail(emailValue);
    setSavingEmail(false);
    if (result.ok) {
      showToast('Email guardado. Falta a verificação.');
      onChanged();
      backToSummary();
    } else {
      setEmailError(result.message);
    }
  }

  function resend() {
    if (resendIn > 0) return;
    if (!pendingPhone) return;
    setSendCycle((c) => c + 1);
    setCodeValue('');
    setCodeError(null);
    void requestPhoneChange(pendingPhone).then((result) => {
      if (result.ok) {
        showToast('Novo código enviado. (modo demo: código 1234)');
      } else {
        setCodeError(result.message);
      }
    });
  }

  return (
    <BottomSheet open={open} onClose={onClose} eyebrow="A MINHA CONTA" title="Dados pessoais">
      <div className="sheet-content">
        {step.kind === 'summary' && (
          <>
            <div className="profile-links pdata-card">
              <div className="pdata-row">
                <span className="pdata-icon"><UserRound size={17} /></span>
                <span className="pdata-main">
                  <small>Nome</small>
                  <strong>{profile.name}</strong>
                </span>
                <button className="pdata-edit" onClick={() => beginEdit({ kind: 'name' })} aria-label="Editar nome">
                  <Pencil size={15} />
                </button>
              </div>
              <div className="pdata-row">
                <span className="pdata-icon"><Phone size={17} /></span>
                <span className="pdata-main">
                  <small>Telefone</small>
                  <strong>{profile.phone}</strong>
                </span>
                {phoneVerified ? (
                  <span className="chip chip-success"><Check size={10} /> Verificado</span>
                ) : (
                  <span className="chip chip-warn">Por verificar</span>
                )}
                <button className="pdata-edit" onClick={() => beginEdit({ kind: 'phone-enter' })} aria-label="Atualizar telefone">
                  <Pencil size={15} />
                </button>
              </div>
              <div className="pdata-row">
                <span className="pdata-icon"><Mail size={17} /></span>
                <span className="pdata-main">
                  <small>Email</small>
                  <strong>{profile.email || 'Ainda não adicionaste um email'}</strong>
                </span>
                <span className="chip chip-warn">Por verificar</span>
                <button className="pdata-edit" onClick={() => beginEdit({ kind: 'email' })} aria-label="Adicionar email">
                  <Pencil size={15} />
                </button>
              </div>
            </div>

            <div className="sheet-mode">
              <span className="sheet-mode-icon"><Smartphone size={18} /></span>
              <p>Estes dados identificam-te. Alterações sensíveis (como o número de telefone) exigem verificação por código.</p>
            </div>

            <button className="btn-secondary" onClick={onSupport}>
              <MessageCircle size={17} /> Contactar suporte
            </button>
          </>
        )}

        {step.kind === 'name' && (
          <>
            <p className="field-label">
              <span>Nome</span>
              <div className="input-group">
                <UserRound className="input-icon" size={18} />
                <input
                  value={nameValue}
                  onChange={(e) => {
                    setNameValue(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="O teu nome completo"
                  maxLength={60}
                  autoFocus
                />
              </div>
              {nameError && <small className="field-error">{nameError}</small>}
            </p>
            <button className="btn-primary" onClick={() => void saveName()} disabled={savingName || nameValue.trim().length < 2}>
              {savingName ? 'A guardar…' : 'Guardar nome'}
            </button>
            <button className="btn-secondary" onClick={backToSummary}>Voltar</button>
          </>
        )}

        {step.kind === 'phone-enter' && (
          <>
            <div className="sheet-mode">
              <span className="sheet-mode-icon"><Phone size={18} /></span>
              <p>Vais receber um código de verificação no novo número. Só depois de confirmares é que o número é atualizado.</p>
            </div>
            <p className="field-label">
              <span>Novo número</span>
              <div className="input-group">
                <span className="input-icon">+244</span>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value);
                    setPhoneError(null);
                  }}
                  placeholder="923 000 000"
                  autoFocus
                />
              </div>
              {phoneError && <small className="field-error">{phoneError}</small>}
            </p>
            <button className="btn-primary" onClick={() => void sendCode()} disabled={sendingOtp || normalizeAngolaPhone(newPhone) === null}>
              {sendingOtp ? 'A enviar…' : 'Enviar código'} <ChevronRight size={17} />
            </button>
            <button className="btn-secondary" onClick={backToSummary}>Voltar</button>
          </>
        )}

        {step.kind === 'phone-code' && pendingPhone && (
          <>
            <div className="sheet-mode">
              <span className="sheet-mode-icon"><Smartphone size={18} /></span>
              <p>Insere o código que enviamos para o <strong>{pendingPhone}</strong>. {''}
                <button className="link-button" onClick={() => setStep({ kind: 'phone-enter' })}>Mudar número</button>
              </p>
            </div>
            <p className="field-label">
              <span>Código de verificação</span>
              <div className="input-group">
                <input
                  type="text"
                  inputMode="numeric"
                  value={codeValue}
                  onChange={(e) => {
                    setCodeValue(e.target.value);
                    setCodeError(null);
                  }}
                  placeholder="1234"
                  maxLength={4}
                  autoFocus
                />
              </div>
              {codeError && <small className="field-error">{codeError}</small>}
            </p>
            <p className="otp-note">modo demo: usa o código <strong>1234</strong>.</p>
            <button className="btn-primary" onClick={() => void verify()} disabled={verifying || codeValue.trim().length < 4}>
              {verifying ? 'A confirmar…' : 'Verificar e guardar'} <Check size={17} />
            </button>
            <button className="resend-button" onClick={resend} disabled={resendIn > 0}>
              <RefreshCw size={14} />
              {resendIn > 0 ? `Reenviar código em ${resendIn}s` : 'Reenviar código'}
            </button>
            <button className="btn-secondary" onClick={backToSummary}>Voltar</button>
          </>
        )}

        {step.kind === 'email' && (
          <>
            <div className="sheet-mode">
              <span className="sheet-mode-icon"><Mail size={18} /></span>
              <p>O email fica <strong>por verificar</strong> até receberes o link de confirmação (quando disponível).</p>
            </div>
            <p className="field-label">
              <span>Email</span>
              <div className="input-group">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  value={emailValue}
                  onChange={(e) => {
                    setEmailValue(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="tu@exemplo.com"
                  maxLength={120}
                  autoFocus
                />
              </div>
              {emailError && <small className="field-error">{emailError}</small>}
            </p>
            <button className="btn-primary" onClick={() => void submitEmail()} disabled={savingEmail || !emailValue.trim()}>
              {savingEmail ? 'A guardar…' : 'Guardar email'}
            </button>
            <button className="btn-secondary" onClick={backToSummary}>Voltar</button>
          </>
        )}

        {step.kind !== 'summary' && (
          <p className="input-hint">
            <AlertCircle size={12} /> Nunca partilhes os teus códigos com ninguém.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}