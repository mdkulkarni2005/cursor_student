# syntax=docker/dockerfile:1
# Build from the repo root:  docker build -f apps/admin/Dockerfile -t studentos-admin .

FROM node:20-alpine AS base
RUN corepack enable

# --- Prune the monorepo down to just what `admin` needs --------------------
FROM base AS pruner
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN npx turbo prune admin --docker

# --- Install deps for the pruned subgraph, then build -----------------------
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# @studentos/db ships @prisma/client unbuilt — the typed model client only exists after
# `prisma generate` runs against the schema. No DATABASE_URL needed for generate.
RUN pnpm --filter @studentos/db run generate

# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN npx turbo build --filter=admin

# --- Minimal runtime image ---------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER nextjs
EXPOSE 3100
ENV PORT=3100 HOSTNAME=0.0.0.0
CMD ["node", "apps/admin/server.js"]
