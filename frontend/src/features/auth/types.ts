import type { Role } from '../../lib/permissions';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface AuthProfile {
  user: User;
  company: Company;
}

export interface AuthResponse extends AuthProfile {
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  companyName: string;
  name: string;
  email: string;
  password: string;
}
