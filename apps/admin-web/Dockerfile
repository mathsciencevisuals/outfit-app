FROM node:22-alpine AS base
RUN npm install -g pnpm@10.10.0

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc tsconfig.json ./
COPY apps/admin-web/package.json ./apps/admin-web/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY tsconfig.json ./tsconfig.json
COPY packages/ ./packages/
COPY apps/admin-web/ ./apps/admin-web/
RUN pnpm --filter @fitme/config build
RUN pnpm --filter @fitme/ui build
RUN pnpm --filter @fitme/admin-web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/apps/admin-web/.next/standalone ./
COPY --from=builder /app/apps/admin-web/.next/static ./apps/admin-web/.next/static
COPY --from=builder /app/apps/admin-web/public ./apps/admin-web/public

EXPOSE 8080
CMD ["node", "apps/admin-web/server.js"]
