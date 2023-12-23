# Background jobs

BullMQ on Redis. The API **enqueues**. The worker **processes**.

| Queue | Job | Idempotency |
| --- | --- | --- |
| `email` | `send-invitation` | `jobId = invite-email-{invitationId}` |
| `usage` | `record-usage` | `jobId = usage-{requestId}` and unique `usage_events.request_id` |
| `usage` | `aggregate-daily` | repeat every 60s; upserts rollups |
| `maintenance` | `expire-invitations` | status-conditional update |
| `maintenance` | `purge-refresh-tokens` | deletes expired/old revoked rows |

## Retries

Five attempts, exponential backoff starting at 5 seconds. Failed jobs remain in the failed set.

## Email

`EmailSender` interface. `DevLoggerEmailSender` logs the invite URL. A SES/Resend adapter can replace the provider token in `apps/worker` without changing the API.

## Usage

The HTTP interceptor does not write to Postgres. It enqueues a small payload (ids, route, status, timing, request id). The worker inserts raw events and periodically rebuilds daily/endpoint rollups for the dashboard.
