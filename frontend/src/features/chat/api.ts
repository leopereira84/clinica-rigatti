import { apiRequest } from '../../lib/api';
import type { ChatHistoryMessage, ChatReply } from './types';

export const chatApi = {
  /** Sends the conversation; the backend answers using only the real catalog. */
  send: (messages: ChatHistoryMessage[], signal?: AbortSignal) =>
    apiRequest<ChatReply>('/chat', { method: 'POST', body: { messages }, signal }),
};
