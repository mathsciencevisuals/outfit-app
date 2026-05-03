# FitMe Product Flows, Screens, Monetization, and Metrics

This brief is based on the current FitMe mobile, API, admin, merchant, affiliate, rewards, and demo-screen implementation in this repository.

## User flows

- User completes onboarding -> adds profile, body measurements, style preferences, budget, and preferred colors -> gets a personalized fit-aware product feed.
- User opens Discover -> sees Pinterest trends plus catalog products ranked for their profile -> taps Try on -> uploads or reuses a photo -> views generated try-on.
- User uploads a photo -> tries a kurta, blazer, dress, or uploaded garment -> sees fit confidence, stylist note, recommendations, and next actions to buy, save, share, or try another.
- User views AI Recommendations -> sees products selected by fit, style, color, budget, and trend signals -> taps product -> opens affiliate or retailer handoff link.
- User saves a try-on look -> revisits it in Saved Looks -> compares shop offers or starts another try-on from the empty/saved state.
- User opens Shops -> compares retail partners, offer count, availability, and outbound retailer links -> leaves FitMe through partner checkout or affiliate URL.
- User shares a try-on -> referral code is included where available -> app records share channel and awards reward points.
- Merchant registers shop -> lists local inventory offers through merchant/admin flows -> tracks product count, listing count, try-ons, completed try-ons, and conversion rate.
- Admin/operator manages products, shops, Pinterest pins, campaigns, coupons, size charts, users, brands, and try-on requests through mobile/admin web surfaces.

## Core screens and links

- Dashboard / home: `apps/mobile/src/features/dashboard/DashboardScreen.tsx`
  - Shows greeting, user stats, trending products, and quick actions for try-on, recommendations, wishlist, and profile.
- Discover: `apps/mobile/src/features/catalog/DiscoverScreen.tsx`
  - Shows Pinterest trends, personalized trend sections, catalog picks, try-on entry, and recommendation entry.
- Try-on upload: `apps/mobile/src/features/tryon/TryOnUploadScreen.tsx`
  - Entry point for image/garment upload and generation.
- Try-on result: `apps/mobile/src/features/tryon/TryOnResultScreen.tsx`
  - Shows generated image, fit confidence, product details, stylist note, buy, save, share, Pinterest, recommendations, and retry actions.
- TryMe advanced try-on: `apps/mobile/src/features/tryon/TryMeScreen.tsx`
  - Supports multi-view generated result handling, persistent saved looks, device save, and comparison actions.
- Recommendations: `apps/mobile/src/features/recommendations/RecommendationsScreen.tsx`
  - Shows trending products, Pinterest trends, and personalized recommendations with affiliate handoff.
- Saved: `apps/mobile/src/features/saved/SavedLooksScreen.tsx`
  - Shows saved try-on looks, persisted preview imagery, delete flow, and empty-state route back to try-on.
- Profile / Preferences: `apps/mobile/src/features/profile/ProfileScreen.tsx`
  - Profile hub with avatar upload, measurements, style preferences, saved looks, merchant portal, settings, admin entry, logout, fit preference, budget, and palette.
- Shops: `apps/mobile/src/features/shops/ShopsScreen.tsx`
  - Retail partner list with offer counts and outbound website links.
- Merchant portal: `apps/mobile/src/features/merchant/MerchantPortalScreen.tsx`
  - Merchant registration, shop overview, inventory listings, and merchant analytics.
- Admin web: `apps/admin-web/src/app/dashboard/page.tsx`
  - Operational dashboard for products, shops, and try-on requests.
- Review prototype link: open `apps/mobile/ui-review/index.html` locally for a clickable screen-flow review prototype covering onboarding, profile, discover, try-on, recommendations, shops, saved looks, rewards, referrals, coupons, and challenges.

## Current monetization hooks

- Affiliate product handoff:
  - `apps/api/src/modules/affiliate/affiliate.module.ts`
  - For a selected product, the API chooses the cheapest available inventory offer and converts the outbound URL through Cuelinks when `CUELINKS_SOURCE_ID` is configured.
  - If no offer exists, the fallback is a Google shopping/search URL for the product query.

- Pinterest affiliate links:
  - `apps/api/src/modules/social/social.module.ts`
  - Budget-board Pinterest pins can be wrapped through Cuelinks using `CUELINKS_API_KEY` and `CUELINKS_SOURCE_ID`.
  - Relevant board keys live in `apps/api/src/modules/social/board-map.ts`, especially `under500`, `500_2000`, `2000_5000`, and `above5000`.

- Shop comparison and retailer handoff:
  - Products and variants can have inventory offers from connected shops.
  - Shops expose external URLs; checkout/instant handoff exists in API/client service methods.
  - The current app avoids on-platform checkout and sends users to retailer or affiliate destinations.

- Merchant onboarding:
  - Implemented through `POST /merchant/register` and the mobile Merchant Portal.
  - Merchants can own a shop and manage offers through API endpoints; admin also has shop management.

- Rewards, referrals, coupons, and campaigns:
  - Sharing try-on results can record share activity and award points.
  - Referral code and referral tracking surfaces exist.
  - Coupons and campaigns are present as growth/conversion hooks.

- Paid features:
  - No subscription, paid try-on pack, premium styling tier, or on-platform checkout fee is currently implemented.
  - Best current paid-feature candidates: premium try-on credits, student styling bundle, merchant promoted listings, sponsored Pinterest trend placements, or paid campaign slots.

## Affiliate networks

- Implemented network: Cuelinks.
- Evidence:
  - `CUELINKS_SOURCE_ID` in affiliate URL conversion.
  - `CUELINKS_API_KEY` and Cuelinks create-link API usage for Pinterest pin wrapping.
- Other networks are not implemented in the current repo.

## Metrics to estimate

These are planning assumptions, not measured production analytics.

- Daily users:
  - Pre-launch / demo: 20-100 expected daily test users.
  - Campus pilot: 300-1,000 DAU if seeded through student/referral campaigns.
- Try-ons per user:
  - Expected early range: 1.5-3.0 try-ons per active user per day.
  - Power users during campaign weeks may reach 5+.
- Save rate:
  - Expected: 15-30% of completed try-ons saved.
  - Higher if generated images look realistic and saved looks clearly connect to shopping.
- Affiliate click rate:
  - Expected: 8-18% of completed try-ons leading to Buy Now / Shop click.
  - Recommendations-only browsing may be lower: 3-8%.
- Retail conversion assumption:
  - Expected: 1-4% of affiliate clicks convert to purchase.
  - Best-case campus-specific campaigns with coupons: 4-7%.
- Share/referral rate:
  - Expected: 5-12% of completed try-ons shared if rewards/referral code is visible and the generated image is good enough.
- Merchant-side conversion:
  - Current merchant analytics uses completed try-ons divided by try-ons as a conversion-style metric.
  - A stronger future metric would distinguish try-on completed, affiliate click, retailer click, coupon redeem, and purchase confirmation.

## What is not working / gut risks

- Users may try outfits but not buy because the strongest emotional moment is the generated image, while the shop handoff can still feel generic.
- Discover can feel broad unless recommendation reasons are consistently visible on every card.
- The current `TryOnResultScreen` save action only shows an alert and does not persist; `TryMeScreen` has the stronger saved-look persistence path.
- Pinterest board IDs are placeholders unless configured, so trend/affiliate discovery depends on setup quality.
- Affiliate attribution is present, but purchase confirmation is not integrated, so true conversion measurement is incomplete.
- Merchant inventory onboarding exists, but the mobile merchant dashboard says offers may need API/admin onboarding; self-serve listing creation is not yet a polished merchant UX.
- Shop comparison is currently closer to partner listing/handoff than a full best-price marketplace experience.
- Fit confidence is useful, but users may not trust it unless issue flags and explanations are shown consistently in product cards, try-on results, and recommendation screens.
- Paid features are not active, so monetization currently relies on affiliate/merchant/growth hooks rather than direct user revenue.
- Real analytics instrumentation appears limited; metric estimates should be validated with event tracking for upload started, upload completed, try-on completed, save, share, affiliate click, shop click, coupon redeem, and referral conversion.

## Suggested next tracking events

- `onboarding_completed`
- `profile_photo_uploaded`
- `measurements_saved`
- `discover_product_viewed`
- `tryon_started`
- `tryon_completed`
- `tryon_failed`
- `look_saved`
- `affiliate_link_opened`
- `shop_link_opened`
- `recommendation_clicked`
- `pinterest_pin_clicked`
- `share_completed`
- `referral_code_shared`
- `coupon_unlocked`
- `coupon_redeemed`
- `merchant_registered`
- `merchant_offer_created`
