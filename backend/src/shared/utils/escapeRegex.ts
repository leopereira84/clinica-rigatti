/**
 * Escapes regex metacharacters so user input is matched literally
 * (prevents regex injection and catastrophic backtracking patterns).
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
