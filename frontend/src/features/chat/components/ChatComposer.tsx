import { Send } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, type RefObject, useLayoutEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { cx } from '../../../lib/cx';
import { CHAT_LIMITS } from '../types';
import styles from './Chat.module.css';

const COUNTER_THRESHOLD = CHAT_LIMITS.maxMessageLength - 200;
const MAX_HEIGHT = 160;

interface ChatComposerProps {
  busy: boolean;
  disabled?: boolean;
  /** Returns whether the message was accepted. */
  onSend: (text: string) => boolean;
  /** Lets the page move focus to the input (e.g. after "Nova conversa"). */
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

/** Message input: Enter sends, Shift+Enter breaks the line. */
export function ChatComposer({ busy, disabled = false, onSend, inputRef }: ChatComposerProps) {
  const [text, setText] = useState('');
  const canSend = !busy && !disabled && text.trim() !== '';

  // Grows with the content up to a maximum height.
  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
  }, [text, inputRef]);

  const submit = () => {
    if (canSend && onSend(text)) setText('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: Enter confirming an IME composition must not send.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.composerField}>
        <label htmlFor="assistant-message" className="visually-hidden">
          Mensagem para o assistente
        </label>
        <textarea
          id="assistant-message"
          ref={inputRef}
          className={styles.input}
          placeholder={disabled ? 'O assistente não está disponível' : 'Pergunte sobre o catálogo…'}
          rows={1}
          maxLength={CHAT_LIMITS.maxMessageLength}
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-describedby="assistant-message-hint"
        />
        <Button type="submit" icon={<Send />} iconOnly loading={busy} disabled={!canSend}>
          Enviar mensagem
        </Button>
      </div>
      <div className={styles.composerHint} id="assistant-message-hint">
        <span>
          <kbd>Enter</kbd> envia · <kbd>Shift</kbd>+<kbd>Enter</kbd> quebra a linha
        </span>
        {text.length >= COUNTER_THRESHOLD && (
          <span className={cx(text.length >= CHAT_LIMITS.maxMessageLength && styles.counterLimit)}>
            {text.length}/{CHAT_LIMITS.maxMessageLength}
          </span>
        )}
      </div>
    </form>
  );
}
