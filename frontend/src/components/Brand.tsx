import { ShoppingBag } from 'lucide-react';
import { cx } from '../lib/cx';
import styles from './Brand.module.css';

export const APP_NAME = 'Vitrine';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={cx(styles.brand, inverse && styles.inverse)}>
      <span className={styles.mark}>
        <ShoppingBag aria-hidden="true" />
      </span>
      {APP_NAME}
    </span>
  );
}
