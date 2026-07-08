# syntax=docker/dockerfile:1
# Build from the repo root:  docker build -f apps/web/Dockerfile -t studentos-web .

FROM node:20-alpine AS base
RUN corepack enable

# --- Prune the monorepo down to just what `web` needs ---------------------
FROM base AS pruner
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN npx turbo prune web --docker

# --- Install deps for the pruned subgraph, then build ----------------------
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
ARG NEXT_PUBLIC_VAPI_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_RECRUITER_APP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_VAPI_PUBLIC_KEY=$NEXT_PUBLIC_VAPI_PUBLIC_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_RECRUITER_APP_URL=$NEXT_PUBLIC_RECRUITER_APP_URL

RUN npx turbo build --filter=web

# --- Minimal runtime image ---------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
