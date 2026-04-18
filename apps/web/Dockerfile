# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/web --include-workspace-root

COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --workspace apps/web run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web --include-workspace-root --omit=dev

COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/next.config.js ./apps/web/next.config.js
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "--workspace", "apps/web", "run", "start"]
