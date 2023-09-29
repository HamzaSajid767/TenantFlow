# ADR 004: Background jobs

## Status

Accepted

Canonical file. `003-background-job-processing.md` is kept as an alias matching the original numbering.

## Context

Invitation email, usage event persistence, daily rollups, and expired-invitation cleanup must not run on the HTTP request thread. The API should stay available if email sending is slow or Redis is briefly busy.

## Decision

Use **BullMQ on Redis** with a separately runnable `apps/worker` process.

| Queue | Job | Idempotency |
| --- | --- | --- |
| `email` | `send-invitation` | `jobId = invite-email-{invitationId}` |
| `usage` | `record-usage` | `jobId = usage-{requestId}` and unique `usage_events.request_id` |
| `usage` | `aggregate-daily` | repeatable job; upserts rollups |
| `maintenance` | `expire-invitations` | status-conditional update |
| `maintenance` | `purge-refresh-tokens` | deletes expired/old revoked rows |

Retries: five attempts, exponential backoff from 5 seconds. Failed jobs remain in the failed set.

Email is behind an `EmailSender` interface. Local development uses `DevLoggerEmailSender`, which logs the invite URL instead of calling SES/Resend/Postmark.

Usage recording is **asynchronous**: the HTTP interceptor enqueues a small payload (ids, route, status, timing, request id) and does not write usage rows on the request path.

## Consequences

- Operators must run API **and** worker.
- Redis is required for jobs and for `/v1` rate limiting (fail-closed on the customer API if Redis is down).
- Invitation tokens travel in the job payload so the email can include the link; they are hashed at rest in Postgres.
