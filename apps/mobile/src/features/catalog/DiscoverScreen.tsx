import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { RecommendationReasonBadges } from '../../components/RecommendationReasonBadge';
import { SaveLookButton } from '../../components/SaveLookButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { analytics } from '../../services/analytics';
import { useAppStore } from '../../store/app-store';
import { formatPrice } from '../../utils/currency';
import { buildRecommendationReasons } from '../../utils/recommendationReasons';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';
import type { PersonalizedTrendItem, Product, ProductVariant, TrendingPin, UserProfile } from '../../types';

const viewedProducts = new Set<string>();

const GENDER_BADGE: Record<string, string> = { male: 'Male', female: 'Female', unisex: 'Unisex' };
const BUDGET_BADGE: Record<string, string> = {
  under500: '< ₹500',
  '500_2000': '₹500-2k',
  '2000_5000': '₹2k-5k',
  above5000: '₹5k+',
};

export function DiscoverScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const selectVariant = useAppStore((s) => s.selectVariant);

  const { data: feed, loading, error, refetch } = useAsyncResource(
    () => mobileApi.discoverFeed(userId, 8),
    [userId],
  );
  const { data: profile } = useAsyncResource<UserProfile>(
    () => mobileApi.profile(userId),
    [userId],
  );
  const { data: pinsData, loading: pinsLoading } = useAsyncResource(
    () => mobileApi.pinterestPins({ limit: 6 }),
    [],
  );
  const trendingPins: TrendingPin[] = pinsData?.data ?? [];

  const handleTryOn = (product: Product, source: string) => {
    const variant: ProductVariant | undefined =
      product.variants.find((v) => v.inStock) ?? product.variants[0];
    if (variant) selectVariant(variant, product);
    analytics.track('tryon_started', {
      productId: product.id,
      sourceScreen: source,
    }).catch(() => {});
    router.push('/tryon-upload');
  };

  const handleProductPress = (product: Product, source: string) => {
    analytics.track('recommendation_clicked', {
      productId: product.id,
      sourceScreen: source,
    }).catch(() => {});
    handleTryOn(product, source);
  };

  const handlePinTryOn = (pin: TrendingPin) => {
    analytics.track('pinterest_pin_clicked', {
      pinId: pin.id,
      sourceUrl: pin.sourceUrl,
      action: 'try_on',
    }).catch(() => {});
    router.push({ pathname: '/tryon-upload', params: { garmentImageUrl: pin.imageUrl } });
  };

  const handlePinShop = (pin: TrendingPin) => {
    const url = pin.affiliateLink ?? pin.sourceUrl;
    analytics.track('pinterest_pin_clicked', {
      pinId: pin.id,
      sourceUrl: pin.sourceUrl,
      action: pin.affiliateLink ? 'affiliate_shop' : 'source_open',
    }).catch(() => {});
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  const feedSections = [
    { key: 'for_you', title: 'For You', subtitle: 'Ranked by your preferences, saves, and try-ons.', items: feed?.forYou ?? [] },
    { key: 'trending_for_you', title: 'Trending For You', subtitle: 'Pinterest trend signals filtered for your profile.', items: feed?.trendingForYou ?? [] },
    { key: 'popular_near_you', title: 'Popular Near You', subtitle: 'Merchant and local-shop inventory when available.', items: feed?.popularNearYou ?? [] },
    { key: 'under_your_budget', title: 'Under Your Budget', subtitle: 'Products that fit your saved budget range.', items: feed?.underYourBudget ?? [] },
    { key: 'saved_inspired', title: 'Recently Saved Inspired', subtitle: 'Similar to looks you saved recently.', items: feed?.recentlySavedInspired ?? [] },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Discover</Text>
        <Text style={styles.title}>Personalized feed</Text>
        {feed?.fallbackUsed ? (
          <Text style={styles.subtitle}>Using global trends while we learn your style.</Text>
        ) : (
          <Text style={styles.subtitle}>Updated from your profile, wardrobe signals, and shop availability.</Text>
        )}
      </View>

      {loading ? (
        <DiscoverSkeleton />
      ) : error && !feed ? (
        <EmptyState
          icon="⚠️"
          title="Couldn't load your feed"
          subtitle="Showing Pinterest trends if available. You can retry the personalized feed."
          action="Retry"
          onAction={refetch}
        />
      ) : (
        feedSections.map((section) => (
          <FeedSection
            key={section.key}
            sourceKey={section.key}
            title={section.title}
            subtitle={section.subtitle}
            items={section.items}
            profile={profile}
            onProductPress={handleProductPress}
            onTryOn={handleTryOn}
          />
        ))
      )}

      {(trendingPins.length > 0 || pinsLoading) ? (
        <PinterestSection
          pins={trendingPins}
          loading={pinsLoading}
          onTryOn={handlePinTryOn}
          onShop={handlePinShop}
        />
      ) : null}
    </Screen>
  );
}

function FeedSection({
  sourceKey,
  title,
  subtitle,
  items,
  profile,
  onProductPress,
  onTryOn,
}: {
  sourceKey: string;
  title: string;
  subtitle: string;
  items: PersonalizedTrendItem[];
  profile?: UserProfile | null;
  onProductPress: (product: Product, source: string) => void;
  onTryOn: (product: Product, source: string) => void;
}) {
  if (items.length === 0) {
    return (
      <SectionCard title={title} subtitle={subtitle}>
        <Text style={styles.emptySectionText}>We need a little more signal before this section fills in.</Text>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={title} subtitle={subtitle}>
      <View style={styles.feedStack}>
        {items.map((item, index) => (
          <FeedProductRow
            key={`${sourceKey}-${item.product.id}`}
            item={item}
            profile={profile}
            sourceKey={sourceKey}
            showDivider={index < items.length - 1}
            onProductPress={onProductPress}
            onTryOn={onTryOn}
          />
        ))}
      </View>
    </SectionCard>
  );
}

function FeedProductRow({
  item,
  profile,
  sourceKey,
  showDivider,
  onProductPress,
  onTryOn,
}: {
  item: PersonalizedTrendItem;
  profile?: UserProfile | null;
  sourceKey: string;
  showDivider: boolean;
  onProductPress: (product: Product, source: string) => void;
  onTryOn: (product: Product, source: string) => void;
}) {
  const product = item.product;
  const variant = product.variants[0];
  const imageUrl = product.imageUrl ?? variant?.imageUrl;
  const sourceScreen = `discover_${sourceKey}`;
  const reasons = buildRecommendationReasons({
    product,
    profile,
    explicitReasons: item.recommendationReasons ?? item.reasons,
    source: sourceScreen,
  });

  const viewKey = `${sourceScreen}:${product.id}`;
  if (!viewedProducts.has(viewKey)) {
    viewedProducts.add(viewKey);
    analytics.track('discover_product_viewed', {
      productId: product.id,
      sourceScreen,
      score: item.score,
    }).catch(() => {});
  }

  return (
    <Pressable
      style={[styles.productRow, showDivider && styles.productRowBorder]}
      onPress={() => onProductPress(product, sourceScreen)}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
      ) : (
        <View style={[styles.productImage, styles.productImageFallback]} />
      )}
      <View style={styles.productInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.scoreText}>{item.score}</Text>
        </View>
        <Text style={styles.productMeta} numberOfLines={1}>
          {product.brand.name} · {product.category}{product.baseColor ? ` · ${product.baseColor}` : ''}
        </Text>
        <RecommendationReasonBadges
          reasons={reasons}
          productId={product.id}
          sourceScreen={sourceScreen}
          trackViewed
        />
        {variant ? (
          <Text style={styles.productPrice}>{formatPrice(variant.price, variant.currency)}</Text>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        <SaveLookButton
          product={product}
          generatedImageUrl={imageUrl}
          sourceScreen={sourceScreen}
          mode="icon"
          metadata={{
            saveType: 'discover_product',
            score: item.score,
            reasons: item.reasons,
          }}
        />
        <Pressable style={styles.tryOnChip} onPress={() => onTryOn(product, sourceScreen)}>
          <Text style={styles.tryOnChipText}>Try on</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function PinterestSection({
  pins,
  loading,
  onTryOn,
  onShop,
}: {
  pins: TrendingPin[];
  loading: boolean;
  onTryOn: (pin: TrendingPin) => void;
  onShop: (pin: TrendingPin) => void;
}) {
  return (
    <SectionCard title="Pinterest fallback" subtitle="Global trend inspiration loads independently from your product feed.">
      {loading && pins.length === 0 ? (
        <HorizontalSkeleton />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pinsScroll}>
          {pins.map((pin) => (
            <View key={pin.id} style={styles.pinCard}>
              <Image source={{ uri: pin.imageUrl }} style={styles.pinImage} resizeMode="cover" />
              <View style={styles.pinBadgeRow}>
                {pin.gender && GENDER_BADGE[pin.gender] ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{GENDER_BADGE[pin.gender]}</Text>
                  </View>
                ) : null}
                {pin.budgetRange && BUDGET_BADGE[pin.budgetRange] ? (
                  <View style={[styles.badge, styles.badgeBudget]}>
                    <Text style={styles.badgeText}>{BUDGET_BADGE[pin.budgetRange]}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.pinTitle} numberOfLines={1}>{pin.title}</Text>
              <View style={styles.pinActions}>
                <Pressable style={styles.pinBtn} onPress={() => onTryOn(pin)}>
                  <Text style={styles.pinBtnText}>Try</Text>
                </Pressable>
                <Pressable style={[styles.pinBtn, styles.pinBtnShop]} onPress={() => onShop(pin)}>
                  <Text style={[styles.pinBtnText, styles.pinBtnShopText]}>Shop</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SectionCard>
  );
}

function DiscoverSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      {[0, 1, 2].map((section) => (
        <SectionCard key={section}>
          <View style={styles.skeletonTitle} />
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.skeletonRow}>
              <View style={styles.skeletonImage} />
              <View style={styles.skeletonCopy}>
                <View style={styles.skeletonLineWide} />
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonPills} />
              </View>
            </View>
          ))}
        </SectionCard>
      ))}
    </View>
  );
}

function HorizontalSkeleton() {
  return (
    <View style={styles.horizontalSkeleton}>
      {[0, 1, 2].map((item) => <View key={item} style={styles.pinSkeleton} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.xs },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  feedStack: { gap: Spacing.xs },
  emptySectionText: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  productRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  productImage: {
    width: 66,
    height: 88,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface2,
  },
  productImageFallback: { backgroundColor: Colors.surface3 },
  productInfo: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  productName: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  scoreText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  productMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  productPrice: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  rowActions: { alignItems: 'center', gap: Spacing.xs },
  tryOnChip: {
    backgroundColor: Colors.primaryDim,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  tryOnChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },

  pinsScroll: { marginHorizontal: -Spacing.md },
  pinCard: { width: 152, marginLeft: Spacing.md, marginBottom: Spacing.sm },
  pinImage: { width: 152, height: 192, borderRadius: Radius.md, backgroundColor: Colors.surface2 },
  pinBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  badge: {
    backgroundColor: Colors.primaryDim,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeBudget: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 10, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  pinTitle: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
    marginTop: 4,
    marginBottom: 4,
  },
  pinActions: { flexDirection: 'row', gap: Spacing.xs },
  pinBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  pinBtnShop: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  pinBtnText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.primary },
  pinBtnShopText: { color: '#92400e' },

  skeletonStack: { gap: Spacing.base },
  skeletonTitle: {
    width: '42%',
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface3,
    marginBottom: Spacing.sm,
  },
  skeletonRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm },
  skeletonImage: { width: 66, height: 88, borderRadius: Radius.sm, backgroundColor: Colors.surface3 },
  skeletonCopy: { flex: 1, gap: Spacing.sm, justifyContent: 'center' },
  skeletonLineWide: { width: '78%', height: 14, borderRadius: Radius.full, backgroundColor: Colors.surface3 },
  skeletonLine: { width: '54%', height: 12, borderRadius: Radius.full, backgroundColor: Colors.surface3 },
  skeletonPills: { width: '68%', height: 20, borderRadius: Radius.full, backgroundColor: Colors.surface3 },
  horizontalSkeleton: { flexDirection: 'row', gap: Spacing.sm },
  pinSkeleton: { width: 152, height: 230, borderRadius: Radius.md, backgroundColor: Colors.surface3 },
});
