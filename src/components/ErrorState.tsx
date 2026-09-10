import { AlertCircle } from 'lucide-react';

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ title = 'Algo correu mal', message, onRetry }: Props) {
  return (
    <div className="state-block">
      <div className="state-icon error">
        <AlertCircle size={28} />
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && <button className="btn-secondary" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}
