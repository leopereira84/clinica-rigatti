import type { Role } from './roles.js';

/**
 * Single source of truth for authorization. Routes require permissions, not
 * roles, so changing what a role can do happens only here.
 */
export const PERMISSIONS = {
  'products:read': ['admin', 'user'],
  'products:write': ['admin'],
  'users:manage': ['admin'],
  'chat:use': ['admin', 'user'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles: readonly Role[] = PERMISSIONS[permission];
  return allowedRoles.includes(role);
}
