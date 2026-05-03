import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/app-store';
import { formatPrice } from '../utils/currency';
import { buildRecommendationReasons } from '../utils/recommendationReasons';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../utils/theme';
import type { Product, Recommendation, UserProfile } from '../types';
import { BestPriceCard } from './BestPriceCard';
import { RecommendationReasonBadges } from './RecommendationReasonBadge';
import { SaveLookButton } from './SaveLookButton';

interface Props {
  product: Product;
  recommendation?: Recommendation | null;
  profile?: UserProfile | null;
  recommendationReasons?: string[];
  showCompare?: boolean;
  sourceScreen?: string;
  trackReasonsViewed?: boolean;
  showBestPrice?: boolean;
  onBuy?: (product: Product) => void;
  onCompare?: (product: Product) => void;
}

export function ProductCard({
  product,
  recommendation,
  profile,
  recommendationReasons,
  showCompare,
  sourceScreen = 'product_card',
  trackReasonsViewed = false,
  showBestPrice = false,
  onBuy,
  onCompare,
}: Props) {
  const { C } = useTheme();
  const compareIds   = useAppStore(s => s.compareProductIds);

  const inCompare = compareIds.includes(product.id);
  const variant   = product.variants[0];
  const reasons = buildRecommendationReasons({
    product,
    recommendation,
    profile,
    explicitReasons: recommendationReasons,
    source: sourceScreen,
  });

  return (
    <View style={[styles.card, { backgroundColor: C.surface }, Shadow.sm]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: variant?.imageUrl ?? `https://picsum.photos/seed/${product.id}/400/500` }}
          style={styles.image}
          resizeMode="cover"
        />
        <SaveLookButton
          product={product}
          generatedImageUrl={variant?.imageUrl ?? product.imageUrl ?? undefined}
          sourceScreen={sourceScreen}
          mode="icon"
          style={styles.heartBtn}
          metadata={{
            saveType: 'product_card',
            price: variant?.price,
            currency: variant?.currency,
          }}
        />
        {/* Trending badge */}
        {product.trending && (
          <View style={[styles.badge, { backgroundColor: C.primary }]}>
            <Ionicons name="trending-up-outline" size={10} color="#fff" />
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
        <View style={styles.reasonBlock}>
          <Text style={[styles.reasonTitle, { color: C.textMuted }]}>Why this?</Text>
          <RecommendationReasonBadges
            reasons={reasons}
            productId={product.id}
            sourceScreen={sourceScreen}
            trackViewed={trackReasonsViewed}
          />
        </View>

        {showBestPrice ? (
          <BestPriceCard
            product={product}
            sourceScreen={sourceScreen}
            compact
          />
        ) : null}

        {showBestPrice && !showCompare ? null : (
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
        )}
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
  reasonBlock: { gap: 5, marginTop: 2 },
  reasonTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  btnRow:    { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  btn:       { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center' },
  btnOutline:{ borderWidth: 1 },
  btnFill:   {},
  btnText:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  btnFillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: '#fff' },
});
