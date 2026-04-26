import { useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { Colors, FontSize, FontWeight, Spacing } from '../../utils/theme';
import type { Shop } from '../../types';

export function ShopsScreen() {
  const router = useRouter();

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.shops(),
    []
  );
  const shops: Shop[] = Array.isArray(data) ? data : [];

  if (error) {
    return (
      <Screen>
        <EmptyState icon="⚠️" title="Couldn't load shops" subtitle={error} action="Retry" onAction={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        title="Shops"
        subtitle="Availability and offer comparison across retail partners."
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading shops…</Text>
        ) : shops.length === 0 ? (
          <EmptyState icon="🏪" title="No shops yet" subtitle="Retail partners coming soon." />
        ) : (
          shops.map((shop, i) => (
            <TouchableOpacity
              key={shop.id}
              style={[styles.shopRow, i < shops.length - 1 && styles.shopRowBorder]}
              onPress={() => shop.websiteUrl && Linking.openURL(shop.websiteUrl)}
              activeOpacity={0.75}
            >
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopMeta}>
                  {shop.region}
                  {(shop.inventoryOffers?.length ?? 0) > 0
                    ? ` · ${shop.inventoryOffers!.length} offer${shop.inventoryOffers!.length !== 1 ? 's' : ''}`
                    : ''}
                </Text>
              </View>
              {shop.websiteUrl ? (
                <Text style={styles.visitLink}>Visit →</Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </SectionCard>

      <PrimaryButton variant="secondary" onPress={() => router.push('/saved-looks')}>
        Go to saved looks
      </PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    fontSize: FontSize.sm, color: Colors.textMuted,
    textAlign: 'center', padding: Spacing.lg,
  },
  shopRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  shopRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  shopInfo: { flex: 1, gap: 2 },
  shopName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  shopMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  visitLink: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
});
