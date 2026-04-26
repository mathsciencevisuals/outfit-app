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

## Demo login and screenshot test data

Use this account for the mobile demo and screenshot flows:

- Email: `demo@fitme.dev`
- Password: `fitme1234`

After running the seed, the demo account includes:

- 20 products with stable visible demo image URLs
- 6 recommendation records and a profile that drives populated `/recommendations`
- 4 saved looks for wardrobe and wishlist surfaces
- 1 completed try-on request with visible source, garment, and result images
- India-focused shop offers with INR pricing for shopping screenshots

Expected populated screens after login:

- Feed
- Try-On
- Saved
- Shops
- Profile

## Screenshot mode

For screenshot-only mobile runs without a backend, enable demo mode in the Expo env:

```bash
EXPO_PUBLIC_DEMO_MODE=true
```

Then open the mobile app and tap `Try Demo` from onboarding or auth. This creates a local demo session in Zustand and routes straight to the feed with screenshot-ready data for:

- profile and avatar surfaces
- feed recommendations
- saved looks
- shop offers
- try-on result cards

This mode is mobile-only and does not require a live API session to render the major screens.
