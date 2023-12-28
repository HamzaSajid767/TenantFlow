# SaaSForge

Multi-tenant SaaS API platform: organizations, RBAC, hashed API keys, Redis rate limiting, usage analytics, audit logs, and a React dashboard.

This repository is a portfolio-grade system you can clone, run, and explain in an interview. It runs fully on Docker Compose. AWS deployment is documented as a **future mapping** and is **not implemented**.

## 1. Product overview

SaaSForge lets a company register, create workspaces (organizations), invite teammates with roles, ship projects, issue API keys, and observe how those keys are used.

The management plane is a JWT-authenticated REST API plus a React dashboard. The customer plane is a small Events API authenticated by `Authorization: Bearer sk_live_...`.

## 2. Problem being solved

B2B products need tenant isolation, role-based access, secret handling, and operational visibility. Tutorial CRUD apps skip those concerns. SaaSForge implements the parts a real API platform cannot fake: hashed secrets, rotating refresh tokens, organization-scoped queries, background jobs, and tests that prove cross-tenant access fails.

## 3. Features

- Email/password registration and login (Argon2id)
- Short-lived JWT access tokens and rotating httpOnly refresh cookies
- Organizations with OWNER / ADMIN / DEVELOPER RBAC
- Member invitations via BullMQ (dev adapter logs email)
- Projects with pagination
- API keys shown once, stored as HMAC, revocable
- `/v1/events` customer API with Redis token-bucket limits
- Asynchronous usage ingest and dashboard statistics
- Organization audit logs with pagination and sort
- Health checks, request IDs, structured logs, OpenAPI

## 4. Architecture

Three processes share one PostgreSQL database and one Redis instance:

- `apps/api` — NestJS HTTP API (management + `/v1` customer API)
- `apps/worker` — BullMQ processors (email, usage ingest, rollups, cleanup)
- `apps/web` — React dashboard (Vite + TanStack Query)

```text
Browser  --JWT + refresh cookie-->  API  --SQL-->  Postgres
SDK      --API key--------------->  API  --jobs--> Redis --> Worker --SQL--> Postgres
```

Details: [docs/architecture.md](docs/architecture.md).

## 5. Technology stack

| Layer | Choice |
| --- | --- |
| API / worker | NestJS 11, TypeScript (strict), Prisma 7, PostgreSQL 17, Redis 7, BullMQ |
| Auth | JWT access tokens, HMAC-hashed refresh tokens, Argon2id passwords |
| Frontend | React 19, Vite, TanStack Query, React Router, Tailwind CSS, Recharts |
| Tooling | pnpm workspaces, ESLint, Prettier, Jest, Docker Compose |

## 6. Repository structure

```text
apps/api              HTTP API
apps/worker           Background jobs
apps/web              Dashboard
packages/database     Prisma schema, migrations, seed, client factory
packages/shared       Roles, permissions, error codes, queue names
packages/config       Shared TS/ESLint bases
docker/               Postgres init, API entrypoint, nginx
docs/                 Architecture, security, ADRs
```

## 7. Local development

Requirements: Node 22+, pnpm 10+, Docker.

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm db:migrate:deploy
pnpm --filter @saasforge/shared build
pnpm db:seed
pnpm dev
```

`pnpm dev` starts API, worker, and web in parallel.

- API: http://localhost:3000
- Swagger: http://localhost:3000/docs
- Worker health: http://localhost:3001/health
- Dashboard: http://localhost:5173

Individual processes: `pnpm dev:api`, `pnpm dev:worker`, `pnpm dev:web`.

## 8. Environment variables

See [.env.example](.env.example). Never commit a real `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for jobs, rate limits, login throttle |
| `JWT_ACCESS_SECRET` | HS256 key for access tokens |
| `JWT_REFRESH_SECRET` | HMAC key for refresh-token hashes |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_ACCESS_TTL_SECONDS` | Access TTL in seconds (aliases) |
| `JWT_REFRESH_EXPIRES_IN` / `REFRESH_TOKEN_TTL_SECONDS` | Refresh TTL in seconds (aliases) |
| `API_KEY_PEPPER` | HMAC pepper for API keys |
| `API_PORT` / `WEB_PORT` | Local listen ports |
| `CORS_ORIGIN` / `WEB_ORIGIN` | Allowed browser origin (aliases) |
| `EMAIL_PROVIDER` / `EMAIL_DRIVER` | `development` logs mail (aliases) |
| `EMAIL_FROM` | From address for invitation emails |

Generate secrets with `openssl rand -base64 48`.

## 9. Docker instructions

From a clean checkout:

```bash
cp .env.example .env
docker compose up --build
```

If port 5432 or 6379 is already in use (for example a local PostgreSQL install), set `POSTGRES_PORT` / `REDIS_PORT` in `.env` and update `DATABASE_URL` / `REDIS_URL` to match.

## 10. Database migrations

Migrations live in `packages/database/prisma/migrations`. Production strategy is **migrate deploy**, not `prisma db push`.

```bash
pnpm db:migrate          # create/apply in development
pnpm db:migrate:deploy   # apply existing migrations (CI / Compose)
pnpm db:studio           # optional Prisma Studio
```

Schema notes: [docs/database.md](docs/database.md).

## 11. Seed instructions

Seed data is **development-only**. It is not used in production.

```bash
pnpm db:seed
```

Accounts (password `Supersecret1`):

| Email | Role |
| --- | --- |
| `owner@saasforge.local` | OWNER of Acme Platform |
| `admin@saasforge.local` | ADMIN |
| `developer@saasforge.local` | DEVELOPER |

## 12. Running tests

Start Postgres and Redis, then:

```bash
pnpm test          # unit tests (api, worker, web)
pnpm test:e2e      # API integration tests (alias of test:int)
pnpm typecheck
pnpm lint
```

Integration tests use database `saasforge_test` (created by `docker/postgres/init`). They cover tenant isolation, RBAC, last-owner protection, expired invitations, and revoked API keys.

## 13. Swagger / API documentation

OpenAPI UI is served at `/docs` when the API is running. Route tables and error shape: [docs/api.md](docs/api.md).

## 14. Example API requests

Register (also logs you in):

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"supersecret1"}'
```

Use the returned `accessToken` as `Authorization: Bearer <token>`. Refresh tokens are set as the `sf_refresh` httpOnly cookie on `/auth`.

Create a project and API key from the dashboard or REST, then ingest an event:

```bash
curl -X POST http://localhost:3000/v1/events \
  -H "Authorization: Bearer sk_live_........" \
  -H 'Content-Type: application/json' \
  -d '{"type":"user.signup","payload":{"plan":"pro"}}'
```

The full API key secret is returned **only** on creation.

## 15. Security model

See [docs/security.md](docs/security.md). Highlights:

- Passwords: Argon2id
- Refresh tokens: HMAC at rest, rotation, family reuse detection
- API keys: HMAC + prefix lookup, secret shown once
- RBAC enforced only on the server
- Helmet, CORS allowlist, body size limit, redacted logs

This is a teaching/portfolio system. It is **not** claimed to be perfectly secure.

## 16. Multi-tenancy strategy

Shared database, shared tables, `organizationId` on tenant-owned rows. Membership is many-to-many. Guards plus composite queries prevent IDOR. Documented in [docs/adr/001-multi-tenancy.md](docs/adr/001-multi-tenancy.md).

Never trust a client-supplied organization id as authority: the caller must be a member, and resource rows must match that organization.

## 17. Background-job architecture

The API enqueues; the worker processes. Queues: `email`, `usage`, `maintenance`. Job ids make invitation email and usage ingest idempotent. See [docs/background-jobs.md](docs/background-jobs.md) and [docs/adr/004-background-jobs.md](docs/adr/004-background-jobs.md).

## 18. AWS deployment architecture

**Not implemented.** A proposed mapping (ECS/Fargate, RDS, ElastiCache, SES, CloudWatch) is in [docs/aws-architecture.md](docs/aws-architecture.md). Local Compose is the supported runtime.

## 19. Architecture decisions

| ADR | Topic |
| --- | --- |
| [001 Multi-tenancy](docs/adr/001-multi-tenancy.md) | Shared DB + `organizationId` |
| [002 Authentication](docs/adr/002-authentication.md) | JWT + hashed rotating refresh cookie |
| [003 API key storage](docs/adr/003-api-key-storage.md) | HMAC keys, secret once |
| [004 Background jobs](docs/adr/004-background-jobs.md) | BullMQ worker, idempotent jobs |

Older filenames (`001-multi-tenancy-strategy.md`, etc.) remain as aliases.

## 20. Known limitations

- No email verification and no 2FA
- Access JWTs cannot be revoked before expiry (~15 minutes)
- Registration reveals whether an email is taken
- No PostgreSQL RLS (application-layer isolation only)
- Development email driver logs invite URLs
- Rate limits are per key/IP in a single Redis, not an edge WAF
- Default Compose secrets in `.env.example` are placeholders

## 21. Future improvements

- Email verification and 2FA
- PostgreSQL RLS as defense in depth
- Cursor pagination for large audit/usage tables
- Real email provider (SES / Resend)
- Access-token blocklist or BFF
- Per-key rate-limit overrides and billing plans
- AWS ECS/RDS/ElastiCache deployment
