import { cx } from '../../lib/cx';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** When set, the spinner is announced to screen readers. */
  label?: string;
}

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <span
      className={cx(styles.spinner, styles[size])}
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
    >
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  );
}

export function FullPageSpinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={styles.fullPage}>
      <Spinner size="lg" label={label} />
    </div>
  );
}
