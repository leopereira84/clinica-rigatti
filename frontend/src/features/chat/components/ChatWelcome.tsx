import { Sparkles } from 'lucide-react';
import styles from './Chat.module.css';

const EXAMPLE_QUESTIONS = [
  'Quais produtos estão sem estoque?',
  'Qual é o produto mais caro do catálogo?',
  'Que produtos temos até R$ 500?',
  'Quais categorias existem no catálogo?',
];

interface ChatWelcomeProps {
  companyName: string;
  disabled: boolean;
  onAsk: (question: string) => void;
}

export function ChatWelcome({ companyName, disabled, onAsk }: ChatWelcomeProps) {
  return (
    <div className={styles.welcome}>
      <span className={styles.welcomeIcon}>
        <Sparkles aria-hidden="true" />
      </span>
      <h2 className={styles.welcomeTitle}>Como posso ajudar?</h2>
      <p className={styles.welcomeText}>
        Respondo consultando os produtos reais do catálogo de {companyName}. Quando uma informação não estiver no
        catálogo, eu aviso.
      </p>
      <ul className={styles.examples} aria-label="Sugestões de perguntas">
        {EXAMPLE_QUESTIONS.map((question) => (
          <li key={question}>
            <button type="button" className={styles.example} onClick={() => onAsk(question)} disabled={disabled}>
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
