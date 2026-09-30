import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import ToastContainer from '../components/ToastContainer';
import { supabase } from '../lib/supabase';

function ZungueiraIllustration() {
  return (
    <div className="mx-auto mb-4 h-28 w-40" aria-hidden="true">
      <svg viewBox="0 0 180 130" className="h-full w-full">
        <path d="M8 18 C42 3 72 32 103 17 C128 5 150 12 172 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-violet-300" />
        <path d="M20 31 C58 19 83 42 112 29 C135 19 153 25 166 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-violet-200" />
        <circle cx="91" cy="62" r="15" fill="currentColor" className="text-amber-200" />
        <path d="M75 59 C77 42 106 39 109 59 C101 51 86 51 75 59Z" fill="currentColor" className="text-gray-800" />
        <path d="M72 77 C79 70 102 70 111 78 L119 111 L63 111Z" fill="currentColor" className="text-violet-600" />
        <path d="M67 82 C54 86 45 96 40 109" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className="text-violet-600" />
        <path d="M113 81 C126 84 136 94 140 106" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className="text-violet-600" />
        <path d="M49 91 Q91 72 134 92 L129 112 L54 112Z" fill="currentColor" className="text-amber-400" />
        <path d="M55 91 Q91 76 128 91" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-700" />
      </svg>
    </div>
  );
}

export default function AuthView() {
  const {
    authMode, setAuthMode,
    authLoading, setAuthLoading,
    toasts, removeToast,
    setLoginForm, setRegisterForm,
    registerForm,
    notifySystem,
  } = useApp();

  const [loginMethod, setLoginMethod] = useState('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStage, setOtpStage] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [address, setAddress] = useState('');

  const resetLogin = () => {
    setIdentifier('');
    setPassword('');
    setOtp('');
    setOtpStage(false);
    setOtpPhone('');
  };

  const switchMode = (mode) => {
    resetLogin();
    setAuthMode(mode);
  };

  const handleEmailLogin = async () => {
    const email = identifier.trim().toLowerCase();
    if (!email) return notifySystem('Erro', 'Indique o e-mail', 'error');
    if (!email.includes('@')) return notifySystem('Erro', 'Indique um e-mail válido', 'error');
    if (!password) return notifySystem('Erro', 'Indique a palavra-passe', 'error');

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return notifySystem('Erro', error.message, 'error');
      setLoginForm({ phone: '', email: '', password: '' });
      notifySystem('Concluído', 'Sessão iniciada.', 'success');
    } finally {
      setAuthLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    const phone = identifier.trim();
    if (!phone) return notifySystem('Erro', 'Indique o número de telefone', 'error');

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      });
      if (error) return notifySystem('Erro', error.message, 'error');
      setOtpPhone(phone);
      setOtpStage(true);
      notifySystem('Código enviado', 'Introduza o código recebido por SMS.', 'success');
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    const token = otp.trim();
    if (!/^\d{6}$/.test(token)) return notifySystem('Erro', 'Introduza o código de 6 dígitos', 'error');

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: otpPhone,
        token,
        type: 'sms',
      });
      if (error) return notifySystem('Erro', error.message, 'error');
      resetLogin();
      notifySystem('Concluído', 'Sessão iniciada.', 'success');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    const name = registerForm.name.trim();
    const phone = registerForm.phone.trim();
    const email = registerForm.email.trim().toLowerCase();

    if (!name) return notifySystem('Erro', 'Indique o nome completo', 'error');
    if (!address.trim()) return notifySystem('Erro', 'Indique a morada', 'error');
    if (!phone) return notifySystem('Erro', 'Indique o telefone', 'error');
    if (!registerForm.password) return notifySystem('Erro', 'Indique a palavra-passe', 'error');
    if (registerForm.password.length < 6) return notifySystem('Erro', 'A palavra-passe deve ter pelo menos 6 caracteres', 'error');
    if (registerForm.password !== registerForm.confirmPassword) return notifySystem('Erro', 'As palavras-passe não coincidem', 'error');

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        phone,
        password: registerForm.password,
        options: {
          data: {
            name,
            phone,
            email: email || null,
            address: address.trim(),
          },
        },
      });

      if (error) return notifySystem('Erro', error.message, 'error');
      if (!data.user) return notifySystem('Erro', 'Não foi possível criar a conta. Tente novamente.', 'error');

      setRegisterForm({ phone: '', email: '', password: '', confirmPassword: '', name: '' });
      setAddress('');

      if (data.session) {
        notifySystem('Concluído', 'Conta criada. Bem-vindo à Pedejá.', 'success');
        return;
      }

      setLoginMethod('phone');
      setIdentifier(phone);
      setOtpPhone(phone);
      setOtpStage(true);
      setAuthMode('login');
      notifySystem('Verifique o seu telefone', 'Introduza o código recebido por SMS para concluir o registo.', 'success');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          {authMode === 'login' ? (
            <section className="text-center">
              <ZungueiraIllustration />

              <h1 className="text-2xl font-bold tracking-tight mb-7">Entre para continuar</h1>

              <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 text-left">
                {!otpStage ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-5">
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('phone'); setIdentifier(''); setPassword(''); }}
                        className={`py-2.5 rounded-xl text-sm font-bold transition ${loginMethod === 'phone' ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500'}`}
                      >
                        Phone
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('email'); setIdentifier(''); setPassword(''); }}
                        className={`py-2.5 rounded-xl text-sm font-bold transition ${loginMethod === 'email' ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500'}`}
                      >
                        Email
                      </button>
                    </div>

                    <label htmlFor="login-identifier" className="sr-only">
                      {loginMethod === 'phone' ? 'Telefone' : 'E-mail'}
                    </label>
                    <input
                      id="login-identifier"
                      type={loginMethod === 'phone' ? 'tel' : 'email'}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                      placeholder={loginMethod === 'phone' ? '+244 9xx xxx xxx' : 'email@exemplo.com'}
                      autoComplete={loginMethod === 'phone' ? 'tel' : 'username'}
                    />

                    {loginMethod === 'email' && (
                      <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700 mt-3"
                        placeholder="Palavra-passe"
                        autoComplete="current-password"
                        onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                      />
                    )}

                    <p className="text-center text-[11px] text-gray-400 mt-4">
                      Ao entrar, aceita os <span className="text-violet-600 font-medium">Termos e a Política de Privacidade</span>.
                    </p>

                    <button
                      type="button"
                      onClick={loginMethod === 'phone' ? sendPhoneOtp : handleEmailLogin}
                      disabled={authLoading}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3.5 rounded-2xl font-bold mt-4 disabled:opacity-60"
                    >
                      {authLoading ? 'A processar…' : loginMethod === 'phone' ? 'Enviar código' : 'Entrar'}
                    </button>

                    {loginMethod === 'email' && (
                      <button type="button" className="w-full text-center text-xs text-violet-600 mt-3">
                        Esqueceu a palavra-passe?
                      </button>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500 mb-4">
                      Enviámos um código para <span className="font-semibold text-gray-800 dark:text-gray-200">{otpPhone}</span>.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700 text-center text-2xl tracking-[0.45em] font-bold"
                      placeholder="000000"
                      autoComplete="one-time-code"
                      onKeyDown={(e) => e.key === 'Enter' && verifyPhoneOtp()}
                    />
                    <button
                      type="button"
                      onClick={verifyPhoneOtp}
                      disabled={authLoading}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3.5 rounded-2xl font-bold mt-4 disabled:opacity-60"
                    >
                      {authLoading ? 'A verificar…' : 'Confirmar código'}
                    </button>
                    <button type="button" onClick={resetLogin} className="w-full text-xs text-gray-500 mt-3">
                      Usar outro número
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 my-6 text-gray-300">
                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              </div>

              <p className="text-sm text-gray-500">
                Ainda não tem conta?{' '}
                <button type="button" onClick={() => switchMode('register')} className="font-bold text-violet-600">
                  Criar conta
                </button>
              </p>
            </section>
          ) : (
            <section>
              <h1 className="text-2xl font-bold tracking-tight text-center mb-7">Criar a sua conta</h1>

              <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  placeholder="Address"
                  autoComplete="street-address"
                />
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  placeholder="Nome completo"
                  autoComplete="name"
                />
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  placeholder="E-mail (optional)"
                  autoComplete="email"
                />
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  placeholder="Telefone"
                  autoComplete="tel"
                />
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  placeholder="Palavra-passe"
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  placeholder="Confirmar palavra-passe"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={authLoading}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3.5 rounded-2xl font-bold mt-2 disabled:opacity-60"
                >
                  {authLoading ? 'A criar conta…' : 'Criar conta'}
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-5">
                Já tem uma conta?{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-bold text-violet-600">
                  Entrar
                </button>
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
