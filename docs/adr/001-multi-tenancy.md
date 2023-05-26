# ADR 001: Multi-tenancy

## Status

Accepted

Canonical file for this decision. The older filename `001-multi-tenancy-strategy.md` is kept as an alias.

## Context

SaaSForge is a B2B product. Users belong to multiple organizations. Resources (projects, API keys, usage, invitations, audit logs) must never leak across tenants.

A database-per-tenant or schema-per-tenant model would complicate local development, migrations, and the portfolio demonstration without solving a current scale problem.

## Decision

Use a **shared PostgreSQL database with shared tables** and an `organizationId` tenant key on every organization-owned row.

Isolation is enforced in application code:

1. Organization id is taken from the authenticated route (`/organizations/:id/...`), never trusted as a free-form client claim.
2. `OrgMemberGuard` loads membership for `(userId, organizationId)` or returns 403.
3. `OrgPermissionsGuard` maps `OWNER | ADMIN | DEVELOPER` to permissions from `@saasforge/shared`.
4. Resource lookups always include both resource id and `organizationId`.
5. Customer `/v1` requests take the tenant from the **API key row**, not from a header.

Users may belong to many organizations via the `memberships` join table. Creating an organization creates an `OWNER` membership in the same transaction.

## Consequences

- Simple operations, one migration stream, one backup.
- A missed `organizationId` filter is an IDOR bug. Mitigated by convention, guards, and integration tests (`apps/api/test/tenancy.int-spec.ts`).
- Postgres RLS is a documented future defense-in-depth layer, not implemented.
