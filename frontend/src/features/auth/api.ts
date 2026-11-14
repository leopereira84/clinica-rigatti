import { apiRequest } from '../../lib/api';
import type { AuthProfile, AuthResponse, LoginInput, RegisterInput } from './types';

export const authApi = {
  login: (input: LoginInput) => apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input }),
  register: (input: RegisterInput) => apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input }),
  me: (signal?: AbortSignal) => apiRequest<AuthProfile>('/auth/me', { signal }),
};
