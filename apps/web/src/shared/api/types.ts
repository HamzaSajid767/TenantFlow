export type User = { id: string; email: string; name: string };
export type Organization = {
  id: string;
  name: string;
  slug: string;
  role: 'OWNER' | 'ADMIN' | 'DEVELOPER';
  createdAt: string;
};
export type Member = {
  id: string;
  role: Organization['role'];
  createdAt: string;
  user: User;
};
export type Invitation = {
  id: string;
  email: string;
  role: Organization['role'];
  status: string;
  expiresAt: string;
  createdAt: string;
};
export type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
};
export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  projectId: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  secret?: string;
};
export type UsageStats = {
  today: { requests: number; successful: number; failed: number; averageResponseTimeMs: number };
  month: { requests: number; successful: number; failed: number; averageResponseTimeMs: number };
  byEndpoint: { method: string; endpoint: string; requests: number; averageResponseTimeMs: number }[];
  overTime: { date: string; requests: number; successful: number; failed: number }[];
};
export type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  createdAt: string;
  actor: User;
};
export type Paginated<T> = { data: T[]; meta: { page: number; limit: number; total: number } };
