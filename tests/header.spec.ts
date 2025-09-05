import { describe, it, expect } from 'vitest';
import { buildTripleHeader } from '../evm-mvp-sprint2/gantt';

describe('Triple Header', () => {
  it('builds months/days/dows for a short range', () => {
    const h = buildTripleHeader('2025-01-01', '2025-01-05', { pxPerDay: 10 });
    expect(h.months.length).toBe(1);
    expect(h.months[0].label).toBe('2025-01');
    expect(h.months[0].width).toBe(50);
    expect(h.days.map(d => d.label)).toEqual(['01','02','03','04','05']);
    expect(h.dows.map(d => d.label)).toEqual(['水','木','金','土','日']);
    expect(h.dateToX('2025-01-01')).toBe(0);
    expect(h.dateToX('2025-01-03')).toBe(20);
    expect(h.xToDate(20)).toBe('2025-01-03');
  });
});

