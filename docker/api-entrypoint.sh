#!/bin/sh
set -eu
pnpm --filter @saasforge/database migrate:deploy
exec pnpm --filter @saasforge/api start:prod
