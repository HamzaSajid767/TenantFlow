See [002-authentication.md](002-authentication.md) for the canonical write-up.

## Status

Accepted

## Context

SPA + API on different ports locally. Access tokens in JS memory are XSS-exposed. Refresh tokens in localStorage are worse.

## Decision

- Access JWT in JSON, stored in memory, 15 minute TTL.
- Opaque refresh token in httpOnly `SameSite=Lax` cookie (`sf_refresh`), path `/auth`.
- Store HMAC-SHA256(`JWT_REFRESH_SECRET`, raw token). Rotate on every use. Reuse of a rotated token revokes the family.

## Consequences

- XSS can still use the short-lived access token.
- Access tokens are not instantly revocable.
- Cross-site cookie CSRF is reduced by SameSite=Lax and by not putting the access token in a cookie.
