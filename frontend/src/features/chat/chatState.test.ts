import { describe, expect, it } from 'vitest';
import {
  buildHistory,
  type ChatErrorInfo,
  type ChatState,
  chatReducer,
  type ConversationMessage,
  getRetryableMessage,
  initialChatState,
  isBusy,
} from './chatState';
import type { ChatReply } from './types';

const reply: ChatReply = {
  reply: 'O Banco Estofado custa R$ 459,90.',
  status: 'completed',
  toolCalls: [{ name: 'search_products', ok: true, input: { query: 'banco' }, resultCount: 1 }],
};

const unavailable: ChatErrorInfo = { title: 'Assistente indisponível', message: '...', retryable: true };
const notConfigured: ChatErrorInfo = { title: 'Não configurado', message: '...', retryable: false, blocking: true };

function sent(state: ChatState = initialChatState, id = 'u1', content = 'Quais bancos?'): ChatState {
  return chatReducer(state, { type: 'send', id, content });
}

describe('chatReducer', () => {
  it('starts idle and empty', () => {
    expect(initialChatState).toEqual({ messages: [], pendingId: null, error: null });
    expect(isBusy(initialChatState)).toBe(false);
  });

  it('adds the user message and enters the loading state', () => {
    const state = sent(initialChatState, 'u1', '  Quais bancos?  ');

    expect(state.messages).toEqual([{ id: 'u1', role: 'user', content: 'Quais bancos?' }]);
    expect(state.pendingId).toBe('u1');
    expect(isBusy(state)).toBe(true);
  });

  it('ignores empty messages', () => {
    expect(sent(initialChatState, 'u1', '   \n ')).toBe(initialChatState);
  });

  it('blocks a second message while a request is in progress', () => {
    const state = sent();
    expect(sent(state, 'u2', 'Outra pergunta')).toBe(state);
  });

  it('adds the assistant answer with its catalog queries and returns to idle', () => {
    const state = chatReducer(sent(), { type: 'reply', requestId: 'u1', id: 'a1', reply });

    expect(state.pendingId).toBeNull();
    expect(state.messages.at(-1)).toEqual({
      id: 'a1',
      role: 'assistant',
      content: reply.reply,
      status: 'completed',
      toolCalls: reply.toolCalls,
    });
  });

  it('marks the message as failed and exposes the error', () => {
    const state = chatReducer(sent(), { type: 'fail', requestId: 'u1', error: unavailable });

    expect(state.pendingId).toBeNull();
    expect(state.error).toBe(unavailable);
    expect(state.messages[0]?.failed).toBe(true);
    expect(getRetryableMessage(state)?.id).toBe('u1');
  });

  it('retries the failed message without duplicating it', () => {
    const failed = chatReducer(sent(), { type: 'fail', requestId: 'u1', error: unavailable });
    const retrying = chatReducer(failed, { type: 'retry', requestId: 'u1' });

    expect(retrying.messages).toEqual([{ id: 'u1', role: 'user', content: 'Quais bancos?', failed: false }]);
    expect(retrying.pendingId).toBe('u1');
    expect(retrying.error).toBeNull();
  });

  it('does not offer retry for non-retryable errors', () => {
    const state = chatReducer(sent(), { type: 'fail', requestId: 'u1', error: notConfigured });

    expect(getRetryableMessage(state)).toBeNull();
    expect(chatReducer(state, { type: 'retry', requestId: 'u1' })).toBe(state);
  });

  it('clears the error when a new message is sent', () => {
    const failed = chatReducer(sent(), { type: 'fail', requestId: 'u1', error: unavailable });
    const next = sent(failed, 'u2', 'Nova pergunta');

    expect(next.error).toBeNull();
    expect(next.messages.map((m) => m.id)).toEqual(['u1', 'u2']);
  });

  it('starts a new conversation and discards answers of the cancelled request', () => {
    const reset = chatReducer(sent(), { type: 'reset' });
    const lateAnswer = chatReducer(reset, { type: 'reply', requestId: 'u1', id: 'a1', reply });
    const lateError = chatReducer(reset, { type: 'fail', requestId: 'u1', error: unavailable });

    expect(reset).toEqual(initialChatState);
    expect(lateAnswer).toBe(reset);
    expect(lateError).toBe(reset);
  });
});

describe('buildHistory', () => {
  const message = (id: string, role: 'user' | 'assistant', content: string, failed?: boolean): ConversationMessage => ({
    id,
    role,
    content,
    ...(failed && { failed }),
  });

  it('sends text only, without ids, statuses or tool calls', () => {
    const history = buildHistory([
      message('u1', 'user', 'Oi'),
      { id: 'a1', role: 'assistant', content: 'Olá', status: 'completed', toolCalls: reply.toolCalls },
      message('u2', 'user', 'Quais bancos?'),
    ]);

    expect(history).toEqual([
      { role: 'user', content: 'Oi' },
      { role: 'assistant', content: 'Olá' },
      { role: 'user', content: 'Quais bancos?' },
    ]);
  });

  it('leaves failed messages out', () => {
    const history = buildHistory([message('u1', 'user', 'Falhou', true), message('u2', 'user', 'Nova')]);
    expect(history).toEqual([{ role: 'user', content: 'Nova' }]);
  });

  it('respects the backend limits on message length and history size', () => {
    const messages = Array.from({ length: 25 }, (_, i) =>
      message(`m${i}`, i % 2 === 0 ? 'user' : 'assistant', i === 23 ? 'x'.repeat(5_000) : `m${i}`),
    );

    const history = buildHistory(messages);

    expect(history).toHaveLength(20);
    expect(history[0]?.content).toBe('m5');
    expect(history.at(-1)).toEqual({ role: 'user', content: 'm24' });
    expect(history.every((m) => m.content.length <= 2_000)).toBe(true);
  });
});
