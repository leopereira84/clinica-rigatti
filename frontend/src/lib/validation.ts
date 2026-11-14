/**
 * Field rules shared by forms. They mirror the backend validation so most
 * mistakes are caught before a request is sent; the backend still validates.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_MAX_BYTES = 72;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Informe o e-mail.';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return 'Informe um e-mail válido.';
  return undefined;
}

export function validateNewPassword(value: string): string | undefined {
  if (value.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (new TextEncoder().encode(value).length > BCRYPT_MAX_BYTES) return 'A senha é longa demais.';
  return undefined;
}

export function validateLength(value: string, label: string, min: number, max: number): string | undefined {
  const length = value.trim().length;
  if (length === 0) return `Informe ${label}.`;
  if (length < min) return `Use pelo menos ${min} caracteres.`;
  if (length > max) return `Use no máximo ${max} caracteres.`;
  return undefined;
}

export function hasErrors<K extends string>(errors: FieldErrors<K>): boolean {
  return Object.values(errors).some(Boolean);
}
