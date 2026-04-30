import { formatPrice } from '../../utils/currency';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import {
  Colors, FontSize, FontWeight, Radius, Shadow, Spacing,
} from '../../utils/theme';
import type { PersonalizedTrendItem, Product, ProductVariant } from '../../types';

export function DiscoverScreen() {
  const router      = useRouter();
  const userId = useAppStore((s) => s.userId);
  const selectVariant = useAppStore((s) => s.selectVariant);

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.personalizedTrending(userId, 8),
    [userId]
  );
  const trendingForYou = data?.trendingForYou ?? [];
  const popularInApp = data?.popularInApp ?? [];
  const globalTrends = data?.globalTrends ?? [];
  const hasTrends = trendingForYou.length > 0 || popularInApp.length > 0 || globalTrends.length > 0;

  const handleTryOn = (product: Product) => {
    // Pre-select the first in-stock variant, then go straight to try-on
    const variant: ProductVariant | undefined =
      product.variants.find((v) => v.inStock) ?? product.variants[0];
    if (variant) selectVariant(variant, product);
    router.push('/tryon-upload');
  };

  if (error) {
    return (
      <Screen>
        <EmptyState
          icon="⚠️"
          title="Couldn't load products"
          subtitle={error}
          action="Retry"
          onAction={refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen>
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
  title,
  trends,
  onTryOn,
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
  sectionStack: {
    gap: Spacing.lg,
  },
  trendSection: {
    gap: Spacing.xs,
  },
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
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
  reasonText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
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
});
