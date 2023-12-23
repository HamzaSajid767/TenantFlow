# API

Base URL: `http://localhost:3000`

Errors:

```json
{ "statusCode": 400, "code": "VALIDATION_ERROR", "message": "Invalid request", "requestId": "..." }
```

Swagger: `/docs`.

## Auth

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/auth/register` | public |
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | refresh cookie |
| POST | `/auth/logout` | JWT |
| GET | `/auth/me` | JWT |

## Organizations

| Method | Path | Permission |
| --- | --- | --- |
| GET/POST | `/organizations` | JWT |
| GET | `/organizations/:id` | member |
| PATCH | `/organizations/:id` | ORG_UPDATE |
| DELETE | `/organizations/:id` | ORG_DELETE (OWNER) |
| GET | `/organizations/:id/members` | MEMBER_READ |
| GET | `/organizations/:id/members/:memberId` | MEMBER_READ |
| PATCH/DELETE | `/organizations/:id/members/:memberId` | MEMBER_UPDATE_ROLE / MEMBER_REMOVE |
| GET/POST | `/organizations/:id/invitations` | MEMBER_READ / MEMBER_INVITE |
| DELETE | `/organizations/:id/invitations/:invitationId` | MEMBER_INVITE |
| POST | `/invitations/accept` | JWT (email must match) |
| CRUD | `/organizations/:id/projects` | project permissions |
| GET/POST/DELETE | `/organizations/:id/api-keys` | API key permissions |
| GET | `/organizations/:id/usage` | USAGE_READ |
| GET | `/organizations/:id/audit-logs` | AUDIT_READ |

Pagination: `?page=1&limit=20` (projects, usage lists, audit logs). Audit logs also accept `?sort=asc|desc`. Project list responses are `{ data, meta }`.

## Customer API

`Authorization: Bearer sk_live_<prefix>_<secret>`

| Method | Path |
| --- | --- |
| POST | `/v1/events` |
| GET | `/v1/events` |

Rate-limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` on 429.

## Health

`GET /health` → `{ status, checks: { database, redis } }`
