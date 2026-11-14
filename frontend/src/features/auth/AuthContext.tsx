import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../../lib/api';
import { can, type Permission } from '../../lib/permissions';
import { tokenStorage } from '../../lib/tokenStorage';
import { authApi } from './api';
import type { AuthProfile, AuthResponse, Company, LoginInput, RegisterInput, User } from './types';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated'; sessionExpired: boolean }
  | { status: 'authenticated'; user: User; company: Company };

interface AuthContextValue {
  state: AuthState;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function initialState(): AuthState {
  return tokenStorage.get() ? { status: 'loading' } : { status: 'unauthenticated', sessionExpired: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const startSession = useCallback(({ token, user, company }: AuthResponse) => {
    tokenStorage.set(token);
    setState({ status: 'authenticated', user, company });
  }, []);

  const endSession = useCallback((sessionExpired: boolean) => {
    tokenStorage.clear();
    setState({ status: 'unauthenticated', sessionExpired });
  }, []);

  // Any authenticated request answered with 401 ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession(true));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // Restore a session kept in sessionStorage (e.g. after a page reload).
  useEffect(() => {
    if (state.status !== 'loading') return;
    const controller = new AbortController();

    authApi
      .me(controller.signal)
      .then(({ user, company }: AuthProfile) => setState({ status: 'authenticated', user, company }))
      .catch(() => {
        if (!controller.signal.aborted) endSession(false);
      });

    return () => controller.abort();
  }, [state.status, endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login: async (input) => startSession(await authApi.login(input)),
      register: async (input) => startSession(await authApi.register(input)),
      logout: () => endSession(false),
    }),
    [state, startSession, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** For components rendered inside protected routes, where a session always exists. */
export function useSession(): { user: User; company: Company; can: (permission: Permission) => boolean } {
  const { state } = useAuth();
  if (state.status !== 'authenticated') {
    throw new Error('useSession must be used inside a protected route');
  }
  const { user, company } = state;
  return { user, company, can: (permission) => can(user.role, permission) };
}
