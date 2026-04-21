# FitMe Architecture

## Layout

- `apps/api`: NestJS backend with Prisma persistence and BullMQ background processing
- `apps/mobile`: Expo Router mobile client with feature-driven screens
- `apps/admin-web`: Next.js admin surface for operations and merchandising
- `packages/*`: shared domain types, fit logic, recommendation logic, config parsers, UI helpers, and try-on providers

## Core flows

1. Users create a profile and measurements.
2. Products, variants, size charts, and inventory offers are managed in the API and admin portal.
3. Fit assessments score a user against product-specific size ranges.
4. Recommendations rank products by fit, style preference, and color compatibility.
5. Try-on requests are queued through BullMQ and processed through the provider abstraction.
