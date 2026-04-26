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
import type { Product, ProductVariant } from '../../types';

export function DiscoverScreen() {
  const router      = useRouter();
  const selectVariant = useAppStore((s) => s.selectVariant);

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.products({ limit: 10 }),
    []
  );
  const products: Product[] = Array.isArray(data) ? data : [];

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
          <Text style={styles.loadingText}>Loading catalogue…</Text>
        ) : products.length === 0 ? (
          <EmptyState icon="🛍️" title="No products yet" subtitle="Check back soon." />
        ) : (
          products.map((product, i) => (
            <TouchableOpacity
              key={product.id}
              style={[styles.productRow, i < products.length - 1 && styles.productRowBorder]}
              onPress={() => handleTryOn(product)}
              activeOpacity={0.75}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productMeta}>
                  {product.brand.name} · {product.category}
                  {product.baseColor ? ` · ${product.baseColor}` : ''}
                </Text>
                {product.variants[0] && (
                  <Text style={styles.productPrice}>
                    {formatPrice(product.variants[0].price, product.variants[0].currency)}
                  </Text>
                )}
              </View>
              <View style={styles.tryOnChip}>
                <Text style={styles.tryOnChipText}>Try on →</Text>
              </View>
            </TouchableOpacity>
          ))
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

const styles = StyleSheet.create({
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: Spacing.lg,
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
  productName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  productMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
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
