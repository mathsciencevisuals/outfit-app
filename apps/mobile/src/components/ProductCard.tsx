import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/app-store';
import { formatPrice } from '../utils/currency';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../utils/theme';
import type { Product } from '../types';

interface Props {
  product: Product;
  showCompare?: boolean;
  onBuy?: (product: Product) => void;
  onCompare?: (product: Product) => void;
}

export function ProductCard({ product, showCompare, onBuy, onCompare }: Props) {
  const { C } = useTheme();
  const savedIds     = useAppStore(s => s.savedProductIds);
  const compareIds   = useAppStore(s => s.compareProductIds);
  const toggleSaved  = useAppStore(s => s.toggleSavedProduct);

  const isSaved   = savedIds.includes(product.id);
  const inCompare = compareIds.includes(product.id);
  const variant   = product.variants[0];

  return (
    <View style={[styles.card, { backgroundColor: C.surface }, Shadow.sm]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: variant?.imageUrl ?? `https://picsum.photos/seed/${product.id}/400/500` }}
          style={styles.image}
          resizeMode="cover"
        />
        {/* Heart */}
        <Pressable
          style={[styles.heartBtn, { backgroundColor: C.surface + 'ee' }]}
          onPress={() => toggleSaved(product.id)}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={18}
            color={isSaved ? '#ef4444' : C.textSecondary}
          />
        </Pressable>
        {/* Trending badge */}
        {product.trending && (
          <View style={[styles.badge, { backgroundColor: C.primary }]}>
            <Ionicons name="logo-instagram" size={10} color="#fff" />
            <Text style={styles.badgeText}>Trending</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: C.textPrimary }]} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: C.textPrimary }]}>
            {formatPrice(variant?.price ?? 0, variant?.currency)}
          </Text>
          {product.instagramLikes && (
            <Text style={[styles.likes, { color: C.textMuted }]}>
              ♥ {product.instagramLikes}
            </Text>
          )}
        </View>

        <View style={styles.btnRow}>
          {showCompare && (
            <Pressable
              style={[
                styles.btn, styles.btnOutline,
                { borderColor: inCompare ? C.primary : C.border,
                  backgroundColor: inCompare ? C.primaryDim : C.surface2 },
              ]}
              onPress={() => onCompare?.(product)}
            >
              <Text style={[styles.btnText, { color: inCompare ? C.primary : C.textSecondary }]}>
                {inCompare ? '✓ Added' : '+ Compare'}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.btn, styles.btnFill, { backgroundColor: C.primary, flex: showCompare ? 1 : undefined, width: showCompare ? undefined : '100%' }]}
            onPress={() => onBuy?.(product)}
          >
            <Text style={styles.btnFillText}>Buy Now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:      { borderRadius: Radius.lg, overflow: 'hidden' },
  imageWrap: { aspectRatio: 3/4, position: 'relative' },
  image:     { width: '100%', height: '100%' },
  heartBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: FontWeight.bold },
  info:      { padding: Spacing.md, gap: Spacing.xs },
  name:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  priceRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price:     { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  likes:     { fontSize: FontSize.xs },
  btnRow:    { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  btn:       { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center' },
  btnOutline:{ borderWidth: 1 },
  btnFill:   {},
  btnText:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  btnFillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: '#fff' },
});
