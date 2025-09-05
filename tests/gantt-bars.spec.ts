import { describe, it, expect } from 'vitest';
import { planBar, actualBar } from '../evm-mvp-sprint2/gantt';

describe('Gantt Bars', () => {
  it('computes plan bar x and width (inclusive)', () => {
    const cfg = { pxPerDay: 8 };
    const rect = planBar('2025-01-10', '2025-01-12', cfg, '2025-01-01');
    // Jan 10 is 9 days after Jan 1 (0-based), so x = 9*8 = 72
    expect(rect.x).toBe(72);
    // inclusive days = 3 -> width = 3*8 = 24
    expect(rect.width).toBe(24);
  });
  it('computes actual bar when provided', () => {
    const cfg = { pxPerDay: 10 };
    const rect = actualBar('2025-01-01', '2025-01-02', cfg, '2025-01-01');
    expect(rect).toBeDefined();
    expect(rect!.x).toBe(0);
    expect(rect!.width).toBe(20);
  });
  it('returns undefined for missing actuals', () => {
    const cfg = { pxPerDay: 10 };
    expect(actualBar(undefined, undefined, cfg, '2025-01-01')).toBeUndefined();
  });
});

