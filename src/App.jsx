import { lazy, useState } from 'react';
import SplashScreen from './components/SplashScreen';

const AppShell = lazy(() => import('./AppShell'));


export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onContinue={() => setShowSplash(false)} />;
  }

  return <AppShell />;
}
