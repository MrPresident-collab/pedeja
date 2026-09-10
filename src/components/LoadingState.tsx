import { Loader2 } from 'lucide-react';

type Props = {
  label?: string;
};

export function LoadingState({ label = 'A carregar...' }: Props) {
  return (
    <div className="state-block">
      <div className="state-icon spinning">
        <Loader2 size={28} />
      </div>
      <h3>{label}</h3>
    </div>
  );
}
