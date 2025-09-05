import { daysBetweenInclusive, eachDayUTC, formatDOWJa, formatDD, formatYYYYMM, parseISODateUTC } from './date';

export interface HeaderSegment {
  label: string;
  x: number;      // start pixel
  width: number;  // pixel width
}

export interface TripleHeader {
  months: HeaderSegment[];
  days: HeaderSegment[];
  dows: HeaderSegment[];
  dateToX: (iso: string) => number;
  xToDate: (x: number) => string; // returns ISO date snapping to day
}

export interface BarRect { x: number; width: number; }

export interface GanttConfig {
  pxPerDay: number;
}

export function buildTripleHeader(startISO: string, endISO: string, cfg: GanttConfig): TripleHeader {
  const px = cfg.pxPerDay;
  const days = eachDayUTC(startISO, endISO);
  const daysCount = days.length;

  const months: HeaderSegment[] = [];
  const daysSeg: HeaderSegment[] = [];
  const dows: HeaderSegment[] = [];

  // Days & DOWs (1:1 per day)
  days.forEach((d, i) => {
    const x = i * px;
    daysSeg.push({ label: formatDD(d), x, width: px });
    dows.push({ label: formatDOWJa(d), x, width: px });
  });

  // Months: group consecutive days with same YYYY-MM
  let monthStartIndex = 0;
  let currentMonth = formatYYYYMM(days[0]);
  for (let i = 1; i <= daysCount; i++) {
    const m = i < daysCount ? formatYYYYMM(days[i]) : null;
    if (m !== currentMonth) {
      const x = monthStartIndex * px;
      const width = (i - monthStartIndex) * px;
      months.push({ label: currentMonth, x, width });
      monthStartIndex = i;
      currentMonth = m || currentMonth;
    }
  }

  const start = parseISODateUTC(startISO).getTime();
  const dateToX = (iso: string) => {
    const t = parseISODateUTC(iso).getTime();
    const dayIdx = Math.round((t - start) / (24 * 3600 * 1000));
    return dayIdx * px;
  };
  const xToDate = (x: number) => {
    const dayIdx = Math.max(0, Math.round(x / px));
    const d = new Date(start + dayIdx * 24 * 3600 * 1000);
    const y = d.getUTCFullYear();
    const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = d.getUTCDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  return { months, days: daysSeg, dows, dateToX, xToDate };
}

export function planBar(startISO: string, endISO: string, cfg: GanttConfig, chartStartISO: string): BarRect {
  const px = cfg.pxPerDay;
  const days = Math.max(0, daysBetweenInclusive(startISO, endISO));
  const x = buildTripleHeader(chartStartISO, chartStartISO, cfg).dateToX(startISO);
  return { x, width: days * px };
}

export function actualBar(actualStartISO: string | undefined, actualEndISO: string | undefined, cfg: GanttConfig, chartStartISO: string): BarRect | undefined {
  if (!actualStartISO || !actualEndISO) return undefined;
  const px = cfg.pxPerDay;
  const days = Math.max(0, daysBetweenInclusive(actualStartISO, actualEndISO));
  const x = buildTripleHeader(chartStartISO, chartStartISO, cfg).dateToX(actualStartISO);
  return { x, width: days * px };
}

