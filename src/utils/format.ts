export function formatKz(value: number): string {
  return `${value.toLocaleString('pt-AO')} Kz`;
}

export function formatKzShort(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k Kz`;
  }
  return `${value} Kz`;
}

export function formatAngolaKz(value: number): string {
  const digits = Math.round(value).toLocaleString('en-US').replace(/,/g, '.');
  return `${digits} Kz`;
}
