import type { Product, Recommendation, SavedLook, UserProfile } from '../types';

export type RecommendationReasonInput = {
  product?: Product | null;
  recommendation?: Recommendation | null;
  savedLook?: SavedLook | null;
  profile?: UserProfile | null;
  explicitReasons?: string[];
  source?: 'discover' | 'recommendations' | 'tryon_result' | 'saved_looks' | string;
};

const SHORT_REASON_MAP: Array<[RegExp, string]> = [
  [/fit|measurement|size/i, 'Good fit'],
  [/budget|price|value/i, 'Fits budget'],
  [/saved|similar/i, 'Similar saves'],
  [/trend|pinterest|popular/i, 'Trending'],
  [/color|colour|palette/i, 'Color match'],
  [/style/i, 'Style match'],
  [/nearby|available|stock|shop/i, 'Available nearby'],
  [/best price|cheapest|offer/i, 'Best price'],
];

function normalizeReason(reason: string) {
  const mapped = SHORT_REASON_MAP.find(([pattern]) => pattern.test(reason))?.[1];
  if (mapped) return mapped;
  const trimmed = reason.replace(/[.。]+$/g, '').trim();
  return trimmed.length > 22 ? `${trimmed.slice(0, 19).trim()}...` : trimmed;
}

function uniqueReasons(reasons: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return reasons
    .filter((reason): reason is string => Boolean(reason?.trim()))
    .map(normalizeReason)
    .filter((reason) => {
      const key = reason.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function productPrice(product?: Product | null) {
  const offerSummary = (product as unknown as { offerSummary?: { lowestPrice?: number | null; offerCount?: number; shopCount?: number } } | null)?.offerSummary;
  if (offerSummary?.lowestPrice != null) return offerSummary.lowestPrice;
  const variantPrices = product?.variants?.map((variant) => variant.price).filter((price) => Number.isFinite(price)) ?? [];
  return variantPrices.length > 0 ? Math.min(...variantPrices) : null;
}

function hasNearbyOffer(product?: Product | null) {
  const offerSummary = (product as unknown as { offerSummary?: { offerCount?: number; shopCount?: number } } | null)?.offerSummary;
  if ((offerSummary?.shopCount ?? 0) > 0) return true;
  return product?.variants?.some((variant) => {
    const offers = (variant as unknown as { inventoryOffers?: unknown[] }).inventoryOffers ?? [];
    return offers.length > 0;
  }) ?? false;
}

export function buildRecommendationReasons({
  product,
  recommendation,
  savedLook,
  profile,
  explicitReasons,
  source,
}: RecommendationReasonInput): string[] {
  const productAny = product as unknown as {
    recommendationReasons?: string[];
    reasonTags?: string[];
    rankingBadges?: string[];
    offerSummary?: { offerCount?: number; lowestPrice?: number | null; badges?: string[] };
  } | null;
  const recommendationAny = recommendation as unknown as {
    recommendationReasons?: string[];
    reasonTags?: string[];
    rankingBadges?: string[];
    budgetLabel?: string;
  } | null;
  const price = productPrice(product);
  const stylePrefs = Array.isArray(profile?.stylePreference?.styles)
    ? (profile?.stylePreference?.styles as unknown[]).map(String)
    : profile?.stylePreferences ?? [];
  const styleTags = product?.styleTags ?? [];
  const styleMatches = stylePrefs.length === 0 || styleTags.some((tag) => stylePrefs.includes(tag));
  const colorMatches = Boolean(
    product?.baseColor &&
    (profile?.preferredColors ?? []).map((color) => color.toLowerCase()).includes(product.baseColor.toLowerCase())
  );
  const withinBudget = profile?.budgetMax != null && price != null ? price <= profile.budgetMax : null;

  return uniqueReasons([
    ...(explicitReasons ?? []),
    ...(recommendationAny?.recommendationReasons ?? []),
    ...(recommendationAny?.reasonTags ?? []),
    ...(recommendationAny?.rankingBadges ?? []),
    ...(productAny?.recommendationReasons ?? []),
    ...(productAny?.reasonTags ?? []),
    ...(productAny?.rankingBadges ?? []),
    savedLook ? 'Similar to saved looks' : null,
    styleMatches ? 'Matches your style' : null,
    colorMatches ? 'Matches color preference' : null,
    withinBudget === true || recommendationAny?.budgetLabel === 'Within budget' ? 'Fits your budget' : null,
    product?.trending || source === 'discover' ? 'Trending on Pinterest' : null,
    recommendation?.score != null && recommendation.score >= 75 ? 'Good fit for your measurements' : null,
    hasNearbyOffer(product) ? 'Available nearby' : null,
    productAny?.offerSummary?.lowestPrice != null ? 'Best price found' : null,
  ]);
}
