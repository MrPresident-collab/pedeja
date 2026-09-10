type Props = {
  className?: string;
};

export function BrandMark({ className = '' }: Props) {
  return (
    <span className={`brand-mark-lock ${className}`}>
      <span className="brand-name">P</span>
      <span className="brand-dot">.</span>
    </span>
  );
}