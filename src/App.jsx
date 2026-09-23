import { lazy, Suspense, useState } from 'react';
import SplashScreen from './components/SplashScreen';

const AppShell = lazy(() => import('./AppShell'));

function BootSpinner() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-violet-800">
      <div className="text-white text-2xl font-black tracking-tight mb-6">
        Pedejá<span className="text-violet-200">.</span>
      </div>
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onContinue={() => setShowSplash(false)} />;
  }

  return (
    <Suspense fallback={<BootSpinner />}>
      <AppShell />
    </Suspense>
  );
}
