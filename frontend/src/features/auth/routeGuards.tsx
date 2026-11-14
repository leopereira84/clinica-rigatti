import { ShieldX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { FullPageSpinner } from '../../components/ui/Spinner';
import type { Permission } from '../../lib/permissions';
import { useAuth, useSession } from './AuthContext';

export interface LoginRedirectState {
  from?: string;
}

/** Only for authenticated users; otherwise redirects to login, remembering the target page. */
export function ProtectedRoute() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <FullPageSpinner label="Verificando sessão…" />;
  if (state.status === 'unauthenticated') {
    const redirectState: LoginRedirectState = { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={redirectState} />;
  }
  return <Outlet />;
}

/** Login and signup pages: an authenticated user goes straight to the app. */
export function PublicOnlyRoute() {
  const { state } = useAuth();

  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'authenticated') return <Navigate to="/produtos" replace />;
  return <Outlet />;
}

/**
 * Hides screens the role cannot use. This is a UX layer only: the backend
 * rejects the corresponding requests with 403 regardless.
 */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useSession();

  if (!can(permission)) {
    return (
      <EmptyState
        icon={ShieldX}
        title="Acesso restrito"
        description="Seu perfil não tem permissão para acessar esta página. Fale com o administrador da sua empresa."
        action={<ButtonLink to="/produtos">Voltar para produtos</ButtonLink>}
      />
    );
  }
  return children;
}
