import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, LockKeyhole, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ToastContainer from '../components/ToastContainer';

const COUNTRIES = [
  { code: 'AO', dial: '+244', name: 'Angola' },
  { code: 'CD', dial: '+243', name: 'RDC' },
  { code: 'ZA', dial: '+27', name: 'África do Sul' },
  { code: 'MZ', dial: '+258', name: 'Moçambique' },
  { code: 'PT', dial: '+351', name: 'Portugal' },
  { code: 'BR', dial: '+55', name: 'Brasil' },
  { code: 'GB', dial: '+44', name: 'Reino Unido' },
  { code: 'US', dial: '+1', name: 'Estados Unidos' },
];

function normalizePhone(raw, dial) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return `${dial}${digits.replace(/^0+/, '')}`;
}

export default function AuthView() {
  const { authMode, setAuthMode, toasts, removeToast, notifySystem } = useApp();
  const [country, setCountry] = useState('AO');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('phone');
  const [loading, setLoading] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((item) => item.code === country) || COUNTRIES[0],
    [country],
  );

  const fullPhone = normalizePhone(phone, selectedCountry.dial);

  const reset = () => {
    setPhone('');
    setOtp('');
    setStage('phone');
    setLoading(false);
  };

  const sendCode = async () => {
    if (!phone.trim()) {
      notifySystem('Número necessário', 'Introduza o seu número de telefone.', 'error');
      return;
    }

    if (fullPhone.length < selectedCountry.dial.length + 6) {
      notifySystem('Número inválido', 'Verifique o número de telefone.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true },
      });

      if (error) {
        notifySystem('Não foi possível enviar', error.message, 'error');
        return;
      }

      setStage('otp');
      notifySystem('Código enviado', 'Enviámos um código por SMS.', 'success');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(otp)) {
      notifySystem('Código inválido', 'Introduza o código de 6 dígitos.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        notifySystem('Código não aceite', error.message, 'error');
        return;
      }

      notifySystem('Sessão iniciada', 'A preparar o seu Pedejá.', 'success');
      reset();
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true },
      });

      if (error) {
        notifySystem('Não foi possível reenviar', error.message, 'error');
        return;
      }

      notifySystem('Novo código enviado', 'Verifique as suas mensagens.', 'success');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    reset();
    setAuthMode(mode);
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-6 pt-0 sm:px-8">
        {authMode === 'login' && stage === 'phone' && (
          <section className="flex flex-1 flex-col">
            <div className="-mx-5 overflow-hidden sm:-mx-8">
              <div className="relative h-[38vh] min-h-[280px] max-h-[430px] overflow-hidden bg-slate-200">
                <img
                  src="/images/estafeta-auth.jpg"
                  alt="Estafeta Pedejá em serviço"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 to-transparent" />
              </div>
            </div>

            <div className="flex flex-1 flex-col pt-8">
              <h1 className="max-w-sm text-[32px] font-black leading-[1.08] tracking-tight">
                A próxima entrega começa aqui.
              </h1>

              <div className="mt-8">
                <label htmlFor="phone" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Número de telefone
                </label>

                <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-violet-950">
                  <div className="flex items-center border-r border-slate-200 px-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    {selectedCountry.dial}
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/[^0-9 ]/g, ''))}
                    onKeyDown={(event) => event.key === 'Enter' && sendCode()}
                    placeholder={country === 'AO' ? '9XX XXX XXX' : 'Número de telefone'}
                    autoComplete="tel"
                    className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base font-semibold outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={sendCode}
                  disabled={loading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'A enviar…' : 'Continuar'}
                  {!loading && <ArrowRight size={18} />}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                  Ao continuar, receberás um código por SMS.
                </p>
              </div>

              <div className="mt-auto pt-12 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Ainda não és estafeta?</p>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="mt-1 text-sm font-black text-violet-600 underline decoration-2 underline-offset-4 hover:text-violet-700"
                >
                  Começa aqui.
                </button>
              </div>
            </div>
          </section>
        )}

        {authMode === 'login' && stage === 'otp' && (
          <section className="flex flex-1 flex-col justify-center py-10">
            <button
              type="button"
              onClick={reset}
              className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500"
            >
              <ArrowLeft size={17} />
              Alterar número
            </button>

            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                <MessageSquare size={22} />
              </div>
              <h1 className="text-3xl font-black tracking-tight">Confirma o teu número</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Enviámos um código para <strong className="text-slate-800 dark:text-slate-200">{fullPhone}</strong>.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <label htmlFor="otp" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Código de 6 dígitos
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(event) => event.key === 'Enter' && verifyCode()}
                autoComplete="one-time-code"
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-3xl font-black tracking-[0.45em] outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800"
                placeholder="000000"
              />

              <button
                type="button"
                onClick={verifyCode}
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white disabled:opacity-60"
              >
                {loading ? 'A verificar…' : 'Confirmar'}
                {!loading && <Check size={18} />}
              </button>

              <button
                type="button"
                onClick={resendCode}
                disabled={loading}
                className="mt-4 w-full text-center text-xs font-bold text-violet-600 disabled:opacity-50"
              >
                Reenviar código
              </button>
            </div>
          </section>
        )}

        {authMode === 'register' && (
          <section className="flex flex-1 flex-col justify-center py-10">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500"
            >
              <ArrowLeft size={17} />
              Voltar
            </button>

            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Estafeta Pedejá</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">Começa aqui.</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Primeiro confirmamos a tua identidade. Depois seguimos com a candidatura de estafeta.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                A candidatura começa pelo teu número de telefone. Depois da verificação, recolheremos os dados necessários para avaliar a tua candidatura.
              </p>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white"
              >
                Começar com o telefone
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        <footer className="pb-1 pt-5 text-center text-[11px] leading-5 text-slate-400">
          <div className="mb-2 flex items-center justify-center gap-2">
            <LockKeyhole size={13} />
            <span>Ligação protegida</span>
          </div>
          <p>Ao continuar, aceitas os Termos e a Política de Privacidade do Pedejá.</p>
        </footer>
      </main>
    </div>
  );
}
