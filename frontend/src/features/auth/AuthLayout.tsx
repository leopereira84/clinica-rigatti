import { Bot, Building2, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Brand } from '../../components/Brand';
import { ThemeToggle } from '../../components/theme/ThemeToggle';
import styles from './AuthLayout.module.css';

const HIGHLIGHTS = [
  { icon: Building2, text: 'Cada empresa com seu catálogo, totalmente isolado das demais.' },
  { icon: ShieldCheck, text: 'Perfis de administrador e usuário com permissões controladas.' },
  { icon: Bot, text: 'Assistente de IA para consultar produtos em linguagem natural.' },
];

interface AuthLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.showcase}>
        <Brand inverse />
        <div className={styles.pitch}>
          <h2 className={styles.headline}>O catálogo da sua empresa, organizado e seguro.</h2>
          <ul className={styles.highlights}>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.legal}>Ambiente de demonstração</p>
      </aside>

      <main className={styles.main}>
        <ThemeToggle className={styles.themeToggle} />
        <div className={styles.mobileBrand}>
          <Brand />
        </div>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </div>
        <p className={styles.footer}>{footer}</p>
      </main>
    </div>
  );
}
