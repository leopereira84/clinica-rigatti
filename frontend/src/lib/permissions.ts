export type Role = 'admin' | 'user';

/**
 * Mirror of the backend permission map, used only to decide what the UI
 * shows. The backend enforces every permission regardless of this file.
 */
const PERMISSIONS = {
  'products:read': ['admin', 'user'],
  'products:write': ['admin'],
  'users:manage': ['admin'],
  'chat:use': ['admin', 'user'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  const allowed: readonly Role[] = PERMISSIONS[permission];
  return allowed.includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  user: 'Usuário',
};
