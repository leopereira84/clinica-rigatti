import { ApiError, type ApiErrorDetail } from './api';

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  EMAIL_ALREADY_IN_USE: 'Este e-mail já está em uso.',
  SKU_ALREADY_EXISTS: 'Já existe um produto com este SKU.',
  PRODUCT_NOT_FOUND: 'Produto não encontrado. Ele pode ter sido excluído.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  TOO_MANY_REQUESTS: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre novamente.',
  INVALID_TOKEN: 'Sua sessão expirou. Entre novamente.',
  TOKEN_EXPIRED: 'Sua sessão expirou. Entre novamente.',
  VALIDATION_ERROR: 'Alguns campos estão inválidos. Revise e tente novamente.',
  PAYLOAD_TOO_LARGE: 'Os dados enviados são grandes demais.',
};

const GENERIC_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente em instantes.';

/** User-facing message in pt-BR for any error thrown by the API layer. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? GENERIC_MESSAGE;
  }
  return GENERIC_MESSAGE;
}

function isDetailList(value: unknown): value is ApiErrorDetail[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'path' in item);
}

/**
 * Maps backend validation details (`body.name`) to form field names (`name`).
 * Client-side validation mirrors the backend rules, so this is a fallback.
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR' || !isDetailList(error.details)) {
    return {};
  }

  const fieldErrors: Record<string, string> = {};
  for (const detail of error.details) {
    const field = detail.path.replace(/^body\./, '');
    if (field && field !== 'body') fieldErrors[field] = 'Valor inválido.';
  }
  return fieldErrors;
}
