import { Compass } from 'lucide-react';
import { ButtonLink } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

export function NotFoundPage() {
  return (
    <div style={{ padding: 'var(--space-10) var(--space-4)', maxWidth: 640, margin: '0 auto' }}>
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        action={<ButtonLink to="/">Ir para o início</ButtonLink>}
      />
    </div>
  );
}
