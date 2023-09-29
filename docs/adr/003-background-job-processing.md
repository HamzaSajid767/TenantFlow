See [004-background-jobs.md](004-background-jobs.md) for the canonical write-up.

## Status

Accepted

## Context

Invitation email and usage aggregation must not run on the request thread.

## Decision

BullMQ + Redis. Separate worker process. Idempotent job ids. Exponential retries. Development email adapter behind an interface.

## Consequences

- API remains available if email sending is slow.
- Requires Redis availability for jobs (and for `/v1` rate limiting).
- Operators must run both processes.
