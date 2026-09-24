import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react';
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
  const { authMode, setAuthMode, setActiveRole, toasts, removeToast, notifySystem } = useApp();
  const [country, setCountry] = useState('AO');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    dateOfBirth: '',
    addressLine1: '',
    addressLine2: '',
    neighborhood: '',
    municipality: '',
    city: '',
    province: 'Luanda',
  });
  const otpInputRef = useRef(null);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((item) => item.code === country) || COUNTRIES[0],
    [country],
  );

  const fullPhone = normalizePhone(phone, selectedCountry.dial);
  const isOnboarding = authMode === 'register';

  const reset = () => {
    setPhone('');
    setOtp('');
    setStage('phone');
    setLoading(false);
  };

  const switchMode = (mode) => {
    reset();
    setAuthMode(mode);
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

      // Existing Estafeta login: never create an identity.
      // Onboarding: explicitly permits creation of a new authenticated identity.
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: isOnboarding },
      });

      if (error) {
        notifySystem(
          isOnboarding ? 'Não foi possível iniciar a candidatura' : 'Não foi possível entrar',
          error.message,
          'error',
        );
        return;
      }

      setStage('otp');
      notifySystem(
        'Código enviado',
        isOnboarding
          ? 'Enviámos o código de candidatura por SMS.'
          : 'Enviámos o código de acesso por SMS.',
        'success',
      );
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

      if (isOnboarding) {
        // This OTP authenticates the applicant only. It does not grant
        // Estafeta capability and does not enter the operational rider app.
        // The onboarding flow will continue from this authenticated state.
        notifySystem('Número confirmado', 'Vamos continuar a tua candidatura.', 'success');
        setStage('onboarding');
        return;
      }

      setActiveRole('rider');
      notifySystem('Sessão iniciada', 'A preparar o teu Pedejá.', 'success');
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
        options: { shouldCreateUser: isOnboarding },
      });

      if (error) {
        notifySystem('Não foi possível reenviar', error.message, 'error');
        return;
      }

      notifySystem(
        'Novo código enviado',
        isOnboarding
          ? 'Novo código de candidatura enviado.'
          : 'Novo código de acesso enviado.',
        'success',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderOtp = () => (
    <section className="flex flex-1 flex-col justify-center py-10">
      <button
        type="button"
        onClick={reset}
        className="mb-10 flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={17} />
        Voltar
      </button>

      <div className="mb-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          {isOnboarding ? 'Candidatura de estafeta' : 'Acesso de estafeta'}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {isOnboarding ? 'Confirma o teu número' : 'Confirma o teu número'}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          Enviámos um código de 6 dígitos por SMS para{' '}
          <strong className="text-slate-800 dark:text-slate-200">{fullPhone}</strong>.
        </p>
      </div>

      <div className="relative">
        <label htmlFor="otp" className="sr-only">Código de 6 dígitos</label>
        <div aria-hidden="true" className="grid grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, index) => {
            const digit = otp[index] || '';
            return (
              <div
                key={index}
                className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl font-black text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {digit || <span className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700" />}
              </div>
            );
          })}
        </div>

        <input
          ref={otpInputRef}
          id="otp"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          onPaste={(event) => {
            event.preventDefault();
            setOtp((event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6));
          }}
          onKeyDown={(event) => event.key === 'Enter' && verifyCode()}
          onClick={() => otpInputRef.current?.focus()}
          autoComplete="one-time-code"
          autoFocus
          aria-label="Código de 6 dígitos"
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      </div>

      <button
        type="button"
        onClick={verifyCode}
        disabled={loading || otp.length !== 6}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'A verificar…' : 'Confirmar'}
        {!loading && <Check size={18} />}
      </button>

      <button
        type="button"
        onClick={resendCode}
        disabled={loading}
        className="mt-5 w-full text-center text-sm font-bold text-violet-600 disabled:opacity-50"
      >
        Reenviar código
      </button>

      <p className="mt-8 text-center text-xs text-slate-400">
        {isOnboarding
          ? 'Este código confirma apenas o teu número. A candidatura continua depois da verificação.'
          : 'Este código confirma o acesso à tua conta de estafeta.'}
      </p>
    </section>
  );

  const updatePersonalInfo = (field, value) => {
    setPersonalInfo((current) => ({ ...current, [field]: value }));
  };

  const savePersonalInfo = async () => {
    const required = [
      ['fullName', 'Nome completo'],
      ['dateOfBirth', 'Data de nascimento'],
      ['addressLine1', 'Rua e número'],
      ['city', 'Cidade'],
      ['province', 'Província'],
    ];

    const missing = required.find(([field]) => !personalInfo[field].trim());
    if (missing) {
      notifySystem('Dados em falta', `Preenche: ${missing[1]}.`, 'error');
      return;
    }

    setLoading(true);
    try {
      if (!navigator.geolocation) {
        notifySystem('Localização indisponível', 'Este dispositivo não disponibiliza localização.', 'error');
        return;
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        });
      });

      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.rpc('rider_onboarding_save_personal_info', {
        p_full_name: personalInfo.fullName.trim(),
        p_date_of_birth: personalInfo.dateOfBirth,
        p_address_line_1: personalInfo.addressLine1.trim(),
        p_address_line_2: personalInfo.addressLine2.trim() || null,
        p_neighborhood: personalInfo.neighborhood.trim() || null,
        p_municipality: personalInfo.municipality.trim() || null,
        p_city: personalInfo.city.trim(),
        p_province: personalInfo.province.trim(),
        p_latitude: position.coords.latitude,
        p_longitude: position.coords.longitude,
      });

      if (error) {
        notifySystem('Não foi possível guardar', error.message, 'error');
        return;
      }

      notifySystem('Dados guardados', 'A tua morada foi registada. Vamos continuar.', 'success');
      setStage('onboarding-next');
    } catch (error) {
      const message = error?.code === 1
        ? 'Precisamos da localização para confirmar a morada. Permite o acesso e tenta novamente.'
        : error?.message || 'Não foi possível obter a localização.';
      notifySystem('Localização necessária', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderOnboardingStart = () => (
    <section className="flex flex-1 flex-col py-8">
      <button
        type="button"
        onClick={() => setStage('phone')}
        className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={17} />
        Voltar
      </button>

      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Candidatura de estafeta · 01
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Os teus dados</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Precisamos destes dados para identificar a candidatura e confirmar a tua morada.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="full-name" className="mb-2 block text-sm font-bold">Nome completo</label>
          <input id="full-name" type="text" value={personalInfo.fullName}
            onChange={(event) => updatePersonalInfo('fullName', event.target.value)}
            autoComplete="name" placeholder="Nome completo"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950" />
        </div>

        <div>
          <label htmlFor="date-of-birth" className="mb-2 block text-sm font-bold">Data de nascimento</label>
          <input id="date-of-birth" type="date" value={personalInfo.dateOfBirth}
            onChange={(event) => updatePersonalInfo('dateOfBirth', event.target.value)}
            autoComplete="bday"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950" />
        </div>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <p className="text-sm font-black">Morada</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Escreve a morada como a conheces. O dispositivo acrescentará a localização para validação.
          </p>
        </div>

        <div>
          <label htmlFor="address-line-1" className="mb-2 block text-sm font-bold">Rua e número</label>
          <input id="address-line-1" type="text" value={personalInfo.addressLine1}
            onChange={(event) => updatePersonalInfo('addressLine1', event.target.value)}
            autoComplete="street-address" placeholder="Ex.: Rua 17, Casa 24"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950" />
        </div>

        <div>
          <label htmlFor="address-line-2" className="mb-2 block text-sm font-bold">Referência <span className="font-normal text-slate-400">(opcional)</span></label>
          <input id="address-line-2" type="text" value={personalInfo.addressLine2}
            onChange={(event) => updatePersonalInfo('addressLine2', event.target.value)}
            placeholder="Ex.: perto do mercado"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950" />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="neighborhood" className="mb-2 block text-sm font-bold">Bairro <span className="font-normal text-slate-400">(opcional)</span></label>
            <input id="neighborhood" type="text" value={personalInfo.neighborhood}
              onChange={(event) => updatePersonalInfo('neighborhood', event.target.value)}
              placeholder="Bairro"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950" />
          </div>

          <div>
            <label htmlFor="municipality" className="mb-2 block text-sm font-bold">Município <span className="font-normal text-slate-400">(opcional)</span></label>
            <input id="municipality" type="text" value={personalInfo.municipality}
              onChange={(event) => updatePersonalInfo('municipality', event.target.value)}
              placeholder="Município"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-bold">Cidade</label>
            <input id="city" type="text" value={personalInfo.city}
              onChange={(event) => updatePersonalInfo('city', event.target.value)}
              placeholder="Cidade"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950" />
          </div>

          <div>
            <label htmlFor="province" className="mb-2 block text-sm font-bold">Província</label>
            <input id="province" type="text" value={personalInfo.province}
              onChange={(event) => updatePersonalInfo('province', event.target.value)}
              placeholder="Província"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950" />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          A localização do dispositivo é usada para validar a morada indicada. Não substitui a tua morada escrita.
        </div>

        <button type="button" onClick={savePersonalInfo} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'A guardar…' : 'Continuar'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </div>
    </section>
  );

  const renderOnboardingNext = () => (
    <section className="flex flex-1 flex-col justify-center py-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Candidatura de estafeta · 02</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Identidade e documentos.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        A próxima etapa será a verificação do BI, carta de condução e dados de pagamento.
      </p>
    </section>
  );

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

        {authMode === 'login' && stage === 'otp' && renderOtp()}

        {authMode === 'register' && stage === 'phone' && (
          <section className="flex flex-1 flex-col justify-center py-10">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="mb-10 flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={17} />
              Voltar
            </button>

            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Candidatura de estafeta</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">Começa aqui.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Primeiro confirmamos o teu número. Depois recolhemos os dados necessários para avaliar a tua candidatura.
              </p>
            </div>

            <label htmlFor="register-phone" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Número de telefone
            </label>
            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center border-r border-slate-200 px-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                {selectedCountry.dial}
              </div>
              <input
                id="register-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/[^0-9 ]/g, ''))}
                onKeyDown={(event) => event.key === 'Enter' && sendCode()}
                placeholder={country === 'AO' ? '9XX XXX XXX' : 'Número de telefone'}
                autoComplete="tel"
                className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base font-semibold outline-none"
                autoFocus
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
              Ao continuar, receberás um código de candidatura por SMS.
            </p>
          </section>
        )}

        {authMode === 'register' && stage === 'otp' && renderOtp()}
        {authMode === 'register' && stage === 'onboarding' && renderOnboardingStart()}
        {authMode === 'register' && stage === 'onboarding-next' && renderOnboardingNext()}

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
