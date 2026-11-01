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

# 4. Migrator stage: lightweight one-off image for executing Prisma migrations in VPC
FROM base AS migrator
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci --omit=dev --ignore-scripts && npm install prisma@5.22.0 --no-save

CMD ["npx", "prisma", "migrate", "deploy"]

# 5. Production Runner stage: minimal secure runtime image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Enforce non-root execution for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# The project does not currently have a /public directory.
# Creating an empty folder ensures consistency if static files are mounted or served.
RUN mkdir -p public && chown nextjs:nodejs public

# Copy standalone server build and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
