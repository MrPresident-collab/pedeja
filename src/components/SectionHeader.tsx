import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
};

export function SectionHeader({ eyebrow, title, action }: Props) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
