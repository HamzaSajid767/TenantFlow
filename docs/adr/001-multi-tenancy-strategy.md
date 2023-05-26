See [001-multi-tenancy.md](001-multi-tenancy.md) for the canonical write-up.

## Status

Accepted

## Context

SaaSForge must isolate organization data without operating a database per tenant.

## Decision

Use a shared PostgreSQL database and shared tables with an `organizationId` column. Enforce access in Nest guards and tenant-scoped queries. Keep the column ready for optional Postgres RLS later.

## Consequences

- Simple operations and backups.
- A missed `organizationId` filter is an IDOR bug — mitigated with conventions and tests.
- Very large tenants could contend for shared resources; sharding is a later problem.
