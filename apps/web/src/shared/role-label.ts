export function roleLabel(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'ADMIN':
      return 'Admin';
    case 'DEVELOPER':
      return 'Developer';
    default:
      return role;
  }
}
