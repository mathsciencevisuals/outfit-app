FROM node:22-alpine AS base
RUN npm install -g pnpm@10.10.0

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc tsconfig.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ai-client/package.json ./packages/ai-client/
COPY packages/config/package.json ./packages/config/
COPY packages/fit-engine/package.json ./packages/fit-engine/
COPY packages/recommendation-engine/package.json ./packages/recommendation-engine/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY tsconfig.json ./tsconfig.json
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @fitme/config build
RUN pnpm --filter @fitme/types build
RUN pnpm --filter @fitme/ai-client build
RUN pnpm --filter @fitme/fit-engine build
RUN pnpm --filter @fitme/recommendation-engine build
RUN pnpm --filter @fitme/api build

FROM node:22-alpine AS runner
RUN npm install -g pnpm@10.10.0
WORKDIR /app
ENV NODE_ENV=production

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/ai-client/package.json ./packages/ai-client/
COPY packages/config/package.json ./packages/config/
COPY packages/fit-engine/package.json ./packages/fit-engine/
COPY packages/recommendation-engine/package.json ./packages/recommendation-engine/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/ai-client/dist ./packages/ai-client/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/fit-engine/dist ./packages/fit-engine/dist
COPY --from=builder /app/packages/recommendation-engine/dist ./packages/recommendation-engine/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
RUN pnpm exec prisma generate

EXPOSE 3001
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/apps/api/src/main.js"]
