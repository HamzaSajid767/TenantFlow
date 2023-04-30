# ADR 002: Authentication

## Status

Accepted

Canonical file for session authentication. `002-refresh-token-strategy.md` remains as a focused alias.

## Context

The dashboard is a SPA on a different origin from the API in local development. Session theft, XSS, CSRF, brute-force login, and token replay all matter.

Storing long-lived refresh tokens in `localStorage` would make XSS catastrophic. Putting the access token in a cookie would require a CSRF strategy on every mutating request.

## Decision

Split the session into two tokens:

- **Access JWT** (≈15 minutes, HS256). Returned in JSON. The SPA keeps it in memory only. Claims are `sub` and `email` — never organization or role. Authorization is loaded from the database on each request.
- **Opaque refresh token** (14 days). Set as httpOnly cookie `sf_refresh` with `SameSite=Lax`, `path=/auth`. `Secure` is off only for local HTTP; production must set `COOKIE_SECURE=true`.
- Database stores **HMAC-SHA256(`JWT_REFRESH_SECRET`, raw token)**, never the raw value.
- Every refresh **rotates** the token. Reuse of a previously rotated token **revokes the entire family**.
- Logout revokes the current family and clears the cookie.
- Passwords are hashed with **Argon2id**. Login is throttled in Redis by email+IP.

Registration logs the user in immediately. Email verification is a documented future improvement, not a fake feature.

## CSRF

The access token is sent as `Authorization: Bearer`, not as a cookie. Cross-site pages cannot read it. The refresh cookie is scoped to `/auth` and `SameSite=Lax`, so a classic CSRF POST from another site will not attach it on cross-site navigations except top-level GET (which does not refresh).

## Consequences

- XSS can still use the in-memory access token until it expires (15 minutes).
- Access JWTs are not instantly revocable.
- Refresh-token HMAC requires `JWT_REFRESH_SECRET` to stay out of the database dump; protect both.
