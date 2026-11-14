// Mirrors the POST /api/chat contract of the backend (modules/chat).

export type ChatRole = 'user' | 'assistant';

/** History item sent to the API: text only. */
export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export type ChatReplyStatus = 'completed' | 'limit_reached' | 'refused' | 'truncated';

/** A catalog query actually executed by the backend while answering. */
export interface ToolCallSummary {
  name: string;
  ok: boolean;
  /** Validated arguments; null when the call was rejected. */
  input: Record<string, unknown> | null;
  resultCount: number | null;
}

export interface ChatReply {
  reply: string;
  status: ChatReplyStatus;
  toolCalls: ToolCallSummary[];
}

/** Limits enforced by the backend (chat.schemas.ts). */
export const CHAT_LIMITS = {
  maxMessages: 20,
  maxMessageLength: 2_000,
} as const;
