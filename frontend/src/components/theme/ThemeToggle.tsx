import { Moon, Sun } from 'lucide-react';
import { cx } from '../../lib/cx';
import { useTheme } from './ThemeProvider';
import styles from './ThemeToggle.module.css';

/** Icon button that switches between the light and dark themes. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button type="button" className={cx(styles.toggle, className)} onClick={toggleTheme} aria-label={label} title={label}>
      <Icon aria-hidden="true" />
    </button>
  );
}
