import { AlertCircle, Database, Sparkles } from 'lucide-react';
import type { ConversationMessage } from '../chatState';
import { describeToolCall } from '../toolCallLabels';
import type { ToolCallSummary } from '../types';
import styles from './Chat.module.css';
import { ReplyContent } from './ReplyContent';

function ToolCallList({ toolCalls }: { toolCalls: ToolCallSummary[] }) {
  if (toolCalls.length === 0) {
    return <p className={styles.sources}>Resposta sem consulta ao catálogo.</p>;
  }

  return (
    <div className={styles.sources}>
      <span className={styles.sourcesTitle}>
        <Database aria-hidden="true" />
        Consultas ao catálogo
      </span>
      <ul className={styles.toolCalls}>
        {toolCalls.map((call, index) => {
          const label = describeToolCall(call);
          return (
            <li key={index} className={call.ok ? styles.toolCall : styles.toolCallFailed}>
              <span className={styles.toolCallTitle}>{label.title}</span>
              <span>{label.detail}</span>
              <span className={styles.toolCallResult}>{label.result}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChatMessageItem({ message }: { message: ConversationMessage }) {
  if (message.role === 'user') {
    return (
      <article className={styles.userRow} aria-label="Sua mensagem">
        <div className={styles.userBubble}>{message.content}</div>
        {message.failed && (
          <span className={styles.failedNote}>
            <AlertCircle aria-hidden="true" />
            Não enviada
          </span>
        )}
      </article>
    );
  }

  return (
    <article className={styles.assistantRow} aria-label="Resposta do assistente">
      <span className={styles.avatar} aria-hidden="true">
        <Sparkles />
      </span>
      <div className={styles.assistantBody}>
        <div className={styles.assistantBubble}>
          <ReplyContent text={message.content} />
        </div>
        <ToolCallList toolCalls={message.toolCalls ?? []} />
      </div>
    </article>
  );
}

export function TypingIndicator() {
  return (
    <div className={styles.assistantRow} role="status">
      <span className={styles.avatar} aria-hidden="true">
        <Sparkles />
      </span>
      <div className={styles.typing}>
        <span className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        Consultando o catálogo…
      </div>
    </div>
  );
}
