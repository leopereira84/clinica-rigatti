import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '../../lib/cx';
import styles from './Button.module.css';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /** Icon-only button: children are rendered as an accessible label. */
  iconOnly?: boolean;
}

function buttonClass({ variant = 'primary', size = 'md', iconOnly }: StyleProps, className?: string): string {
  return cx(styles.button, styles[variant], styles[size], iconOnly && styles.iconOnly, className);
}

function Content({ icon, iconOnly, children }: { icon?: ReactNode; iconOnly?: boolean; children?: ReactNode }) {
  return (
    <>
      {icon}
      {children && (iconOnly ? <span className="visually-hidden">{children}</span> : <span>{children}</span>)}
    </>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean;
}

export function Button({
  variant,
  size,
  icon,
  iconOnly,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, iconOnly }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content icon={loading ? <Spinner size="sm" /> : icon} iconOnly={iconOnly}>
        {children}
      </Content>
    </button>
  );
}

type ButtonLinkProps = LinkProps & StyleProps;

export function ButtonLink({ variant, size, icon, iconOnly, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, iconOnly }, className)} {...rest}>
      <Content icon={icon} iconOnly={iconOnly}>
        {children as ReactNode}
      </Content>
    </Link>
  );
}
