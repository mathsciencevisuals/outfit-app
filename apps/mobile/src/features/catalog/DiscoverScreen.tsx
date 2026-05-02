import * as WebBrowser from 'expo-web-browser';
import { formatPrice } from '../../utils/currency';
import { useRouter } from 'expo-router';
import {
  Image, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

import { EmptyState }       from '../../components/EmptyState';
import { PrimaryButton }    from '../../components/PrimaryButton';
import { Screen }           from '../../components/Screen';
import { SectionCard }      from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }        from '../../services/api';
import { useAppStore }      from '../../store/app-store';
import {
  Colors, FontSize, FontWeight, Radius, Spacing,
} from '../../utils/theme';
import type { PersonalizedTrendItem, Product, ProductVariant, TrendingPin } from '../../types';

const GENDER_BADGE: Record<string, string> = { male: '👨 Male', female: '👩 Female', unisex: '🧑 Unisex' };
const BUDGET_BADGE: Record<string, string> = {
  under500:    '< ₹500',
  '500_2000':  '₹500–2k',
  '2000_5000': '₹2k–5k',
  above5000:   '₹5k+',
};

export function DiscoverScreen() {
  const router      = useRouter();
  const userId      = useAppStore((s) => s.userId);
  const selectVariant = useAppStore((s) => s.selectVariant);

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.personalizedTrending(userId, 8),
    [userId],
  );

  // Fetch personalised Pinterest pins using stored profile prefs
  const { data: pinsData } = useAsyncResource(
    () => mobileApi.pinterestPins({ limit: 6 }),
    [],
  );
  const trendingPins: TrendingPin[] = pinsData?.data ?? [];

  const trendingForYou = data?.trendingForYou ?? [];
  const popularInApp   = data?.popularInApp   ?? [];
  const globalTrends   = data?.globalTrends   ?? [];
  const hasTrends = trendingForYou.length > 0 || popularInApp.length > 0 || globalTrends.length > 0;

  const handleTryOn = (product: Product) => {
    const variant: ProductVariant | undefined =
      product.variants.find((v) => v.inStock) ?? product.variants[0];
    if (variant) selectVariant(variant, product);
    router.push('/tryon-upload');
  };

  const handlePinTryOn = (pin: TrendingPin) => {
    router.push({ pathname: '/tryon-upload', params: { garmentImageUrl: pin.imageUrl } });
  };

  const handleShopNow = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  if (error) {
    return (
      <Screen>
        <EmptyState icon="⚠️" title="Couldn't load products" subtitle={error} action="Retry" onAction={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* ── Pinterest Trending Now ── */}
      {trendingPins.length > 0 && (
        <SectionCard title="Trending Now" subtitle="Curated from Pinterest · filtered for you">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pinsScroll}>
            {trendingPins.map((pin) => (
              <View key={pin.id} style={styles.pinCard}>
                <Image
                  source={{ uri: pin.imageUrl }}
                  style={styles.pinImage}
                  resizeMode="cover"
                />
                <View style={styles.pinBadgeRow}>
                  {pin.gender && GENDER_BADGE[pin.gender] && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{GENDER_BADGE[pin.gender]}</Text>
                    </View>
                  )}
                  {pin.budgetRange && BUDGET_BADGE[pin.budgetRange] && (
                    <View style={[styles.badge, styles.badgeBudget]}>
                      <Text style={styles.badgeText}>{BUDGET_BADGE[pin.budgetRange]}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.pinTitle} numberOfLines={1}>{pin.title}</Text>
                <View style={styles.pinActions}>
                  <TouchableOpacity
                    style={styles.pinBtn}
                    onPress={() => handlePinTryOn(pin)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pinBtnText}>👗 Try on</Text>
                  </TouchableOpacity>
                  {pin.affiliateLink ? (
                    <TouchableOpacity
                      style={[styles.pinBtn, styles.pinBtnShop]}
                      onPress={() => handleShopNow(pin.affiliateLink!)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pinBtnText, styles.pinBtnShopText]}>🛍 Shop</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </SectionCard>
      )}

      {/* ── Product feed ── */}
      <SectionCard
        title="Discover"
        subtitle="A fit-aware feed blended from catalogue data and your preferences."
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading trend feed…</Text>
        ) : !hasTrends ? (
          <EmptyState icon="🛍️" title="No products yet" subtitle="Check back soon." />
        ) : (
          <View style={styles.sectionStack}>
            {trendingForYou.length > 0 ? (
              <TrendSection title="Trending For You" trends={trendingForYou} onTryOn={handleTryOn} />
            ) : null}
            {popularInApp.length > 0 ? (
              <TrendSection title="Popular in App" trends={popularInApp} onTryOn={handleTryOn} />
            ) : null}
            {globalTrends.length > 0 ? (
              <TrendSection title="Global Trends" trends={globalTrends} onTryOn={handleTryOn} />
            ) : null}
          </View>
        )}
      </SectionCard>

      <PrimaryButton onPress={() => router.push('/tryon-upload')}>
        📷  Try on an outfit now
      </PrimaryButton>

      <PrimaryButton variant="secondary" onPress={() => router.push('/recommendations')}>
        View recommendations
      </PrimaryButton>
    </Screen>
  );
}

function TrendSection({
  title, trends, onTryOn,
}: {
  title: string;
  trends: PersonalizedTrendItem[];
  onTryOn: (product: Product) => void;
}) {
  return (
    <View style={styles.trendSection}>
      <Text style={styles.trendSectionTitle}>{title}</Text>
      {trends.map((trend, i) => (
        <TouchableOpacity
          key={`${title}-${trend.product.id}`}
          style={[styles.productRow, i < trends.length - 1 && styles.productRowBorder]}
          onPress={() => onTryOn(trend.product)}
          activeOpacity={0.75}
        >
          <View style={styles.productInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.productName} numberOfLines={1}>{trend.product.name}</Text>
              <Text style={styles.scoreText}>{trend.score}</Text>
            </View>
            <Text style={styles.productMeta}>
              {trend.product.brand.name} · {trend.product.category}
              {trend.product.baseColor ? ` · ${trend.product.baseColor}` : ''}
            </Text>
            {trend.reasons[0] ? (
              <Text style={styles.reasonText} numberOfLines={1}>{trend.reasons[0]}</Text>
            ) : null}
            {trend.product.variants[0] && (
              <Text style={styles.productPrice}>
                {formatPrice(trend.product.variants[0].price, trend.product.variants[0].currency)}
              </Text>
            )}
          </View>
          <View style={styles.tryOnChip}>
            <Text style={styles.tryOnChipText}>Try on →</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  sectionStack: { gap: Spacing.lg },
  trendSection: { gap: Spacing.xs },
  trendSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
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
  productInfo: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  productName: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  scoreText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  productMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  reasonText:  { fontSize: FontSize.xs, color: Colors.textMuted },
  productPrice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: 2,
  },
  tryOnChip: {
    backgroundColor: Colors.primaryDim,
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  tryOnChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Pinterest pins
  pinsScroll: { marginHorizontal: -Spacing.md },
  pinCard: {
    width: 152,
    marginLeft: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pinImage: {
    width: 152,
    height: 192,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
  },
  pinBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
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
});
