import { apiRequest } from '../../lib/api';
import type { User } from '../auth/types';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export const usersApi = {
  list: (signal?: AbortSignal) => apiRequest<{ items: User[] }>('/users', { signal }),
  create: (input: CreateUserInput) => apiRequest<User>('/users', { method: 'POST', body: input }),
};
