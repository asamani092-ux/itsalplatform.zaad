# Stage 1 — dependencies
# Install ALL deps (including dev) so Next/TypeScript/Prisma can build even when
# Coolify injects NODE_ENV=production at build time.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Skip postinstall here — prisma schema is not in the context yet.
RUN npm ci --include=dev --ignore-scripts

# Stage 2 — build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma.config.ts requires DATABASE_URL; build does not need a live DB.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ARG NEXT_PUBLIC_APP_URL=http://localhost:3001
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npx prisma generate
RUN npm run build

# Stage 3 — runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# migrate deploy + director bootstrap tools
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/scripts/create-director.mjs ./scripts/create-director.mjs
COPY --from=builder /app/scripts/migrate-deploy.mjs ./scripts/migrate-deploy.mjs
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh \
  && mkdir -p ./node_modules/.bin \
  && ln -sf ../prisma/build/index.js ./node_modules/.bin/prisma \
  && chown -R nextjs:nodejs ./scripts ./node_modules/prisma ./node_modules/@prisma ./node_modules/dotenv ./node_modules/bcryptjs ./node_modules/.bin ./prisma.config.ts

USER nextjs
EXPOSE 3001
CMD ["sh", "./scripts/docker-entrypoint.sh"]
