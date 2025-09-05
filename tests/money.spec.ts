import { describe, it, expect } from 'vitest';
import { formatYen } from '../evm-mvp-sprint2/money';

describe('formatYen', () => {
  it('formats positive integers with commas', () => {
    expect(formatYen(0)).toBe('¥0');
    expect(formatYen(12)).toBe('¥12');
    expect(formatYen(1234)).toBe('¥1,234');
    expect(formatYen(1234567)).toBe('¥1,234,567');
  });
  it('rounds and formats decimals', () => {
    expect(formatYen(1234.49)).toBe('¥1,234');
    expect(formatYen(1234.5)).toBe('¥1,235');
  });
  it('handles negatives', () => {
    expect(formatYen(-1234)).toBe('¥-1,234');
  });
  it('handles null/undefined', () => {
    // treat as 0 for simplicity
    expect(formatYen(undefined as any)).toBe('¥0');
    expect(formatYen(null as any)).toBe('¥0');
  });
});

