import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Alert.module.css';

type Tone = 'error' | 'info' | 'success';

const ICONS = { error: AlertCircle, info: Info, success: CheckCircle2 } as const;

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, action, className }: AlertProps) {
  const Icon = ICONS[tone];

  return (
    <div className={cx(styles.alert, styles[tone], className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className={styles.icon} aria-hidden="true" />
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.text}>{children}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
