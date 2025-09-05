export function formatYen(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value as number)) return '¥0';
  const n = Math.round(value as number);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `¥${sign}${s}`;
}

