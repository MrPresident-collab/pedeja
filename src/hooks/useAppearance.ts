import { useEffect, useState } from 'react';
import type { AppearanceMode } from '@/repositories/types';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(mode: AppearanceMode): boolean {
  return mode === 'dark' || (mode === 'auto' && systemPrefersDark());
}

export function useResolvedDark(mode: AppearanceMode): boolean {
  const [dark, setDark] = useState<boolean>(() => resolve(mode));

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(mode === 'dark' || (mode === 'auto' && mq.matches));
    update();
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, [mode]);

  return dark;
}