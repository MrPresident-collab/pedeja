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

  const [identityProof, setIdentityProof] = useState({
    biNumber: '',
    biFile: null,
    licenceNumber: '',
    licenceFile: null,
    iban: '',
  });

  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
    email: '',
    avatarUrl: '',
    avatarFile: null,
  });

  const [vehicle, setVehicle] = useState({
    vehicleType: 'MOTORBIKE',
    registrationNumber: '',
    make: '',
    model: '',
    color: '',
    documentFile: null,
  });

  const updateIdentityProof = (field, value) => {
    setIdentityProof((current) => ({ ...current, [field]: value }));
  };

  const updateProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updateVehicle = (field, value) => {
    setVehicle((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (!isOnboarding || stage !== 'onboarding-profile') return undefined;

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const { supabase } = await import('../lib/supabase');
        const [{ data: userData, error: userError }, { data: profileData, error: profileError }] =
          await Promise.all([
            supabase.auth.getUser(),
            supabase.from('profiles').select('full_name,phone,avatar_url').single(),
          ]);

        if (userError) throw userError;
        if (profileError) throw profileError;
        if (cancelled) return;

        setProfile((current) => ({
          ...current,
          fullName: profileData?.full_name || current.fullName || '',
          phone: profileData?.phone || userData?.user?.phone || fullPhone,
          email: userData?.user?.email || '',
          avatarUrl: profileData?.avatar_url || '',
        }));
      } catch (error) {
        if (!cancelled) {
          notifySystem('Não foi possível carregar o perfil', error.message || 'Tenta novamente.', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isOnboarding, stage, fullPhone, notifySystem]);

  const saveIdentityProof = async () => {
    const { biNumber, biFile, licenceNumber, licenceFile, iban } = identityProof;
    if (!biNumber.trim() || !biFile || !licenceNumber.trim() || !licenceFile || !iban.trim()) {
      notifySystem('Dados em falta', 'Preenche o BI, carta de condução e IBAN, incluindo os dois documentos.', 'error');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    for (const file of [biFile, licenceFile]) {
      if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) {
        notifySystem('Documento inválido', 'Usa PDF, JPG, PNG ou WEBP até 10 MB.', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('Sessão não encontrada.');

      const upload = async (file, kind) => {
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
        const path = `${userId}/${kind}-${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from('rider-documents').upload(path, file, {
          upsert: true,
          contentType: file.type,
        });
        if (error) throw error;
        return { path, type: file.type, size: file.size };
      };

      const bi = await upload(biFile, 'bi');
      const licence = await upload(licenceFile, 'licence');

      const { error } = await supabase.rpc('rider_onboarding_save_identity_proof', {
        p_bi_number: biNumber.trim(),
        p_bi_storage_path: bi.path,
        p_bi_mime_type: bi.type,
        p_bi_file_size_bytes: bi.size,
        p_licence_number: licenceNumber.trim(),
        p_licence_storage_path: licence.path,
        p_licence_mime_type: licence.type,
        p_licence_file_size_bytes: licence.size,
        p_iban: iban.trim().replace(/\s+/g, ''),
      });

      if (error) {
        notifySystem('Não foi possível guardar', error.message, 'error');
        return;
      }

      notifySystem('Identidade registada', 'Os documentos foram recebidos para análise.', 'success');
      setStage('onboarding-identity-saved');
    } catch (error) {
      notifySystem('Não foi possível guardar', error.message || 'Tenta novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderIdentityProof = () => (
    <section className="flex flex-1 flex-col py-8">
      <button
        type="button"
        onClick={() => setStage('onboarding')}
        className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={17} />
        Voltar
      </button>

      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Candidatura de estafeta · 02</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Identidade e prova</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Precisamos de três coisas: o teu BI, a carta de condução e o IBAN para pagamentos.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
          <p className="text-sm font-black">BI / Documento de identidade</p>
          <input type="text" value={identityProof.biNumber}
            onChange={(event) => updateIdentityProof('biNumber', event.target.value)}
            placeholder="Número do BI"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900" />
          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm font-bold dark:border-slate-700">
            <span>{identityProof.biFile ? identityProof.biFile.name : 'Adicionar documento'}</span>
            <span className="text-violet-600">Escolher</span>
            <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="sr-only"
              onChange={(event) => updateIdentityProof('biFile', event.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
          <p className="text-sm font-black">Carta de condução</p>
          <input type="text" value={identityProof.licenceNumber}
            onChange={(event) => updateIdentityProof('licenceNumber', event.target.value)}
            placeholder="Número da carta"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900" />
          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm font-bold dark:border-slate-700">
            <span>{identityProof.licenceFile ? identityProof.licenceFile.name : 'Adicionar documento'}</span>
            <span className="text-violet-600">Escolher</span>
            <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="sr-only"
              onChange={(event) => updateIdentityProof('licenceFile', event.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
          <p className="text-sm font-black">IBAN</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Usado para o pagamento dos teus ganhos. Não é um documento de identidade.</p>
          <input type="text" inputMode="text" autoComplete="off" value={identityProof.iban}
            onChange={(event) => updateIdentityProof('iban', event.target.value)}
            placeholder="AO06 0000 0000 0000 0000 0000 0"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold uppercase tracking-wide outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900" />
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          Os documentos ficam privados e são enviados para análise da Pedejá. A verificação acontece antes de qualquer acesso operacional.
        </div>

        <button type="button" onClick={saveIdentityProof} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'A enviar…' : 'Continuar'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </div>
    </section>
  );

  const saveProfile = async () => {
    if (!profile.fullName.trim()) {
      notifySystem('Nome necessário', 'Introduza o nome completo.', 'error');
      return;
    }

    if (profile.avatarFile) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(profile.avatarFile.type) || profile.avatarFile.size > 5 * 1024 * 1024) {
        notifySystem('Fotografia inválida', 'Usa JPG, PNG ou WEBP até 5 MB.', 'error');
        return;
      }
    }

    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      notifySystem('Email inválido', 'Verifica o endereço de email.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData?.user?.id;
      if (!userId) throw new Error('Sessão não encontrada.');

      let avatarUrl = profile.avatarUrl || null;

      if (profile.avatarFile) {
        const { error: uploadError } = await supabase.storage
          .from('profile-avatars')
          .upload(`${userId}/avatar`, profile.avatarFile, {
            upsert: true,
            contentType: profile.avatarFile.type,
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('profile-avatars')
          .getPublicUrl(`${userId}/avatar`);

        avatarUrl = publicData?.publicUrl
          ? `${publicData.publicUrl}?v=${Date.now()}`
          : avatarUrl;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.fullName.trim(),
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      if (profile.email.trim() && profile.email.trim() !== (userData.user.email || '')) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email.trim(),
        });
        if (emailError) throw emailError;

        notifySystem(
          'Perfil guardado',
          'O email foi registado e fica pendente de verificação. Podes continuar a candidatura.',
          'success',
        );
      } else {
        notifySystem('Perfil guardado', 'O teu perfil foi actualizado.', 'success');
      }

      setProfile((current) => ({
        ...current,
        avatarUrl,
        avatarFile: null,
      }));
      setStage('onboarding-profile-saved');
    } catch (error) {
      notifySystem('Não foi possível guardar', error.message || 'Tenta novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderProfile = () => (
    <section className="flex flex-1 flex-col py-8">
      <button
        type="button"
        onClick={() => setStage('onboarding-identity-saved')}
        className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={17} />
        Voltar
      </button>

      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Candidatura de estafeta · 03</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">O teu perfil</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Confirma os teus dados de perfil. O telefone já foi verificado através do código SMS.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            {profile.avatarFile ? (
              <img
                src={URL.createObjectURL(profile.avatarFile)}
                alt="Pré-visualização do perfil"
                className="h-full w-full object-cover"
              />
            ) : profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Fotografia do perfil" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-black text-slate-400">
                {profile.fullName.trim().slice(0, 1).toUpperCase() || '?'}
              </div>
            )}
          </div>

          <label className="flex cursor-pointer flex-1 items-center justify-between rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-bold dark:border-slate-700">
            <span>{profile.avatarFile ? profile.avatarFile.name : 'Adicionar fotografia'}</span>
            <span className="text-violet-600">Escolher</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => updateProfile('avatarFile', event.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div>
          <label htmlFor="profile-full-name" className="mb-2 block text-sm font-bold">Nome completo</label>
          <input
            id="profile-full-name"
            type="text"
            value={profile.fullName}
            onChange={(event) => updateProfile('fullName', event.target.value)}
            autoComplete="name"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950"
          />
        </div>

        <div>
          <label htmlFor="profile-phone" className="mb-2 block text-sm font-bold">Telefone</label>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-base font-semibold">{profile.phone || fullPhone}</span>
            <span className="text-xs font-black uppercase tracking-wide text-emerald-600">Verificado</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="profile-email" className="block text-sm font-bold">
              Email <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <span className="text-xs font-bold text-slate-400">Não verificado</span>
          </div>
          <input
            id="profile-email"
            type="email"
            value={profile.email}
            onChange={(event) => updateProfile('email', event.target.value)}
            autoComplete="email"
            placeholder="email@exemplo.com"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950"
          />
          <p className="mt-2 text-xs leading-5 text-slate-400">
            O email é opcional. Se adicionares um, será enviado um pedido de verificação, mas isso não bloqueia a candidatura.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          A fotografia e os dados de perfil são associados à tua identidade Pedejá. Guardar este passo não aprova nem activa a candidatura.
        </div>

        <button
          type="button"
          onClick={saveProfile}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'A guardar…' : 'Continuar'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </div>
    </section>
  );

  const saveVehicle = async () => {
    if (!vehicle.vehicleType || !vehicle.registrationNumber.trim() || !vehicle.color.trim() || !vehicle.documentFile) {
      notifySystem('Dados em falta', 'Preenche o tipo, matrícula, cor e documento do veículo.', 'error');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(vehicle.documentFile.type) || vehicle.documentFile.size > 10 * 1024 * 1024) {
      notifySystem('Documento inválido', 'Usa PDF, JPG, PNG ou WEBP até 10 MB.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData?.user?.id;
      if (!userId) throw new Error('Sessão não encontrada.');

      const safeName = vehicle.documentFile.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
      const path = `${userId}/vehicle-${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('rider-vehicle-documents')
        .upload(path, vehicle.documentFile, {
          upsert: true,
          contentType: vehicle.documentFile.type,
        });

      if (uploadError) throw uploadError;

      const { error } = await supabase.rpc('rider_onboarding_save_vehicle', {
        p_vehicle_type: vehicle.vehicleType,
        p_registration_number: vehicle.registrationNumber.trim(),
        p_make: vehicle.make.trim() || null,
        p_model: vehicle.model.trim() || null,
        p_color: vehicle.color.trim(),
        p_document_storage_path: path,
        p_document_mime_type: vehicle.documentFile.type,
        p_document_file_size_bytes: vehicle.documentFile.size,
      });

      if (error) throw error;

      notifySystem('Veículo registado', 'Os dados do veículo foram recebidos para análise.', 'success');
      setStage('onboarding-vehicle-saved');
    } catch (error) {
      notifySystem('Não foi possível guardar', error.message || 'Tenta novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderVehicle = () => (
    <section className="flex flex-1 flex-col py-8">
      <button
        type="button"
        onClick={() => setStage('onboarding-profile-saved')}
        className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={17} />
        Voltar
      </button>

      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Candidatura de estafeta · 04</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">O teu veículo</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Indica o veículo que vais usar para realizar entregas. Estes dados serão analisados antes da aprovação.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="vehicle-type" className="mb-2 block text-sm font-bold">Tipo de veículo</label>
          <select
            id="vehicle-type"
            value={vehicle.vehicleType}
            onChange={(event) => updateVehicle('vehicleType', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950"
          >
            <option value="MOTORBIKE">Mota</option>
            <option value="BICYCLE">Bicicleta</option>
            <option value="CAR">Carro</option>
            <option value="VAN">Carrinha</option>
          </select>
        </div>

        <div>
          <label htmlFor="vehicle-registration" className="mb-2 block text-sm font-bold">Matrícula</label>
          <input
            id="vehicle-registration"
            type="text"
            value={vehicle.registrationNumber}
            onChange={(event) => updateVehicle('registrationNumber', event.target.value.toUpperCase())}
            placeholder="Ex.: LD-12-34-AB"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold uppercase outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="vehicle-make" className="mb-2 block text-sm font-bold">Marca <span className="font-normal text-slate-400">(opcional)</span></label>
            <input
              id="vehicle-make"
              type="text"
              value={vehicle.make}
              onChange={(event) => updateVehicle('make', event.target.value)}
              placeholder="Ex.: Honda"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div>
            <label htmlFor="vehicle-model" className="mb-2 block text-sm font-bold">Modelo <span className="font-normal text-slate-400">(opcional)</span></label>
            <input
              id="vehicle-model"
              type="text"
              value={vehicle.model}
              onChange={(event) => updateVehicle('model', event.target.value)}
              placeholder="Ex.: CB 125"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="vehicle-color" className="mb-2 block text-sm font-bold">Cor</label>
          <input
            id="vehicle-color"
            type="text"
            value={vehicle.color}
            onChange={(event) => updateVehicle('color', event.target.value)}
            placeholder="Ex.: Preto"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-bold">Documento do veículo</p>
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm font-bold dark:border-slate-700">
            <span className="max-w-[75%] truncate">
              {vehicle.documentFile ? vehicle.documentFile.name : 'Adicionar documento'}
            </span>
            <span className="text-violet-600">Escolher</span>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => updateVehicle('documentFile', event.target.files?.[0] || null)}
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-400">PDF, JPG, PNG ou WEBP · máximo 10 MB.</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          O veículo fica associado à candidatura e permanece inactivo até a Pedejá concluir a análise. Não podes activar um veículo durante a candidatura.
        </div>

        <button
          type="button"
          onClick={saveVehicle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'A guardar…' : 'Continuar'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </div>
    </section>
  );

  const renderVehicleSaved = () => (
    <section className="flex flex-1 flex-col justify-center py-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Candidatura de estafeta · 04</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Veículo registado.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Os dados do veículo foram associados à tua candidatura. A próxima etapa será a tua informação de operação.
      </p>
      <button
        type="button"
        onClick={() => setStage('onboarding-operating')}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white"
      >
        Continuar <ArrowRight size={18} />
      </button>
    </section>
  );

  const renderProfileSaved = () => (
    <section className="flex flex-1 flex-col justify-center py-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Candidatura de estafeta · 03</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Perfil guardado.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        O teu perfil foi registado. A próxima etapa será a informação do veículo.
      </p>
      <button
        type="button"
        onClick={() => setStage('onboarding-vehicle')}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white"
      >
        Continuar <ArrowRight size={18} />
      </button>
    </section>
  );

  const renderIdentitySaved = () => (
    <section className="flex flex-1 flex-col justify-center py-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Candidatura de estafeta · 02</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Documentos recebidos.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        A identidade, a carta de condução e o IBAN foram registados para análise. A próxima etapa será o teu perfil.
      </p>
      <button type="button" onClick={() => setStage('onboarding-profile')}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white">
        Continuar <ArrowRight size={18} />
      </button>
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
        {authMode === 'register' && stage === 'onboarding-next' && renderIdentityProof()}
        {authMode === 'register' && stage === 'onboarding-identity-saved' && renderIdentitySaved()}
        {authMode === 'register' && stage === 'onboarding-profile' && renderProfile()}
        {authMode === 'register' && stage === 'onboarding-profile-saved' && renderProfileSaved()}
        {authMode === 'register' && stage === 'onboarding-vehicle' && renderVehicle()}
        {authMode === 'register' && stage === 'onboarding-vehicle-saved' && renderVehicleSaved()}

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
