# ------------------------------------------------------------------------------
# Production Dockerfile for ZYVEN (Next.js 14 + Prisma + Standalone Output)
# ------------------------------------------------------------------------------

# 1. Base image with Alpine dependencies needed for Prisma & Node.js
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 2. Dependencies installation stage
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

# 3. Builder stage: compiles Next.js with standalone output
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prevent Next.js telemetry and set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Provide safe build-time placeholder for Prisma schema validation
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/zyven_build"

# Generate fresh Prisma Client tailored to container OS
RUN npx prisma generate

# Build Next.js application in standalone mode
RUN npm run build

# 4. Migrator dependencies build stage: installs only Prisma CLI and platform engines
FROM base AS migrator-builder
WORKDIR /app

COPY migrator/package.json migrator/package-lock.json ./
RUN npm ci

# 5. Migrator stage: minimal secure one-off image for executing Prisma migrations in VPC
FROM base AS migrator
WORKDIR /app

ENV NODE_ENV=production
ENV CHECKPOINT_DISABLE=1
ENV PRISMA_HIDE_UPDATE_MESSAGE=1

# Run as non-root user for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -G nodejs prismauser

COPY --from=migrator-builder --chown=prismauser:nodejs /app/node_modules ./node_modules
COPY --chown=prismauser:nodejs prisma/schema.prisma ./prisma/schema.prisma
COPY --chown=prismauser:nodejs prisma/migrations ./prisma/migrations

USER prismauser

CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

# 5. Production Runner stage: minimal secure runtime image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Enforce non-root execution for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -G nodejs nextjs

# The project does not currently have a /public directory.
# Creating an empty folder ensures consistency if static files are mounted or served.
RUN mkdir -p public && chown nextjs:nodejs public

# Copy standalone server build and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health | grep -q '"status":"healthy"' || exit 1

CMD ["node", "server.js"]
