export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export function parseISODateUTC(s: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`Invalid date: ${s}`);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d));
}

export function formatYYYYMM(d: Date): string {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

export function formatDD(d: Date): string {
  return d.getUTCDate().toString().padStart(2, '0');
}

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;
export function formatDOWJa(d: Date): string {
  return DOW_JA[d.getUTCDay()];
}

export function addDaysUTC(d: Date, days: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

export function daysBetweenInclusive(startISO: string, endISO: string): number {
  const a = parseISODateUTC(startISO).getTime();
  const b = parseISODateUTC(endISO).getTime();
  const diff = Math.round((b - a) / (24 * 3600 * 1000));
  return diff + 1;
}

export function eachDayUTC(startISO: string, endISO: string): Date[] {
  const start = parseISODateUTC(startISO);
  const end = parseISODateUTC(endISO);
  const days: Date[] = [];
  for (let d = start; d.getTime() <= end.getTime(); d = addDaysUTC(d, 1)) {
    days.push(new Date(d.getTime()));
  }
  return days;
}

