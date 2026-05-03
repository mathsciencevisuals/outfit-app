import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { mobileApi } from '../services/api';
import { analytics } from '../services/analytics';
import type { Product, Recommendation, UserProfile } from '../types';
import { formatPrice } from '../utils/currency';
import { buildRecommendationReasons } from '../utils/recommendationReasons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';
import { RecommendationReasonBadges } from './RecommendationReasonBadge';

type CompleteLookItem = {
  id: string;
  product: Product;
  slotLabel: string;
  reasons: string[];
  isMock?: boolean;
};

interface Props {
  userId: string;
  anchorProduct?: Product | null;
  sourceScreen: string;
  profile?: UserProfile | null;
  fallbackProducts?: Product[];
  title?: string;
  tryOnRequestId?: string | null;
}

function productImage(product: Product) {
  return product.imageUrl ?? product.variants?.[0]?.imageUrl ?? null;
}

function productPrice(product: Product) {
  const variant = product.variants?.[0];
  const price = product.offerSummary?.lowestPrice ?? variant?.price ?? null;
  const currency = variant?.currency ?? 'INR';
  return price != null ? formatPrice(price, currency) : product.category;
}

function fallbackSlotLabel(product: Product, index: number) {
  const category = product.category.toLowerCase();
  if (category.includes('shoe') || category.includes('footwear')) return 'Shoes';
  if (category.includes('accessor') || category.includes('bag') || category.includes('jewel')) return 'Accessory';
  if (category.includes('bottom') || category.includes('jean') || category.includes('trouser') || category.includes('pant')) return 'Bottom';
  if (category.includes('jacket') || category.includes('blazer') || category.includes('layer')) return 'Layer';
  if (category.includes('top') || category.includes('shirt') || category.includes('kurta')) return 'Top';
  return ['Top', 'Bottom', 'Shoes', 'Accessory'][index] ?? 'Suggested';
}

function toItems(recommendations: Recommendation[], profile?: UserProfile | null, sourceScreen = 'complete_look'): CompleteLookItem[] {
  return recommendations
    .map((recommendation, index) => {
      const product = recommendation.product;
      if (!product) return null;
      return {
        id: recommendation.id ?? `${product.id}-${index}`,
        product,
        slotLabel: recommendation.completeLookLabel ?? fallbackSlotLabel(product, index),
        reasons: buildRecommendationReasons({
          product,
          recommendation,
          profile,
          explicitReasons: recommendation.recommendationReasons,
          source: sourceScreen,
        }),
      };
    })
    .filter((item): item is CompleteLookItem => Boolean(item));
}

function fallbackItems(products: Product[], profile?: UserProfile | null, sourceScreen = 'complete_look'): CompleteLookItem[] {
  return products.slice(0, 4).map((product, index) => ({
    id: `fallback-${product.id}`,
    product,
    slotLabel: fallbackSlotLabel(product, index),
    reasons: buildRecommendationReasons({
      product,
      profile,
      explicitReasons: product.recommendationReasons,
      source: sourceScreen,
    }),
  }));
}

function mockItems(anchorProduct?: Product | null): CompleteLookItem[] {
  const anchorName = anchorProduct?.name ?? 'your outfit';
  const categories = [
    { slotLabel: 'Top', name: `Matching top for ${anchorName}` },
    { slotLabel: 'Bottom', name: `Balanced bottom for ${anchorName}` },
    { slotLabel: 'Shoes', name: `Footwear for ${anchorName}` },
    { slotLabel: 'Accessory', name: `Accessory for ${anchorName}` },
  ];

  return categories.map((item, index) => ({
    id: `mock-complete-look-${index}`,
    slotLabel: item.slotLabel,
    reasons: ['Completes your look', 'Style match'],
    isMock: true,
    product: {
      id: `mock-complete-look-${index}`,
      name: item.name,
      brand: { id: 'mock-fitme', name: 'FitMe styling' },
      category: item.slotLabel.toLowerCase(),
      baseColor: anchorProduct?.baseColor ?? 'Neutral',
      recommendationReasons: ['Completes your look', 'Style match'],
      variants: [{
        id: `mock-complete-look-${index}-variant`,
        size: 'One size',
        color: anchorProduct?.baseColor ?? 'Neutral',
        imageUrl: '',
        inStock: false,
        price: 0,
        currency: 'INR',
      }],
    },
  }));
}

function fallbackOrMock(products: Product[], profile?: UserProfile | null, sourceScreen = 'complete_look', anchorProduct?: Product | null) {
  const items = fallbackItems(products, profile, sourceScreen);
  return items.length > 0 ? items : mockItems(anchorProduct);
}

export function CompleteLookSection({
  userId,
  anchorProduct,
  sourceScreen,
  profile,
  fallbackProducts = [],
  title = 'Complete your look',
  tryOnRequestId,
}: Props) {
  const [items, setItems] = useState<CompleteLookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewedKeyRef = useRef<string | null>(null);
  const fallbackKey = useMemo(
    () => fallbackProducts.map((product) => product.id).join(','),
    [fallbackProducts]
  );

  useEffect(() => {
    if (!anchorProduct?.id || !userId) {
      setItems(fallbackOrMock(fallbackProducts, profile, sourceScreen, anchorProduct));
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    mobileApi.completeLookRecommendations(userId, anchorProduct.id)
      .then((recommendations) => {
        if (cancelled) return;
        const nextItems = toItems(recommendations, profile, sourceScreen);
        setItems(nextItems.length > 0 ? nextItems : fallbackOrMock(fallbackProducts, profile, sourceScreen, anchorProduct));
      })
      .catch(() => {
        if (cancelled) return;
        setError('Using fallback styling picks.');
        setItems(fallbackOrMock(fallbackProducts, profile, sourceScreen, anchorProduct));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [anchorProduct, anchorProduct?.id, fallbackKey, profile, sourceScreen, userId]);

  const visibleIds = useMemo(() => items.map((item) => item.product.id).join(','), [items]);

  useEffect(() => {
    if (!anchorProduct?.id || !visibleIds) return;
    const viewedKey = `${sourceScreen}:${anchorProduct.id}:${visibleIds}`;
    if (viewedKeyRef.current === viewedKey) return;
    viewedKeyRef.current = viewedKey;

    analytics.track('complete_look_viewed', {
      sourceScreen,
      anchorProductId: anchorProduct.id,
      productIds: items.map((item) => item.product.id),
      tryOnRequestId,
    }).catch(() => {});
  }, [anchorProduct?.id, items, sourceScreen, tryOnRequestId, visibleIds]);

  const handleOpenAffiliate = useCallback(async (product: Product, slotLabel: string) => {
    if (product.id.startsWith('mock-complete-look')) {
      return;
    }

    analytics.track('complete_look_clicked', {
      sourceScreen,
      anchorProductId: anchorProduct?.id,
      productId: product.id,
      slotLabel,
      action: 'buy',
      tryOnRequestId,
    }).catch(() => {});

    try {
      const affiliate = await mobileApi.affiliateLink(product.id);
      analytics.track('affiliate_link_opened', {
        sourceScreen,
        anchorProductId: anchorProduct?.id,
        productId: product.id,
        shopName: affiliate.shopName,
        price: affiliate.price,
        tryOnRequestId,
      }).catch(() => {});
      await Linking.openURL(affiliate.affiliateUrl);
    } catch {
      // Commerce fallback is handled by the API; no-op if handoff fails.
    }
  }, [anchorProduct?.id, sourceScreen, tryOnRequestId]);

  const handleCardPress = useCallback((product: Product, slotLabel: string) => {
    analytics.track('complete_look_clicked', {
      sourceScreen,
      anchorProductId: anchorProduct?.id,
      productId: product.id,
      slotLabel,
      action: 'inspect',
      tryOnRequestId,
    }).catch(() => {});
  }, [anchorProduct?.id, sourceScreen, tryOnRequestId]);

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Finding matching items...' : error ?? 'Matching pieces ranked for style, budget, and live offers.'}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {loading && items.length === 0 ? (
          [0, 1, 2].map((item) => <View key={item} style={styles.skeletonCard} />)
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => handleCardPress(item.product, item.slotLabel)}
            >
              <View style={styles.imageWrap}>
                {productImage(item.product) ? (
                  <Image source={{ uri: productImage(item.product)! }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.imageFallback]}>
                    <Ionicons name="shirt-outline" size={24} color={Colors.textMuted} />
                  </View>
                )}
                <View style={styles.slotBadge}>
                  <Text style={styles.slotText}>{item.slotLabel}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name} numberOfLines={2}>{item.product.name}</Text>
                <Text style={styles.price}>{productPrice(item.product)}</Text>
                <RecommendationReasonBadges
                  reasons={item.reasons}
                  productId={item.product.id}
                  sourceScreen={`${sourceScreen}_complete_look`}
                />
                <Pressable
                  style={[styles.buyButton, item.isMock ? styles.buyButtonDisabled : null]}
                  onPress={() => handleOpenAffiliate(item.product, item.slotLabel)}
                  disabled={item.isMock}
                >
                  <Text style={styles.buyText}>{item.isMock ? 'Preview' : 'Buy'}</Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  scroll: { gap: Spacing.sm, paddingRight: Spacing.sm },
  card: {
    width: 136,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    overflow: 'hidden',
  },
  skeletonCard: {
    width: 136,
    height: 238,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
  },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: Colors.surface3,
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  slotBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(15,118,110,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slotText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  cardBody: { padding: Spacing.sm, gap: 5 },
  name: {
    minHeight: 34,
    fontSize: FontSize.xs,
    lineHeight: 16,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  price: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  buyButton: {
    marginTop: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: Colors.surface3,
  },
  buyText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
});
