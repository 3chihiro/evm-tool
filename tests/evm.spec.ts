import { describe, it, expect } from 'vitest';
import { buildEVMSkeleton } from '../evm-mvp-sprint2/evm';

describe('EVM Skeleton', () => {
  it('shows zeros by default', () => {
    const view = buildEVMSkeleton();
    expect(view.labels).toEqual(['PV','EV','AC','SV','CV','SPI','CPI']);
    expect(view.values[0]).toBe('¥0');
    expect(view.values[6]).toBe(0);
  });
  it('formats metrics and derived values', () => {
    const view = buildEVMSkeleton({ PV: 100000, EV: 80000, AC: 60000 });
    // PV/EV/AC
    expect(view.values[0]).toBe('¥100,000');
    expect(view.values[1]).toBe('¥80,000');
    expect(view.values[2]).toBe('¥60,000');
    // SV = EV - PV = -20,000
    expect(view.values[3]).toBe('¥-20,000');
    // CV = EV - AC = 20,000
    expect(view.values[4]).toBe('¥20,000');
    // SPI = EV/PV = 0.8
    expect(view.values[5]).toBe(0.8);
    // CPI = EV/AC = 1.333 -> 1.333 (rounded)
    expect(view.values[6]).toBe(1.333);
  });
});

