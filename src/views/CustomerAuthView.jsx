import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Globe2, LockKeyhole, MapPin, MessageSquare, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ToastContainer from '../components/ToastContainer';

const COUNTRIES = [
  { code: 'AO', dial: '+244', name: 'Angola', flag: 'AO' },
  { code: 'CD', dial: '+243', name: 'RDC', flag: 'CD' },
  { code: 'ZA', dial: '+27', name: 'África do Sul', flag: 'ZA' },
  { code: 'MZ', dial: '+258', name: 'Moçambique', flag: 'MZ' },
  { code: 'PT', dial: '+351', name: 'Portugal', flag: 'PT' },
  { code: 'BR', dial: '+55', name: 'Brasil', flag: 'BR' },
  { code: 'GB', dial: '+44', name: 'Reino Unido', flag: 'GB' },
  { code: 'US', dial: '+1', name: 'Estados Unidos', flag: 'US' },
];

function normalizePhone(raw, dial) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return `${dial}${digits.replace(/^0+/, '')}`;
}

export default function AuthView() {
  const {
    authMode,
    setAuthMode,
    toasts,
    removeToast,
    registerForm,
    setRegisterForm,
    notifySystem,
  } = useApp();

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
      const { error } = await (await import('../lib/supabase')).supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true },
      });

      if (error) {
        notifySystem('Não foi possível enviar', error.message, 'error');
        return;
      }

      setStage('otp');
      notifySystem('Código enviado', `Enviámos um código para ${selectedCountry.dial}.`, 'success');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\\d{6}$/.test(otp)) {
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

  const handleLegacyRegistration = async () => {
    const name = registerForm.name.trim();
    const registrationPhone = registerForm.phone.trim();

    if (!name || !registrationPhone || !registerForm.password || !registerForm.confirmPassword) {
      notifySystem('Dados incompletos', 'Preencha nome, telefone e palavra-passe.', 'error');
      return;
    }

    if (registerForm.password.length < 6 || registerForm.password !== registerForm.confirmPassword) {
      notifySystem('Palavra-passe inválida', 'Confirme uma palavra-passe com pelo menos 6 caracteres.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.auth.signUp({
        phone: registrationPhone,
        password: registerForm.password,
        options: { data: { name } },
      });

      if (error) {
        notifySystem('Não foi possível criar', error.message, 'error');
        return;
      }

      if (data.session) {
        notifySystem('Conta criada', 'A sua conta está pronta.', 'success');
      } else {
        notifySystem('Verifique o telefone', 'Introduza o código enviado para concluir o registo.', 'success');
      }

      setRegisterForm({ phone: '', email: '', password: '', confirmPassword: '', name: '' });
      setAuthMode('login');
      reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white font-black">
              P
            </div>
            <span className="text-lg font-black tracking-tight">Pedejá</span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300"
            aria-label="Idioma"
          >
            <Globe2 size={15} />
            PT
            <ChevronDown size={14} />
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-10">
          {authMode === 'login' && stage === 'phone' && (
            <>
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  <Phone size={22} strokeWidth={2} />
                </div>
                <h1 className="text-3xl font-black tracking-tight">Entrar no Pedejá</h1>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Use o seu número de telefone. Enviamos um código para confirmar a sua identidade.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <label htmlFor="country" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  País
                </label>
                <div className="relative mb-4">
                  <select
                    id="country"
                    value={country}
                    onChange={(event) => {
                      setCountry(event.target.value);
                      setPhone('');
                    }}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-10 text-sm font-semibold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {COUNTRIES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name} ({item.dial})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                </div>

                <label htmlFor="phone" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Número de telefone
                </label>
                <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-violet-500 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center border-r border-slate-200 px-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {selectedCountry.dial}
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/[^0-9 ]/g, ''))}
                    onKeyDown={(event) => event.key === 'Enter' && sendCode()}
                    placeholder={country === 'AO' ? '923 000 000' : 'Número de telefone'}
                    autoComplete="tel"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm font-semibold outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={sendCode}
                  disabled={loading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'A enviar…' : 'Continuar'}
                  {!loading && <ArrowRight size={18} />}
                </button>

                <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-400">
                  <LockKeyhole size={14} className="mt-0.5 shrink-0" />
                  <span>O código é usado apenas para confirmar o acesso à sua conta.</span>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3 text-slate-300 dark:text-slate-700">
                <span className="h-px flex-1 bg-current" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]">ou</span>
                <span className="h-px flex-1 bg-current" />
              </div>

              <button
                type="button"
                onClick={() => switchMode('register')}
                className="mt-5 w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200"
              >
                Criar uma conta nova
              </button>
            </>
          )}

          {authMode === 'login' && stage === 'otp' && (
            <>
              <button
                type="button"
                onClick={reset}
                className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500"
              >
                <ArrowLeft size={17} />
                Alterar número
              </button>

              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
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
                  onChange={(event) => setOtp(event.target.value.replace(/\\D/g, '').slice(0, 6))}
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
            </>
          )}

          {authMode === 'register' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500"
              >
                <ArrowLeft size={17} />
                Já tenho conta
              </button>

              <div className="mb-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  <UserRound size={22} />
                </div>
                <h1 className="text-3xl font-black tracking-tight">Criar conta</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Começamos pela sua identidade. Depois ligamos a conta às capacidades Pedejá que lhe forem atribuídas.
                </p>
              </div>

              <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                  <ShieldCheck size={19} className="text-violet-600" />
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Não precisa escolher Cliente, Estafeta ou Comerciante. O servidor determina as capacidades da sua conta.
                  </p>
                </div>

                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                  placeholder="Nome completo"
                  autoComplete="name"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800"
                />

                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(event) => setRegisterForm({ ...registerForm, phone: event.target.value })}
                  placeholder="+244 923 000 000"
                  autoComplete="tel"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                    placeholder="Palavra-passe"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })}
                    placeholder="Confirmar"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleLegacyRegistration}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white disabled:opacity-60"
                >
                  {loading ? 'A criar…' : 'Criar conta'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>

              <div className="mt-6 flex items-start gap-2 text-[11px] leading-5 text-slate-400">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span>A morada será configurada depois da autenticação, com a estrutura de endereço que já definimos para Angola.</span>
              </div>
            </>
          )}
        </section>

        <footer className="pb-3 text-center text-[11px] leading-5 text-slate-400">
          <div className="mb-2 flex items-center justify-center gap-2">
            <LockKeyhole size={13} />
            <span>Ligação protegida</span>
          </div>
          <p>Ao continuar, aceita os Termos e a Política de Privacidade do Pedejá.</p>
        </footer>
      </main>
    </div>
  );
}
