import { Logo } from '@/components/Logo';

type Props = { onNext: () => void };

export function SplashView({ onNext }: Props) {
  return (
    <main className="onboarding splash-screen">
      <div className="splash-center">
        <Logo dark size="lg" />
      </div>
      <button className="onboarding-next" onClick={onNext}>
        Próximo
      </button>
    </main>
  );
}