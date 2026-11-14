import { MessageSquarePlus, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSession } from '../auth/AuthContext';
import styles from './AssistantPage.module.css';
import { ChatComposer } from './components/ChatComposer';
import { ChatMessageItem, TypingIndicator } from './components/ChatMessageItem';
import { ChatWelcome } from './components/ChatWelcome';
import { useChat } from './useChat';

/**
 * AI assistant connected to POST /api/chat. Answers come only from the
 * backend agent, which queries the company catalog with the user's session.
 */
export function AssistantPage() {
  const { company } = useSession();
  const { state, busy, canRetry, send, retry, reset } = useChat();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const { messages, error } = state;
  const isEmpty = messages.length === 0;
  const unavailable = error?.blocking === true;

  // Keeps the latest message, the loading indicator or the error in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, busy, error]);

  const startNewConversation = () => {
    reset();
    inputRef.current?.focus();
  };

  const ask = (question: string) => {
    send(question);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Assistente IA"
        description={`Consulte o catálogo de ${company.name} em linguagem natural.`}
        actions={
          <Button
            variant="secondary"
            icon={<MessageSquarePlus />}
            onClick={startNewConversation}
            disabled={isEmpty && !busy && !error}
          >
            Nova conversa
          </Button>
        }
      />

      <section className={styles.panel} aria-label="Conversa com o assistente">
        <div className={styles.messages}>
          {isEmpty && !busy ? (
            <ChatWelcome companyName={company.name} disabled={busy || unavailable} onAsk={ask} />
          ) : (
            <div className={styles.thread} role="log" aria-live="polite" aria-relevant="additions">
              {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} />
              ))}
              {busy && <TypingIndicator />}
            </div>
          )}

          {error && (
            <Alert
              tone="error"
              title={error.title}
              className={styles.error}
              action={
                canRetry && (
                  <Button variant="secondary" size="sm" icon={<RotateCcw />} onClick={retry}>
                    Tentar novamente
                  </Button>
                )
              }
            >
              {error.message}
            </Alert>
          )}
          <div ref={endRef} />
        </div>

        <ChatComposer busy={busy} disabled={unavailable} onSend={send} inputRef={inputRef} />
      </section>
    </div>
  );
}
