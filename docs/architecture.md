# Architecture

SaaSForge is a modular monolith split into two Node processes plus a SPA.

## Components

- **API** (`apps/api`): REST, JWT session auth, RBAC, API-key auth for `/v1`, enqueue-only BullMQ producers.
- **Worker** (`apps/worker`): BullMQ consumers, email adapter, usage ingest and rollups, cleanup.
- **Web** (`apps/web`): React dashboard. UI hides actions the role cannot perform; the API still enforces every permission.
- **PostgreSQL**: source of truth.
- **Redis**: rate-limit buckets, login throttle, BullMQ.

```text
Browser  --JWT+cookie-->  API  --SQL-->  Postgres
SDK      --API key----->  API  --jobs--> Redis --> Worker --SQL--> Postgres
```

## Why a modular monolith

The product is one bounded context (B2B API platform). Splitting into microservices would add network failure modes without a scaling requirement. Process isolation is used where it matters: HTTP vs background work, so a slow email provider cannot stall request threads.

## Multi-tenancy

Shared database, shared tables, `organizationId` tenant key.

Why this is appropriate:

- One organization is not a noisy-neighbor threat in this stage of the product.
- Schema and operations stay simple (one migration stream, one backup).
- The data model already has the column Postgres RLS would use later.

How isolation is enforced:

1. Organization id comes from the route, never from a free-form client header as authority.
2. `OrgMemberGuard` loads `(userId, organizationId)` membership or returns 403.
3. Resource queries always include `organizationId` (`findFirst({ where: { id, organizationId } })`).
4. API-key requests take the tenant from the **key row**, not the caller.

IDOR prevention is tested: user A cannot read org B; a project id from org B is 404 inside org A.

## Module boundaries

Nest modules map to domains (`auth`, `organizations`, `memberships`, `invitations`, `projects`, `api-keys`, `events`, `usage`, `audit-logs`). Controllers stay thin. Shared types live in `packages/shared`. Prisma lives in `packages/database` because **both** API and worker need the client.

## Request path (dashboard)

1. Access JWT in `Authorization`.
2. Refresh cookie `sf_refresh` only sent to `/auth/*`.
3. Guards: JWT → org membership → permission map.
4. Service performs tenant-scoped writes and audit log.

## Request path (customer API)

1. `Authorization: Bearer sk_live_...`
2. Prefix lookup, HMAC compare, revoke check.
3. Redis token bucket (fail-closed if Redis is down).
4. Handler.
5. Usage job enqueued with `jobId = usage-{requestId}`.
