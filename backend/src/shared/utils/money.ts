const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formats an integer amount in cents as Brazilian reais, e.g. 129990 -> "R$ 1.299,90". */
export function formatCents(cents: number): string {
  return brlFormatter.format(cents / 100);
}

/**
 * Converts an amount in reais (possibly fractional, e.g. 1299.9) to integer
 * cents. Rounding absorbs binary floating-point noise (19.99 * 100 = 1998.999...).
 */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}
