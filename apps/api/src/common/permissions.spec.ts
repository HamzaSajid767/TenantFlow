import { roleHasPermission, Permission, OrganizationRole } from '@saasforge/shared';

describe('permissions', () => {
  it('gives owners every permission including org delete', () => {
    expect(roleHasPermission(OrganizationRole.OWNER, Permission.ORG_DELETE)).toBe(true);
    expect(roleHasPermission(OrganizationRole.OWNER, Permission.MEMBER_INVITE)).toBe(true);
  });

  it('prevents admins from deleting the organization', () => {
    expect(roleHasPermission(OrganizationRole.ADMIN, Permission.ORG_DELETE)).toBe(false);
    expect(roleHasPermission(OrganizationRole.ADMIN, Permission.API_KEY_CREATE)).toBe(true);
  });

  it('limits developers to read-oriented access', () => {
    expect(roleHasPermission(OrganizationRole.DEVELOPER, Permission.PROJECT_READ)).toBe(true);
    expect(roleHasPermission(OrganizationRole.DEVELOPER, Permission.MEMBER_INVITE)).toBe(false);
    expect(roleHasPermission(OrganizationRole.DEVELOPER, Permission.API_KEY_REVOKE)).toBe(false);
  });
});
