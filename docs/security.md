# Security

This document describes important controls and the remaining limitations. SaaSForge is **not** “fully secure.”

## Controls

### Passwords

Argon2id hashes. Minimum length 10. Login failures are generic (`INVALID_CREDENTIALS`) and throttled in Redis per email+IP.

### Session tokens

- Access JWT: 15 minutes, HS256, `sub` + `email` only (no role/org claims).
- Refresh: opaque 32-byte secret, **HMAC-SHA256 with `JWT_REFRESH_SECRET` stored**, httpOnly `SameSite=Lax` cookie, 14 days.
- Rotation on every refresh. Reuse of a rotated token revokes the whole family.

### API keys

High-entropy secrets. HMAC-SHA256 with a server pepper. Prefix for lookup. Secret returned once. Logs and audit metadata store the prefix only.

### Authorization

RBAC is server-side. The permission map in `packages/shared` is the source of truth. Developers cannot invite members, create keys, or delete organizations.

### Tenant isolation

Every org-owned query includes `organizationId`. Cross-tenant access is covered by integration tests.

### HTTP

Helmet, CORS allowlist, JSON body limit 32kb, structured logs with Authorization/cookie/password redaction, request IDs.

### Jobs

Invitation tokens travel in the job payload so the email can include the link. They are not stored in Postgres. Processors log invitation ids, not tokens, except the **development email adapter**, which prints the invite URL on purpose.

## Known limitations

- No email verification and no 2FA.
- Access JWTs cannot be revoked before expiry (15 minutes).
- Registration reveals whether an email is taken (login does not).
- No Postgres RLS yet (application-layer isolation only).
- Refresh cookies are `SameSite=Lax`; a dedicated CSRF token is not used because the access token is sent as a header, not a cookie.
- Development email driver logs invite URLs.
- Rate limits are per key/IP in a single Redis, not a global edge WAF.
- Default Compose secrets in `.env.example` are placeholders, not production values.

## Threat notes

| Threat | Status |
| --- | --- |
| IDOR | Mitigated by composite queries + tests |
| Refresh token theft | Rotation + family revoke + httpOnly cookie |
| API key leak | One-time secret, hash at rest, revoke |
| Password stuffing | Argon2id + Redis lockout |
| XSS stealing access token | Short TTL, memory storage in the SPA |
| Redis outage on `/v1` | Fail closed (503) |
