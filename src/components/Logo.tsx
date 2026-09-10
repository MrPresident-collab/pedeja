type Props = {
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function Logo({ dark = false, size = 'md' }: Props) {
  const sizeClass = size === 'lg' ? 'logo-lg' : size === 'sm' ? 'logo-sm' : '';
  return (
    <div className={`brand-mark ${dark ? 'brand-mark-dark' : ''} ${sizeClass}`}>
      <span className="brand-name">Pedejá</span>
      <span className="brand-dot">.</span>
    </div>
  );
}
