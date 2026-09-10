import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { setToastHandler } from './toastStore';

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setToastHandler(setMsg);
    return () => setToastHandler(null);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  return (
    <div className="toast">
      <span className="toast-check">
        <CheckCircle2 size={16} />
      </span>
      {msg}
    </div>
  );
}