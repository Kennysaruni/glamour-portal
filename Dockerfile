# Streamlined Multi-stage Dockerfile for Next.js Standalone Container
# Optimized for low memory and disk footprint on AWS EC2 t3.micro (1 GB RAM, 8 GB disk)

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies and generate Prisma client
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts && \
    if [ -f prisma/schema.postgresql.prisma ]; then cp prisma/schema.postgresql.prisma prisma/schema.prisma; fi && \
    npx prisma generate && \
    npm cache clean --force

# Copy application source code
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build standalone Next.js bundle
RUN npm run build

# Stage 2: Minimal Production Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Public assets & runtime folders
COPY --from=builder /app/public ./public
RUN mkdir -p .next public/uploads && chown -R nextjs:nodejs .next public/uploads

# Standalone output & static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
