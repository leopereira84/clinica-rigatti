import { describe, expect, it } from 'vitest';
import { formatCents, reaisToCents } from '../src/shared/utils/money.js';

describe('money utilities', () => {
  it.each([
    [0, 0],
    [100, 10_000],
    [459.9, 45_990],
    [19.99, 1_999],
    [0.1 + 0.2, 30],
    [1_299.9, 129_990],
  ])('converts R$ %d to %i cents', (reais, cents) => {
    expect(reaisToCents(reais)).toBe(cents);
  });

  it('formats cents as Brazilian reais', () => {
    expect(formatCents(129_990)).toMatch(/^R\$\s1\.299,90$/);
    expect(formatCents(8_990)).toMatch(/^R\$\s89,90$/);
  });
});
