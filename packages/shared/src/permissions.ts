export const Permission = {
  ORG_UPDATE: 'ORG_UPDATE',
  ORG_DELETE: 'ORG_DELETE',
  MEMBER_READ: 'MEMBER_READ',
  MEMBER_INVITE: 'MEMBER_INVITE',
  MEMBER_UPDATE_ROLE: 'MEMBER_UPDATE_ROLE',
  MEMBER_REMOVE: 'MEMBER_REMOVE',
  PROJECT_CREATE: 'PROJECT_CREATE',
  PROJECT_READ: 'PROJECT_READ',
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  PROJECT_DELETE: 'PROJECT_DELETE',
  API_KEY_CREATE: 'API_KEY_CREATE',
  API_KEY_READ: 'API_KEY_READ',
  API_KEY_REVOKE: 'API_KEY_REVOKE',
  USAGE_READ: 'USAGE_READ',
  AUDIT_READ: 'AUDIT_READ',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL_PERMISSIONS = Object.values(Permission);

const ADMIN_PERMISSIONS: readonly Permission[] = ALL_PERMISSIONS.filter(
  (permission) => permission !== Permission.ORG_DELETE,
);

const DEVELOPER_PERMISSIONS: readonly Permission[] = [
  Permission.MEMBER_READ,
  Permission.PROJECT_READ,
  Permission.API_KEY_READ,
  Permission.USAGE_READ,
];

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  DEVELOPER: DEVELOPER_PERMISSIONS,
};

export function permissionsForRole(role: string): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: string, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
