# AGENTS.md

## Purpose

This repository is a production-style monorepo for the **Outfit App** (mobile + API + admin web + shared packages). Any coding agent([developers.openai.com](https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com))t architecture, continue from existing implementation, and avoid broad rewrites unless explicitly requested.

This file exists so future Codex tasks follow the same technical, architectural, UX, and deployment rules automatically.

---

## Product summary

The Outfit App is an AI-assisted fashion platform with these core product areas:

* user onboarding and authentication
* profile management
* body measurements and fit intelligence
* image upload and try-on flow
* styling and recommendation engine
* commerce and shop comparison
* saved looks / wishlist
* admin operations
* student growth systems such as rewards, referrals, and campaigns

---

## Current architecture

### Monorepo layout

* `apps/mobile` → Expo React Native app
* `apps/api` → NestJS backend API
* `apps/admin-web` → Next.js App Router admin app
* `packages/types` → shared types and schemas
* `packages/fit-engine` → fit intelligence logic
* `packages/recommendation-engine` → styling and recommendation logic
* `packages/ai-client` → try-on provider abstraction
* `packages/config` → shared config/helpers
* `packages/ui` → shared UI primitives/helpers where safe

### Deployment assumptions

* mobile app builds with Expo / EAS
* backend and admin are deployed on Railway
* the repo must remain compatible with current Expo build behavior and current Railway deployment assumptions

---

## Non-negotiable rules

1. **Do not rebuild from scratch.** Continue from the existing codebase.
2. **Do not break the current Expo APK build.**
3. **Do not break current Railway deployment compatibility.**
4. **Do not introduce backend-only code into the mobile app.**
5. **Do not move business logic into UI components.**
6. **Do not add placeholder pseudocode in final file output.**
7. **Do not remove working features just to simplify code.**
8. **Do not make large architectural changes without clear justification.**
9. **Use complete file replacements when modifying files.**
10. **Preserve the monorepo structure unless explicitly asked to change it.**

---

## Preferred stack and patterns

### Mobile

* Expo
* React Native
* TypeScript
* Expo Router
* Zustand for local app state where already used
* API service layer isolated under services/lib
* Reusable UI components
* Feature-based folders where practical

### API

* NestJS
* Prisma
* PostgreSQL
* Redis where already used or intended
* DTO validation and consistent controller/service/module structure
* REST APIs, not GraphQL unless explicitly requested

### Admin web

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui where already adopted

### Shared packages

* `packages/fit-engine` must stay pure and deterministic
* `packages/recommendation-engine` must stay modular and testable
* `packages/ai-client` must keep provider-specific integration behind interfaces/adapters

---

## Product/feature priorities

When adding or refining features, prefer this order of importance:

1. correctness of existing working flows
2. data consistency across screens
3. upload / try-on / fit flow reliability
4. recommendation quality
5. commerce/shop usability
6. visual polish
7. advanced/optional features

When both bug fixes and new features are requested, stabilize broken core behavior first unless the prompt explicitly says otherwise.

---

## State management rules

1. Profile, measurement, and try-on state must not drift across screens.
2. If data is saved on one screen and shown on another, ensure refetch/invalidation or store synchronization is handled correctly.
3. Avoid duplicated profile truth across multiple stores.
4. Uploaded image URLs must be persisted and rehydrated properly.
5. Navigation back to a previous screen must not show stale profile or measurement data.

---

## Upload and image handling rules

1. Mobile should use proper upload flows, not rely on local device URIs beyond local preview state.
2. Uploaded image metadata/URLs must be persisted through the backend and returned cleanly.
3. Profile image upload and try-on image upload should follow consistent patterns unless there is a strong reason otherwise.
4. UI should show local preview immediately, then switch to persisted remote asset after save.
5. Never overwrite uploaded image fields with stale form state.

---

## Fit Intelligence rules

The fit system is guidance, not an exact guarantee.

Any fit-related implementation should support:

* recommended size
* fit label (slim / regular / relaxed)
* confidence score
* issue flags (e.g. chest-tight, waist-loose, sleeve-long)
* explanation text for the UI

Fit logic must be:

* deterministic where possible
* category-aware
* influenced by fit preference
* resilient when data is incomplete
* lower confidence when measurement or size-chart data is weak

---

## Recommendation rules

Recommendations should improve over MVP ranking by considering:

* fit intelligence output
* style preferences
* color compatibility
* budget preference
* saved looks / prior user interactions when available
* product category and occasion tags

Recommendations should surface reasons such as:

* best fit for your measurements
* matches your style
* within your budget
* complements selected color
* suitable for interview / casual / fest / formal

---

## Commerce rules

Commerce and shopping features should support:

* inventory offers
* shop comparison
* best price / best fit / best style badges
* retailer handoff / outbound link patterns
* saved look to shopping flow
* cheaper alternatives

Do not implement on-platform checkout unless explicitly requested. External handoff is acceptable.

---

## UX and design rules

The desired UI style is **premium fashion-tech**, not plain utility admin styling.

### Mobile UX expectations

* strong visual hierarchy
* profile header at top where relevant
* logout easy to find in profile/account surfaces
* reusable cards, chips, badges, and CTA buttons
* polished loading, empty, success, and error states
* consistent spacing, radius, and typography
* color usage should feel cohesive and intentional

### Admin UX expectations

* practical operations-first screens
* tables plus usable CRUD forms
* clear navigation and filtering
* not overdesigned, but not raw scaffolding either

---

## Navigation rules

1. Do not strand important screens behind missing buttons.
2. Profile page should act as a hub for profile-related navigation.
3. Important routes should remain discoverable after refactors.
4. Preserve Expo Router conventions and do not introduce confusing custom routing unless necessary.

---

## API quality bar

All API work should aim for:

* consistent request/response shapes
* DTO validation
* clear status/error handling
* stable field names
* predictable relation loading
* no silent shape changes that break mobile or admin

When changing an API response used by mobile/admin, update the clients in the same task.

---

## Schema/database rules

1. Extend the existing Prisma schema instead of redesigning it.
2. Add indexes for commonly queried fields where useful.
3. Prefer additive, migration-safe changes.
4. Preserve existing entities and relations where possible.
5. Keep naming consistent with current models.

---

## Testing and verification expectations

When implementing a change, think through these flows if relevant:

* login / logout
* profile load and persistence
* profile image upload and display
* measurement save and cross-screen refresh
* try-on upload / request / result flow
* fit display and explanation
* recommendations responding to style/budget/fit
* shop offers and CTA handoff
* saved looks behavior

If tests exist, update them. If tests do not exist, do not block on creating a full test suite unless explicitly requested.

---

## Output format expectations for coding tasks

When making changes:

* return complete file replacements only
* avoid partial snippets unless explicitly asked
* include all imports/exports
* keep code compiling
* keep naming clear and consistent
* prefer minimal safe change over sweeping refactor

When the task is large, output changes in this sequence unless the prompt requests otherwise:

1. shared package updates
2. schema and backend changes
3. service/store/query changes
4. UI screens/components
5. seed/demo/test updates

---

## Things to inspect first before changing code

For bug-fix tasks, inspect these before rewriting:

* mobile API service layer
* auth/profile/try-on stores
* React Query invalidation/refetch logic if present
* DTO ↔ Prisma ↔ response mapping
* image upload endpoints and persistence fields
* navigation and layout wrappers

---

## Guidance for future prompts

If the user asks for:

* **bug fixes** → prioritize minimal targeted fixes
* **new features** → extend existing modules, do not rebuild
* **polish** → improve UX without breaking flows
* **hardening** → add validation, logging, rate limits, and consistency without changing product behavior

If the user asks to review current code, perform a continuation pass rather than a full regeneration.

---

## Repo-specific reminders

* Profile page should be a real hub with visible identity, logout, and navigation actions.
* Uploaded profile pictures must persist after save and app reload.
* Measurement changes must show across screens after save/navigation.
* Try-on uploads and profile uploads should be handled consistently.
* D and E features should build on fit intelligence, not ignore it.
* Design consistency matters: color system, navigation, and hierarchy should feel cohesive across the app.

---

## Default instruction to follow on every task

Continue from the existing Outfit App implementation. Preserve Expo and Railway compatibility. Fix broken behavior before expanding features. Keep business logic modular, keep mobile free of backend-only code, return complete file replacements, and avoid broad rewrites unless explicitly requested.
