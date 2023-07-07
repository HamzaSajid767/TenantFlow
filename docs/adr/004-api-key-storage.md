See [003-api-key-storage.md](003-api-key-storage.md) for the canonical write-up.

## Status

Accepted

## Context

API keys are verified on every `/v1` request. They are high-entropy random strings, not user-chosen passwords.

## Decision

- Generate `sk_live_<8 hex>_<64 hex>`.
- Store unique prefix for lookup.
- Store HMAC-SHA256(pepper, full key). Argon2 would be unnecessarily slow here.
- Return the secret only in the create response.

## Consequences

- Fast authenticated lookups.
- Pepper leak plus DB dump would allow offline guessing of keys; protect both.
- Prefix uniqueness could theoretically collide; 32 bits of prefix plus retry on unique violation is acceptable at this scale (create path can be extended to retry).
