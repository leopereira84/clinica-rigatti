import { CHAT_LIMITS, type ChatHistoryMessage, type ChatReply, type ChatReplyStatus, type ChatRole, type ToolCallSummary } from './types';

export interface ChatErrorInfo {
  title: string;
  message: string;
  /** Whether sending the same message again may succeed. */
  retryable: boolean;
  /** Any new message would fail the same way (e.g. assistant not configured). */
  blocking?: boolean;
}

export interface ConversationMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** User message whose request failed: still shown, never sent as history. */
  failed?: boolean;
  status?: ChatReplyStatus;
  toolCalls?: ToolCallSummary[];
}

export interface ChatState {
  messages: ConversationMessage[];
  /** Id of the user message waiting for an answer; null when idle. */
  pendingId: string | null;
  error: ChatErrorInfo | null;
}

export type ChatAction =
  | { type: 'send'; id: string; content: string }
  | { type: 'reply'; requestId: string; id: string; reply: ChatReply }
  | { type: 'fail'; requestId: string; error: ChatErrorInfo }
  | { type: 'retry'; requestId: string }
  | { type: 'reset' };

export const initialChatState: ChatState = { messages: [], pendingId: null, error: null };

export function isBusy(state: ChatState): boolean {
  return state.pendingId !== null;
}

/** The last message, when it is a failed user message that can be sent again. */
export function getRetryableMessage(state: ChatState): ConversationMessage | null {
  const last = state.messages.at(-1);
  return last?.role === 'user' && last.failed && state.error?.retryable ? last : null;
}

/**
 * Conversation state. Pure and framework-free: duplicate sends are ignored
 * while a request is pending, and answers to requests that no longer matter
 * (e.g. after "Nova conversa") are discarded by comparing request ids.
 */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'send': {
      const content = action.content.trim();
      if (isBusy(state) || content === '') return state;
      return {
        messages: [...state.messages, { id: action.id, role: 'user', content }],
        pendingId: action.id,
        error: null,
      };
    }

    case 'reply': {
      if (action.requestId !== state.pendingId) return state;
      const { reply, status, toolCalls } = action.reply;
      return {
        messages: [...state.messages, { id: action.id, role: 'assistant', content: reply, status, toolCalls }],
        pendingId: null,
        error: null,
      };
    }

    case 'fail': {
      if (action.requestId !== state.pendingId) return state;
      return {
        messages: state.messages.map((m) => (m.id === action.requestId ? { ...m, failed: true } : m)),
        pendingId: null,
        error: action.error,
      };
    }

    case 'retry': {
      const target = getRetryableMessage(state);
      if (isBusy(state) || target?.id !== action.requestId) return state;
      return {
        messages: state.messages.map((m) => (m.id === target.id ? { ...m, failed: false } : m)),
        pendingId: target.id,
        error: null,
      };
    }

    case 'reset':
      return initialChatState;
  }
}

/**
 * History sent to the API, within the backend limits: failed messages are
 * left out, each message is cut to the maximum length (long assistant answers
 * would otherwise make the next request invalid) and only the most recent
 * messages are kept.
 */
export function buildHistory(messages: ConversationMessage[]): ChatHistoryMessage[] {
  return messages
    .filter((message) => !message.failed)
    .map((message) => ({ role: message.role, content: message.content.slice(0, CHAT_LIMITS.maxMessageLength) }))
    .slice(-CHAT_LIMITS.maxMessages);
}
