# syntax=docker/dockerfile:1
# Build from the repo root:  docker build -f apps/recruiter/Dockerfile -t studentos-recruiter .

FROM node:20-alpine AS base
RUN corepack enable

# --- Prune the monorepo down to just what `recruiter` needs -----------------
FROM base AS pruner
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN npx turbo prune recruiter --docker

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

RUN npx turbo build --filter=recruiter

# --- Minimal runtime image ---------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/recruiter/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/recruiter/.next/static ./apps/recruiter/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/recruiter/public ./apps/recruiter/public

USER nextjs
EXPOSE 3200
ENV PORT=3200 HOSTNAME=0.0.0.0
CMD ["node", "apps/recruiter/server.js"]
