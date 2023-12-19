FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY docker ./docker
COPY tsconfig.base.json ./

FROM base AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl && rm -rf /var/lib/apt/lists/*
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @saasforge/shared build
RUN pnpm --filter @saasforge/database generate
RUN pnpm --filter @saasforge/database build
RUN pnpm --filter @saasforge/api build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@saasforge/api", "start:prod"]
