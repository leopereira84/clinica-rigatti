import { Eye, EyeOff } from 'lucide-react';
import { type InputHTMLAttributes, useState } from 'react';
import styles from './PasswordInput.module.css';
import { Input } from './Field';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
        >
          <Icon aria-hidden="true" />
          <span className="visually-hidden">{visible ? 'Ocultar senha' : 'Mostrar senha'}</span>
        </button>
      }
    />
  );
}
