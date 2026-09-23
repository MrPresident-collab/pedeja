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
      {/* Hero Section */}
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
      )}
    </div>
  );
}

