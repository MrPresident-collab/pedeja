import React, { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

const DISMISSED_KEY = 'pedeja_install_dismissed';
const DISMISSED_TTL = 7 * 24 * 60 * 60 * 1000; // 7 วัน

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < DISMISSED_TTL;
  } catch {
    void 0;
    return false;
  }
}

function saveDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch { void 0; }
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(() => {
    if (isInStandaloneMode() || isDismissed()) return false;
    return isIOS();
  });
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode() || isDismissed() || isIOS()) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function handleInstall() {
    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setShowBanner(false);
    });
  }

  function handleDismiss() {
    saveDismissed();
    setShowBanner(false);
    setShowIOSHint(false);
  }

  if (!showBanner) return null;

  return (
    <>
      {/* แบนเนอร์หลัก */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="bg-white rounded-2xl shadow-2xl border border-violet-100 overflow-hidden">
          {/* แถบสีส้มด้านบน */}
          <div className="h-1 bg-gradient-to-r from-violet-400 to-violet-600" />

          <div className="relative flex items-center gap-3 p-4">
            {/* ไอคอนแอป */}
            <img
              src="/icons/icon-96.png"
              alt="Pedejá"
              className="w-14 h-14 rounded-2xl shadow-md flex-shrink-0"
            />

            {/* ข้อความ */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">
                Pedejá
              </p>
              <p className="text-gray-500 text-xs mt-0.5 leading-tight">
                Instale a aplicação para uma experiência melhor
              </p>
              <p className="text-violet-500 text-xs mt-0.5">
                Grátis · leve · mais rápido que o navegador
              </p>
            </div>

            {/* ปุ่ม */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 active:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Download size={14} />
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="text-gray-400 text-xs text-center hover:text-gray-600 transition-colors"
              >
                Agora não
              </button>
            </div>

            {/* botão Fechar */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* คำแนะนำ iOS "Add to Home Screen" */}
      {showIOSHint && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-400 to-violet-600" />
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="font-bold text-gray-900">Como instalar no iPhone / iPad</p>
                <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>
                    Toque no botão <Share size={14} className="inline text-blue-500 mx-0.5" />
                    <strong> Partilhar</strong> na barra de menu inferior do Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Deslize para baixo e seleccione <strong>"Adicionar ao ecrã principal"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Toque em <strong>"Adicionar"</strong> no canto superior direito</span>
                </li>
              </ol>
              <button
                onClick={handleDismiss}
                className="mt-5 w-full bg-violet-500 hover:bg-violet-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
