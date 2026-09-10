import type { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <div className="state-block">
      {icon && <div className="state-icon">{icon}</div>}
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
