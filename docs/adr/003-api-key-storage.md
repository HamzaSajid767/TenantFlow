# ADR 003: API key storage

## Status

Accepted

Canonical file. `004-api-key-storage.md` is kept as an alias matching the original numbering.

## Context

API keys authenticate the public Events API (`/v1/*`) on every request. They are high-entropy random strings, not user-chosen passwords. Hashing them with Argon2 would add tens of milliseconds per request without a corresponding threat model benefit.

Plain-text storage would make a database dump immediately catastrophic.

## Decision

- Generate `sk_live_<8 hex prefix>_<64 hex secret>` with CSPRNG.
- Store a unique `keyPrefix` for lookup.
- Store `HMAC-SHA256(API_KEY_PEPPER, full key)`.
- Return the full secret **only** in the create response. List/get endpoints never include it.
- Track `createdAt`, `lastUsedAt`, `revokedAt`. Revoked keys authenticate as `401 API_KEY_REVOKED`.
- Logs and audit metadata store the prefix only.

Lookup is prefix → row → HMAC compare. Rate limiting then uses Redis keyed by the API key id.

## Consequences

- Fast authenticated lookups suitable for an API gateway-style path.
- A pepper leak plus a database dump would allow offline verification of guessed keys; protect both secrets.
- Prefix uniqueness could theoretically collide; 32 bits plus a unique constraint is acceptable at this scale.
