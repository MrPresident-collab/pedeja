import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import ToastContainer from '../components/ToastContainer';

export default function AuthView() {
  const { t } = useTranslation();
  const {
    authMode, setAuthMode,
    loginForm, setLoginForm,
    registerForm, setRegisterForm,
    handleLogin, handleRegister,
    authLoading,
    toasts, removeToast,
  } = useApp();
  const [showForgot, setShowForgot] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        <div className="mb-8 text-center animate-fade-in-down">
          <div className="w-20 h-20 bg-violet-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-200">
            <span className="text-5xl font-bold text-white leading-none">P</span><span className="text-2xl font-bold text-violet-300 self-end mb-2">.</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Pedejá</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('slogan')}</p>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap justify-center animate-fade-in-up">
          {['🍔 ' + t('service_food'), '📦 ' + t('service_parcel')].map((chip) => (
            <span key={chip} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full shadow-sm font-medium">
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] px-6 pt-6 pb-10 animate-slide-in-from-bottom border-t border-transparent dark:border-gray-700">
        <div className="flex mb-5 bg-gray-100 dark:bg-gray-700 rounded-2xl p-1">
          <button onClick={() => setAuthMode('login')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${authMode === 'login' ? 'bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-400 shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>
            {t('login')}
          </button>
          <button onClick={() => setAuthMode('register')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${authMode === 'register' ? 'bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-400 shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>
            {t('register')}
          </button>
        </div>

        {authMode === 'login' ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="login-identifier" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">E-mail</label>
              <input
                id="login-identifier" name="identifier" type="email"
                value={loginForm.phone || loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value, email: e.target.value })}
                className="input-field dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="email@exemplo.com" autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">{t('password')}</label>
              <input
                id="login-password" name="password" type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="input-field dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="••••••••" autoComplete="current-password"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button onClick={handleLogin} disabled={authLoading} className="w-full bg-gradient-to-r from-violet-600 to-violet-700 text-white py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-violet-200 active:scale-95 transition-transform mt-2 disabled:opacity-60">
              {authLoading ? t('loading') : t('submit_login')}
            </button>
            <button type="button" onClick={() => setShowForgot(true)} className="w-full text-center text-xs text-violet-600 dark:text-violet-400 font-medium mt-1 py-1">
              {t('forgot_password')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: t('full_name') + ' *', type: 'text', field: 'name', id: 'register-name', placeholder: 'Nome completo', autoComplete: 'name' },
              { label: 'E-mail *', type: 'email', field: 'email', id: 'register-email', placeholder: 'email@exemplo.com', autoComplete: 'email' },
              { label: 'Telefone (opcional)', type: 'tel', field: 'phone', id: 'register-phone', placeholder: '+244 9xx xxx xxx', autoComplete: 'tel' },
              { label: t('password') + ' *', type: 'password', field: 'password', id: 'register-password', placeholder: '••••••••', autoComplete: 'new-password' },
              { label: t('confirm_password') + ' *', type: 'password', field: 'confirmPassword', id: 'register-confirm-password', placeholder: '••••••••', autoComplete: 'new-password' },
            ].map(({ label, type, field, id, placeholder, autoComplete }) => (
              <div key={field}>
                <label htmlFor={id} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>
                <input
                  id={id} name={field} type={type}
                  value={registerForm[field]}
                  onChange={(e) => setRegisterForm({ ...registerForm, [field]: e.target.value })}
                  className="input-field dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder={placeholder} autoComplete={autoComplete}
                />
              </div>
            ))}
            <button onClick={handleRegister} disabled={authLoading} className="w-full bg-gradient-to-r from-violet-600 to-violet-700 text-white py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-violet-200 active:scale-95 transition-transform mt-2 disabled:opacity-60">
              {authLoading ? t('loading') : t('submit_register')}
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-4">
          Ao entrar, aceita a nossa <span className="text-violet-600 font-medium">Política de Privacidade</span>.
        </p>
      </div>

      {showForgot && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setShowForgot(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md px-6 pt-6 pb-10 animate-slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Esqueceu a palavra-passe?</h2>
            <p className="text-sm text-gray-500 mb-4">
              Para repor a palavra-passe, contacte o suporte da Pedejá.
            </p>
            <div className="bg-violet-50 rounded-2xl p-4 mb-5">
              <p className="text-xs font-semibold text-violet-700 mb-1">Suporte</p>
              <p className="text-sm text-violet-600 font-medium">Contacte o suporte através dos canais oficiais da Pedejá.</p>
            </div>
            <button onClick={() => setShowForgot(false)} className="w-full bg-gradient-to-r from-violet-600 to-violet-700 text-white py-3 rounded-2xl font-bold text-sm">
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
