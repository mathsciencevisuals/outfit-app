import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { mobileApi } from '../services/api';
import { analytics } from '../services/analytics';
import type { InventoryOffer, Product } from '../types';
import { formatPrice } from '../utils/currency';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';

const AFFILIATE_DISCLOSURE =
  'Disclosure: FitMe may earn a small commission if you buy through this link, at no extra cost to you.';

type AffiliateOffer = {
  affiliateUrl: string;
  shopName: string | null;
  price: number | null;
};

type BestPriceSource =
  | {
      kind: 'affiliate';
      retailerName: string;
      price: number | null;
      currency: string;
      availabilityLabel: string;
      deliveryLabel: string;
      url: string;
      usesAffiliate: true;
    }
  | {
      kind: 'shop';
      retailerName: string;
      price: number;
      currency: string;
      availabilityLabel: string;
      deliveryLabel: string;
      url?: string;
      usesAffiliate: false;
      shopId?: string;
      stock?: number;
    }
  | {
      kind: 'fallback';
      retailerName: string;
      price: number | null;
      currency: string;
      availabilityLabel: string;
      deliveryLabel: string;
      url: string;
      usesAffiliate: false;
    };

interface Props {
  product?: Product | null;
  sourceScreen: string;
  compact?: boolean;
  tryOnRequestId?: string | null;
}

function searchUrl(product: Product) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${product.name} buy online India`)}`;
}

function variantCurrency(product?: Product | null) {
  return product?.variants?.[0]?.currency ?? 'INR';
}

function variantPrice(product?: Product | null) {
  const prices = (product?.variants ?? [])
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === 'number');
  return prices.length > 0 ? Math.min(...prices) : null;
}

function normalizeOffer(offer: InventoryOffer, fallbackCurrency: string) {
  const shopName = offer.shop?.name ?? 'Partner shop';
  const region = offer.shop?.region;
  const deliveryLabel = offer.deliveryDays != null
    ? `${offer.deliveryDays} day delivery`
    : region
      ? `Nearby | ${region}`
      : 'Store pickup or delivery';

  return {
    ...offer,
    shopName,
    deliveryLabel,
    currency: offer.currency ?? fallbackCurrency,
  };
}

function cheapestInventoryOffer(product?: Product | null) {
  const fallbackCurrency = variantCurrency(product);
  const offers = (product?.variants ?? [])
    .flatMap((variant) => variant.inventoryOffers ?? [])
    .filter((offer) => typeof offer.price === 'number')
    .map((offer) => normalizeOffer(offer, fallbackCurrency));

  return offers.sort((left, right) => {
    const stockWeight = (right.stock && right.stock > 0 ? 1 : 0) - (left.stock && left.stock > 0 ? 1 : 0);
    if (stockWeight !== 0) return stockWeight;
    return left.price - right.price;
  })[0] ?? null;
}

function buildBestPriceSource(product: Product, affiliate: AffiliateOffer | null): BestPriceSource {
  const currency = variantCurrency(product);
  const localOffer = cheapestInventoryOffer(product);

  if (affiliate?.affiliateUrl) {
    return {
      kind: 'affiliate',
      retailerName: affiliate.shopName ?? localOffer?.shopName ?? 'Online partner',
      price: affiliate.price ?? localOffer?.price ?? product.offerSummary?.lowestPrice ?? variantPrice(product),
      currency: localOffer?.currency ?? currency,
      availabilityLabel: affiliate.price != null || localOffer ? 'Offer available' : 'Search offer',
      deliveryLabel: localOffer?.deliveryLabel ?? 'Online delivery',
      url: affiliate.affiliateUrl,
      usesAffiliate: true,
    };
  }

  if (localOffer) {
    return {
      kind: 'shop',
      retailerName: localOffer.shopName,
      price: localOffer.price,
      currency: localOffer.currency,
      availabilityLabel: localOffer.stock === 0 ? 'Out of stock' : 'Available now',
      deliveryLabel: localOffer.deliveryLabel,
      url: localOffer.externalUrl,
      usesAffiliate: false,
      shopId: localOffer.shopId,
      stock: localOffer.stock,
    };
  }

  return {
    kind: 'fallback',
    retailerName: product.brand?.name ?? 'Web search',
    price: product.offerSummary?.lowestPrice ?? variantPrice(product),
    currency,
    availabilityLabel: 'No live offer yet',
    deliveryLabel: 'Search online',
    url: searchUrl(product),
    usesAffiliate: false,
  };
}

export function BestPriceCard({
  product,
  sourceScreen,
  compact = false,
  tryOnRequestId,
}: Props) {
  const [affiliate, setAffiliate] = useState<AffiliateOffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product?.id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    mobileApi.affiliateLink(product.id)
      .then((offer) => {
        if (!cancelled) setAffiliate(offer);
      })
      .catch(() => {
        if (!cancelled) setError('Live price unavailable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const bestPrice = useMemo(() => {
    if (!product) return null;
    return buildBestPriceSource(product, affiliate);
  }, [affiliate, product]);

  const handleOpen = useCallback(async () => {
    if (!product || !bestPrice) return;
    if (loading) return;

    const eventName = bestPrice.kind === 'affiliate' ? 'affiliate_link_opened' : 'shop_link_opened';
    analytics.track(eventName, {
      productId: product.id,
      sourceScreen,
      tryOnRequestId,
      retailerName: bestPrice.retailerName,
      price: bestPrice.price,
      offerType: bestPrice.kind,
      shopId: bestPrice.kind === 'shop' ? bestPrice.shopId : undefined,
    }).catch(() => {});

    const targetUrl = bestPrice.url;
    if (!targetUrl) {
      return;
    }

    await Linking.openURL(targetUrl);
  }, [bestPrice, loading, product, sourceScreen, tryOnRequestId]);

  if (!product || !bestPrice) return null;

  const priceLabel = bestPrice.price != null
    ? formatPrice(bestPrice.price, bestPrice.currency)
    : 'Price varies';
  const ctaLabel = bestPrice.kind === 'shop' ? 'Visit Store' : 'Buy';
  const showDisclosure = bestPrice.usesAffiliate;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="pricetag-outline" size={compact ? 14 : 16} color={Colors.primary} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.kicker}>Best price</Text>
          <Text style={styles.retailer} numberOfLines={1}>{bestPrice.retailerName}</Text>
        </View>
        <Text style={styles.price}>{loading ? 'Checking...' : priceLabel}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText} numberOfLines={1}>{error ?? bestPrice.availabilityLabel}</Text>
        <Text style={styles.dot}>|</Text>
        <Text style={styles.metaText} numberOfLines={1}>{bestPrice.deliveryLabel}</Text>
      </View>

      <Pressable
        style={[
          styles.cta,
          loading || (bestPrice.kind === 'shop' && !bestPrice.url) ? styles.ctaDisabled : null,
        ]}
        onPress={handleOpen}
        disabled={loading || (bestPrice.kind === 'shop' && !bestPrice.url)}
      >
        <Text style={styles.ctaText}>
          {bestPrice.kind === 'shop' && !bestPrice.url ? 'Store details unavailable' : ctaLabel}
        </Text>
      </Pressable>

      {showDisclosure ? (
        <Text style={styles.disclosure}>{AFFILIATE_DISCLOSURE}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardCompact: {
    padding: Spacing.sm,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  retailer: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  price: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    flexShrink: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  dot: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  cta: {
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: Colors.surface3,
  },
  ctaText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  disclosure: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
