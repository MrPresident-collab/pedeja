import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
};

export function FilterChip({ children, onClick, active = false }: Props) {
  return (
    <button className={`filter-chip ${active ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}
