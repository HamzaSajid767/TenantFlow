# Database

PostgreSQL 17 + Prisma 7. Schema: `packages/database/prisma/schema.prisma`.

## Models

- `users` — unique lowercase email, Argon2 hash
- `organizations` — unique slug
- `memberships` — unique `(user_id, organization_id)`
- `invitations` — hashed token, status, expiry. Partial uniqueness of pending `(org, email)` is enforced in the application (and indexed)
- `refresh_tokens` — hashed token, family id, rotation pointer
- `projects` — tenant-owned
- `api_keys` — unique prefix, HMAC hash, revoke timestamp
- `events` — customer API resource
- `usage_events` — unique `request_id` for idempotent ingest
- `usage_daily_rollups` / `usage_endpoint_rollups` — dashboard aggregates
- `audit_logs` — `organization_id` nullable for login/logout

## Indexes

Tenant and lookup indexes exist for `organization_id`, membership pairs, `api_keys.key_prefix`, usage time ranges, and audit time ranges.

## Cascades

Deleting an organization cascades projects, keys, events, usage, invitations, memberships, and org-scoped audit rows. Users are restricted from deleting if they still created keys/invitations that we keep (`onDelete: Restrict` on those FKs). Refresh tokens cascade with the user.

## Migrations

Use `prisma migrate dev` / `migrate deploy`. Generated client output: `packages/database/src/generated/client`. Runtime Prisma Client uses the `pg` driver adapter (`@prisma/adapter-pg`).
