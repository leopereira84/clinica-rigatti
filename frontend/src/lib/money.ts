const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimalFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 89900 -> "R$ 899,00" (the API stores prices as integer cents). */
export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

/** 349990 -> "3.499,90", the editable representation used in forms. */
export function centsToInputValue(cents: number): string {
  return decimalFormatter.format(cents / 100);
}

/**
 * Parses a price typed by the user into integer cents without floating-point
 * arithmetic. Accepts "1.234,56", "1234,56", "1234.56", "R$ 10" and "10".
 * Returns null for anything ambiguous or malformed.
 */
export function parseCurrencyToCents(input: string): number | null {
  let value = input.replace(/R\$/i, '').replace(/\s/g, '');
  if (!value) return null;

  if (value.includes(',')) {
    // pt-BR format: "." groups thousands and "," separates decimals.
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    // Only thousand separators, e.g. "1.234" or "10.000".
    value = value.replace(/\./g, '');
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;

  const [, integerPart = '0', fractionPart = ''] = match;
  const cents = Number(integerPart) * 100 + Number(fractionPart.padEnd(2, '0'));

  return Number.isSafeInteger(cents) ? cents : null;
}
