import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState }    from '../../components/EmptyState';
import { Screen }        from '../../components/Screen';
import { SectionCard }   from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }     from '../../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

export function AdminProductsScreen() {
  const router = useRouter();

  const { data: products, loading, error, refetch } = useAsyncResource(
    () => mobileApi.adminListProducts(),
    [],
  );

  if (loading) {
    return (
      <Screen>
        <SectionCard><Text style={styles.loadingText}>Loading products…</Text></SectionCard>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <EmptyState icon="⚠️" title="Failed to load" subtitle={error} action="Retry" onAction={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Text style={styles.pageTitle}>Products ({products?.length ?? 0})</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/admin-product-form' as never)}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add product</Text>
        </Pressable>
      </View>

      <SectionCard title="All Products">
        {!products?.length ? (
          <Text style={styles.emptyText}>No products yet.</Text>
        ) : (
          products.map((product: any, idx: number) => (
            <View key={product.id}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.rowSub}>
                    {product.brand?.name ?? product.brandId ?? '—'}
                    {product.category ? ` · ${product.category}` : ''}
                    {product.variants?.length
                      ? ` · ${product.variants.length} variant${product.variants.length !== 1 ? 's' : ''}`
                      : ''}
                  </Text>
                </View>
                <Pressable
                  style={styles.editBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/admin-product-form',
                      params: { productId: product.id },
                    } as never)
                  }
                >
                  <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
  pageTitle:   { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  topRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.primaryDim },
  addBtnText:  { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  emptyText:   { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.md },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  rowInfo:     { flex: 1 },
  rowTitle:    { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  rowSub:      { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  divider:     { height: 1, backgroundColor: Colors.border },
  editBtn:     { padding: Spacing.xs, borderRadius: Radius.sm, backgroundColor: Colors.primaryDim },
});
