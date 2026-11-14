import { ApiError } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import type { ChatErrorInfo } from './chatState';

/** Errors specific to the assistant, by API error code. */
const CHAT_ERRORS: Record<string, ChatErrorInfo> = {
  TOO_MANY_REQUESTS: {
    title: 'Muitas mensagens em pouco tempo',
    message: 'Você atingiu o limite de mensagens. Aguarde alguns minutos antes de continuar.',
    retryable: true,
  },
  ASSISTANT_BAD_RESPONSE: {
    title: 'Resposta inválida do assistente',
    message: 'O assistente não conseguiu montar uma resposta válida. Tente enviar a pergunta novamente.',
    retryable: true,
  },
  ASSISTANT_UNAVAILABLE: {
    title: 'Assistente indisponível',
    message: 'O serviço de IA está temporariamente indisponível. Tente novamente em instantes.',
    retryable: true,
  },
  ASSISTANT_NOT_CONFIGURED: {
    title: 'Assistente não configurado',
    message: 'O assistente de IA não está habilitado neste servidor. Fale com o responsável pela aplicação.',
    retryable: false,
    blocking: true,
  },
  ASSISTANT_TIMEOUT: {
    title: 'O assistente demorou demais',
    message: 'A consulta excedeu o tempo limite. Tente novamente ou faça uma pergunta mais específica.',
    retryable: true,
  },
  VALIDATION_ERROR: {
    title: 'Mensagem não enviada',
    message: 'A mensagem não pôde ser processada. Verifique o tamanho do texto ou inicie uma nova conversa.',
    retryable: false,
  },
};

const SESSION_EXPIRED: ChatErrorInfo = {
  title: 'Sessão expirada',
  message: 'Sua sessão expirou. Entre novamente para continuar.',
  retryable: false,
};

/** User-facing description (pt-BR) of a failed chat request. */
export function describeChatError(error: unknown): ChatErrorInfo {
  if (error instanceof ApiError) {
    // 401 also ends the session globally (see AuthContext), which redirects to login.
    if (error.status === 401) return SESSION_EXPIRED;
    const known = CHAT_ERRORS[error.code];
    if (known) return known;
  }
  // Network failures, unexpected 5xx and anything else.
  return { title: 'Não foi possível obter a resposta', message: getErrorMessage(error), retryable: true };
}
