import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  fullWidth?: boolean;
  icon?: ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
};

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  fullWidth = false,
  icon,
  type = 'button',
  disabled = false,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
      {variant === 'primary' && !icon && <ArrowRight size={17} />}
    </button>
  );
}
