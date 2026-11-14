import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { getErrorMessage, getFieldErrors } from './errors';

describe('getErrorMessage', () => {
  it('translates known API error codes to pt-BR', () => {
    expect(getErrorMessage(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'))).toBe(
      'E-mail ou senha incorretos.',
    );
    expect(getErrorMessage(new ApiError(0, 'NETWORK_ERROR', ''))).toMatch(/conectar ao servidor/);
  });

  it('never shows raw technical messages for unknown errors', () => {
    expect(getErrorMessage(new ApiError(500, 'INTERNAL_ERROR', 'stack trace here'))).toBe(
      'Ocorreu um erro inesperado. Tente novamente em instantes.',
    );
    expect(getErrorMessage(new Error('boom'))).not.toContain('boom');
  });
});

describe('getFieldErrors', () => {
  it('maps backend validation paths to form fields', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', [
      { path: 'body.price', message: 'Too small' },
      { path: 'body.name', message: 'Required' },
    ]);

    expect(getFieldErrors(error)).toEqual({ price: 'Valor inválido.', name: 'Valor inválido.' });
  });

  it('ignores non-validation errors', () => {
    expect(getFieldErrors(new ApiError(409, 'SKU_ALREADY_EXISTS', ''))).toEqual({});
  });
});
