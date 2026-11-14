import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isAbortError } from '../../lib/api';
import { chatApi } from './api';
import { describeChatError } from './chatErrors';
import { buildHistory, chatReducer, type ConversationMessage, getRetryableMessage, initialChatState, isBusy } from './chatState';

/**
 * Conversation with the assistant. The history lives only in memory: it is
 * discarded on "Nova conversa", on logout and when leaving the page.
 */
export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const stateRef = useRef(state);
  // Set synchronously when a request starts, so a second Enter pressed before
  // React re-renders is still ignored.
  const inFlight = useRef<AbortController | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  });

  // Leaving the page cancels the request in progress.
  useEffect(() => () => inFlight.current?.abort(), []);

  const nextId = () => {
    sequence.current += 1;
    return `msg-${sequence.current}`;
  };

  const request = useCallback(async (requestId: string, messages: ConversationMessage[]) => {
    const controller = new AbortController();
    inFlight.current = controller;
    try {
      const reply = await chatApi.send(buildHistory(messages), controller.signal);
      dispatch({ type: 'reply', requestId, id: nextId(), reply });
    } catch (error) {
      if (isAbortError(error)) return;
      dispatch({ type: 'fail', requestId, error: describeChatError(error) });
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, []);

  /** Returns false when the message was not sent (empty or a request is in progress). */
  const send = useCallback(
    (text: string): boolean => {
      const content = text.trim();
      if (content === '' || inFlight.current || isBusy(stateRef.current)) return false;

      const id = nextId();
      dispatch({ type: 'send', id, content });
      void request(id, [...stateRef.current.messages, { id, role: 'user', content }]);
      return true;
    },
    [request],
  );

  const retry = useCallback(() => {
    const target = getRetryableMessage(stateRef.current);
    if (!target || inFlight.current) return;

    dispatch({ type: 'retry', requestId: target.id });
    void request(
      target.id,
      stateRef.current.messages.map((message) => (message.id === target.id ? { ...message, failed: false } : message)),
    );
  }, [request]);

  const reset = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    dispatch({ type: 'reset' });
  }, []);

  return { state, busy: isBusy(state), canRetry: getRetryableMessage(state) !== null, send, retry, reset };
}
