import { describe, expect, it } from 'vitest';
import { centsToInputValue, formatCents, parseCurrencyToCents } from './money';

// Intl output uses a non-breaking space between "R$" and the number.
const normalizeSpaces = (value: string) => value.replace(/\s/g, ' ');

describe('formatCents', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [89_900, 'R$ 899,00'],
    [349_990, 'R$ 3.499,90'],
    [100_000_000, 'R$ 1.000.000,00'],
  ])('%i cents -> %s', (cents, expected) => {
    expect(normalizeSpaces(formatCents(cents))).toBe(expected);
  });
});

describe('centsToInputValue', () => {
  it('produces an editable pt-BR value that parses back to the same cents', () => {
    for (const cents of [0, 1, 99, 1_990, 349_990, 100_000_000]) {
      expect(parseCurrencyToCents(centsToInputValue(cents))).toBe(cents);
    }
  });
});

describe('parseCurrencyToCents', () => {
  it.each([
    ['199,90', 19_990],
    ['1.234,56', 123_456],
    ['1234,5', 123_450],
    ['R$ 10', 1_000],
    ['  25  ', 2_500],
    ['0,07', 7],
    ['1234.56', 123_456],
    ['1.5', 150],
    ['1.234', 123_400],
    ['10.000', 1_000_000],
    ['1.000.000,00', 100_000_000],
  ])('"%s" -> %i cents', (input, cents) => {
    expect(parseCurrencyToCents(input)).toBe(cents);
  });

  it('avoids floating-point errors (19,99 is exactly 1999 cents)', () => {
    expect(parseCurrencyToCents('19,99')).toBe(1_999);
    expect(parseCurrencyToCents('0,29')).toBe(29);
  });

  it.each(['', 'abc', '-10', '10,999', '1,2,3', '12.34.56', '10,', ',50', '1e5'])('rejects "%s"', (input) => {
    expect(parseCurrencyToCents(input)).toBeNull();
  });
});
