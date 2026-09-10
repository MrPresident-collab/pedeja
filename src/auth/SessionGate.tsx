import { Logo } from '@/components/Logo';

type Props = {
  error?: string;
  onRetry?: () => void;
};

export function SessionGate({ error, onRetry }: Props) {
  return (
    <main className="onboarding splash-screen">
      <div className="splash-center">
        <Logo dark size="lg" />
        <p className="splash-tagline visible">
          {error ?? 'A preparar a tua sessão…'}
        </p>
        {error && onRetry && (
          <button className="btn-secondary" onClick={onRetry}>
            Tentar de novo
          </button>
        )}
      </div>
    </main>
  );
}