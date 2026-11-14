import { AlertCircle } from 'lucide-react';
import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId } from 'react';
import { cx } from '../../lib/cx';
import styles from './Field.module.css';

export interface ControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
  'aria-required': true | undefined;
}

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Extra content aligned to the right of the label (e.g. a character counter). */
  aside?: ReactNode;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}

/** Label, hint and error message wired to the control for accessibility. */
export function Field({ label, hint, error, required, aside, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = cx(hint ? hintId : undefined, error ? errorId : undefined) || undefined;

  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
        </label>
        {aside && <span className={styles.aside}>{aside}</span>}
      </div>

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? true : undefined,
      })}

      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Content shown inside the input, before the text (e.g. "R$" or an icon). */
  leading?: ReactNode;
  /** Content shown inside the input, after the text (e.g. a toggle button). */
  trailing?: ReactNode;
}

export function Input({ leading, trailing, className, ...rest }: InputProps) {
  if (!leading && !trailing) {
    return <input className={cx(styles.control, className)} {...rest} />;
  }

  return (
    <div className={cx(styles.group, className)}>
      {leading && <span className={styles.leading}>{leading}</span>}
      <input
        className={cx(styles.control, Boolean(leading) && styles.withLeading, Boolean(trailing) && styles.withTrailing)}
        {...rest}
      />
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </div>
  );
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(styles.control, styles.textarea, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(styles.control, styles.select, className)} {...rest}>
      {children}
    </select>
  );
}
