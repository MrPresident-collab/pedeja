import React, { lazy, Suspense, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import ToastContainer from './components/ToastContainer';
import ChatModal from './components/ChatModal';
import AIChatModal from './components/AIChatModal';
import InstallBanner from './components/InstallBanner';
import AuthView from './views/AuthView';

const CustomerView = lazy(() => import('./views/CustomerView'));
const MerchantView = lazy(() => import('./views/MerchantView'));
const RiderView = lazy(() => import('./views/RiderView'));
const AdminView = lazy(() => import('./views/AdminView'));

function ViewLoader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-violet-800">
      <div className="text-white text-2xl font-black tracking-tight mb-6">Pedejá.</div>
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

function AppRouter() {
  const { isLoggedIn, activeRole, toasts, removeToast } = useApp();
  const [aiChatOpen, setAiChatOpen] = useState(false);

  return (
    <div id="app-scroll" style={{ fontFamily: "'Ubuntu', 'Inter', sans-serif" }}>
      <InstallBanner />
      {!isLoggedIn ? (
        <AuthView />
      ) : (
        <>
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          <ChatModal />
          <AIChatModal isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />

          <button
            type="button"
            onClick={() => setAiChatOpen(true)}
            className="fixed bottom-20 right-4 z-[9999] bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 group border border-purple-300/40"
            title="Pergunta à Paula"
          >
            <span className="text-xs font-bold pr-1 hidden sm:inline">Pergunta à Paula</span>
          </button>

          <Suspense fallback={<ViewLoader />}>
            {activeRole === 'customer' && <CustomerView />}
            {activeRole === 'merchant' && <MerchantView />}
            {activeRole === 'rider' && <RiderView />}
            {activeRole === 'admin' && <AdminView />}
          </Suspense>
        </>
      )}
    </div>
  );
}

export default function AppShell() {

  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
