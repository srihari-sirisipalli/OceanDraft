# syntax=docker/dockerfile:1.6

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy workspace root files first for caching
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api --include-workspace-root

COPY apps/api ./apps/api
RUN npm --workspace apps/api run prisma:generate
RUN npm --workspace apps/api run build

# ---- runtime ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Install only runtime deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api --include-workspace-root --omit=dev

# Copy compiled artefacts and Prisma schema/migrations
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000
CMD ["sh", "-c", "npx --workspace apps/api prisma migrate deploy && node apps/api/dist/main.js"]
