# FitMe

FitMe is a pnpm workspace monorepo powered by Turborepo. It includes:

- `apps/mobile`: Expo React Native app with Expo Router
- `apps/api`: NestJS API with Prisma, PostgreSQL, Redis, BullMQ, and Swagger
- `apps/admin-web`: Next.js admin portal with Tailwind and shadcn-style components
- shared packages for types, engines, config, UI helpers, and AI provider abstractions

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker and Docker Compose

## Setup

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
cp .env.example .env
pnpm db:generate
pnpm --filter @fitme/api prisma:migrate
pnpm db:seed
```

## Run

```bash
pnpm dev
```

Target apps:

- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`
- Admin web: `http://localhost:3000`
- Expo: `pnpm --filter @fitme/mobile dev`

## Useful commands

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm --filter @fitme/api prisma:studio
```

## Android APK

To produce an installable Android APK with Expo EAS:

```bash
pnpm install
cd apps/mobile
npx eas login
npx eas build -p android --profile preview
```

After the build finishes, download the generated `.apk` and copy it to your Android phone over USB.

## Repo structure

```text
apps/
packages/
infra/
docs/
```

## Infrastructure

`infra/docker-compose.yml` provisions PostgreSQL, Redis, and MinIO.

## Seeding

The Prisma seed script inserts:

- 3 brands
- 20 products
- 3 shops
- sample size charts and inventory offers
- demo users, profiles, measurements, provider configs, saved looks, recommendations, and try-on records
