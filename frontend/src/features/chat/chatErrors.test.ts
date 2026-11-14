import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import { describeChatError } from './chatErrors';

describe('describeChatError', () => {
  it.each([
    [401, 'TOKEN_EXPIRED', 'Sessão expirada', false],
    [429, 'TOO_MANY_REQUESTS', 'Muitas mensagens em pouco tempo', true],
    [502, 'ASSISTANT_BAD_RESPONSE', 'Resposta inválida do assistente', true],
    [503, 'ASSISTANT_UNAVAILABLE', 'Assistente indisponível', true],
    [503, 'ASSISTANT_NOT_CONFIGURED', 'Assistente não configurado', false],
    [504, 'ASSISTANT_TIMEOUT', 'O assistente demorou demais', true],
    [400, 'VALIDATION_ERROR', 'Mensagem não enviada', false],
  ])('maps HTTP %i %s', (status, code, title, retryable) => {
    const info = describeChatError(new ApiError(status, code, 'backend message'));

    expect(info.title).toBe(title);
    expect(info.retryable).toBe(retryable);
    expect(info.message).not.toContain('backend message');
  });

  it('only blocks the composer when the assistant is not configured', () => {
    expect(describeChatError(new ApiError(503, 'ASSISTANT_NOT_CONFIGURED', '')).blocking).toBe(true);
    expect(describeChatError(new ApiError(503, 'ASSISTANT_UNAVAILABLE', '')).blocking).toBeUndefined();
  });

  it('handles network and unexpected errors', () => {
    expect(describeChatError(new ApiError(0, 'NETWORK_ERROR', '')).message).toMatch(/conectar ao servidor/);
    expect(describeChatError(new ApiError(500, 'INTERNAL_ERROR', '')).retryable).toBe(true);
    expect(describeChatError(new Error('boom')).message).toMatch(/erro inesperado/);
  });
});
