import { env } from '../utils/env';
import { useAppStore } from '../store/app-store';

type AnalyticsBasePayload = {
  userId?: string;
  sourceScreen?: string;
  productId?: string;
  tryOnId?: string;
  tryOnRequestId?: string | null;
  savedLookId?: string;
  lookId?: string;
  shopId?: string;
  shopName?: string | null;
  merchantId?: string;
  offerId?: string;
  couponId?: string;
  referralCode?: string;
  channel?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type AnalyticsEventPayloads = {
  onboarding_completed: AnalyticsBasePayload & { completionPath?: string };
  profile_photo_uploaded: AnalyticsBasePayload & { avatarUrl?: string };
  measurements_saved: AnalyticsBasePayload & { measurementId?: string; source?: string };
  discover_product_viewed: AnalyticsBasePayload & { section?: string; position?: number };
  tryon_started: AnalyticsBasePayload & { variantId?: string; garmentSource?: string };
  tryon_completed: AnalyticsBasePayload & { resultImageUrl?: string; confidenceScore?: number | null };
  tryon_failed: AnalyticsBasePayload & { errorMessage?: string; stage?: string };
  look_saved: AnalyticsBasePayload & { sourceScreen: string };
  look_unsaved: AnalyticsBasePayload & { sourceScreen: string };
  affiliate_link_opened: AnalyticsBasePayload & { price?: number | null; retailerName?: string | null };
  shop_link_opened: AnalyticsBasePayload & { price?: number | null; retailerName?: string | null };
  recommendation_clicked: AnalyticsBasePayload & { recommendationId?: string; source?: string };
  pinterest_pin_clicked: AnalyticsBasePayload & { pinId?: string; action?: string };
  share_completed: AnalyticsBasePayload & { channel?: string };
  referral_code_shared: AnalyticsBasePayload & { referralCode?: string; channel?: string };
  coupon_unlocked: AnalyticsBasePayload & { couponId: string };
  coupon_redeemed: AnalyticsBasePayload & { couponId: string };
  merchant_registered: AnalyticsBasePayload & { merchantId?: string; shopName?: string };
  merchant_offer_created: AnalyticsBasePayload & { offerId?: string; variantId?: string; price?: number };
  merchant_listing_published: AnalyticsBasePayload & { offerId?: string; price?: number };
  complete_look_viewed: AnalyticsBasePayload & { anchorProductId?: string; productIds?: string[] };
  complete_look_clicked: AnalyticsBasePayload & { anchorProductId?: string; action?: string; slotLabel?: string };
  recommendation_reason_viewed: AnalyticsBasePayload & { reasons?: string[] };
};

export type AnalyticsEventName = keyof AnalyticsEventPayloads;

type AnalyticsProvider = {
  name: string;
  track: <T extends AnalyticsEventName>(eventName: T, payload: AnalyticsEventPayloads[T]) => Promise<void> | void;
};

function timestamped<T extends AnalyticsEventName>(payload?: AnalyticsEventPayloads[T]): AnalyticsEventPayloads[T] {
  const state = useAppStore.getState();
  return {
    userId: state.userId,
    timestamp: new Date().toISOString(),
    ...(payload ?? {}),
  } as AnalyticsEventPayloads[T];
}

const consoleProvider: AnalyticsProvider = {
  name: 'console',
  track(eventName, payload) {
    if (__DEV__) {
      console.log(`[FitMe analytics] ${eventName}`, payload);
    }
  },
};

const apiProvider: AnalyticsProvider = {
  name: 'custom-api',
  async track(eventName, payload) {
    const accessToken = useAppStore.getState().accessToken;
    if (!accessToken) {
      return;
    }

    await fetch(`${env.EXPO_PUBLIC_API_URL}/engagement/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        eventName,
        metadata: payload,
      }),
    });
  },
};

const futureProviders: AnalyticsProvider[] = [
  // Firebase, PostHog, Mixpanel, or another provider can be appended here.
];

const providers: AnalyticsProvider[] = [
  consoleProvider,
  apiProvider,
  ...futureProviders,
];

export const analytics = {
  async track<T extends AnalyticsEventName>(eventName: T, payload?: AnalyticsEventPayloads[T]): Promise<void> {
    const enriched = timestamped(payload);
    await Promise.allSettled(
      providers.map((provider) => Promise.resolve(provider.track(eventName, enriched)).catch(() => undefined))
    );
  },
};
