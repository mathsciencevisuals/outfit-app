import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompleteLookSection } from '../../components/CompleteLookSection';
import { ProductCard } from '../../components/ProductCard';
import { useTheme } from '../../hooks/useTheme';
import { mobileApi } from '../../services/api';
import { analytics } from '../../services/analytics';
import { useAppStore } from '../../store/app-store';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';
import type { Product, Recommendation, TrendingPin, UserProfile } from '../../types';

export function RecommendationsScreen() {
  const { C }  = useTheme();
  const userId = useAppStore(s => s.userId);
  const [trending, setTrending] = useState<Product[]>([]);
  const [recs,     setRecs]     = useState<Recommendation[]>([]);
  const [pins,     setPins]     = useState<TrendingPin[]>([]);
  const [profile,  setProfile]  = useState<UserProfile | null>(null);

  useEffect(() => {
    mobileApi.trending(4).then(setTrending).catch(() => {});
    mobileApi.recommendations(userId).then(setRecs).catch(() => {});
    mobileApi.socialTrending(8).then(setPins).catch(() => {});
    mobileApi.profile(userId).then(setProfile).catch(() => {});
  }, [userId]);

  const handleBuy = useCallback(async (product: Product) => {
    try {
      const { affiliateUrl, shopName, price } = await mobileApi.affiliateLink(product.id);
      analytics.track('affiliate_link_opened', {
        productId: product.id,
        sourceScreen: 'recommendations_buy_button',
        shopName,
        price,
      }).catch(() => {});
      await Linking.openURL(affiliateUrl);
    } catch { /* no-op */ }
  }, []);

  const recProducts = useMemo(
    () => recs.map(r => r.product).filter(Boolean) as Product[],
    [recs]
  );
  const completeLookAnchor = recProducts[0] ?? trending[0] ?? null;
  const completeLookFallback = useMemo(
    () => recProducts.length > 1 ? recProducts.slice(1) : trending.slice(1),
    [recProducts, trending]
  );

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: C.textPrimary }]}>AI Recommendations</Text>
      <Text style={[styles.sub, { color: C.textSecondary }]}>
        Curated picks based on your style profile and trending looks
      </Text>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
          Trending Products
        </Text>
      </View>
      <View style={styles.grid}>
        {trending.map(p => (
          <View key={p.id} style={styles.gridCell}>
            <ProductCard
              product={p}
              profile={profile}
              sourceScreen="recommendations_trending"
              trackReasonsViewed
              showBestPrice
              onBuy={handleBuy}
            />
          </View>
        ))}
      </View>

      {completeLookAnchor ? (
        <View style={[styles.completeLookSection, { backgroundColor: C.surface }]}>
          <CompleteLookSection
            userId={userId}
            anchorProduct={completeLookAnchor}
            sourceScreen="recommendations"
            profile={profile}
            fallbackProducts={completeLookFallback}
          />
        </View>
      ) : null}

      {/* Pinterest Trending */}
      {pins.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>📌 Trending on Pinterest</Text>
          </View>
          <View style={styles.grid}>
            {pins.map((pin) => (
              <Pressable
                key={pin.id}
                style={[styles.pinCard, { backgroundColor: C.surface }, Shadow.sm]}
                onPress={() => Linking.openURL(pin.sourceUrl).catch(() => {})}
              >
                <Image
                  source={{ uri: pin.imageUrl }}
                  style={styles.pinImage}
                  resizeMode="cover"
                />
                <View style={styles.pinInfo}>
                  <Text style={[styles.pinTitle, { color: C.textPrimary }]} numberOfLines={2}>
                    {pin.title}
                  </Text>
                  <View style={styles.pinMeta}>
                    <Text style={[styles.pinBoard, { color: C.primary }]} numberOfLines={1}>
                      {pin.boardName}
                    </Text>
                    <Text style={[styles.pinCount, { color: C.textMuted }]}>
                      ♥ {pin.pinCount >= 1000 ? `${(pin.pinCount / 1000).toFixed(1)}k` : pin.pinCount}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>✨ Recommended for You</Text>
      </View>
      <View style={styles.grid}>
        {recs.map(rec => {
          const p = rec.product;
          if (!p) return null;
          return (
            <View key={p.id} style={styles.gridCell}>
              <ProductCard
                product={p}
                recommendation={rec}
                profile={profile}
                sourceScreen="recommendations"
                trackReasonsViewed
                showBestPrice
                onBuy={handleBuy}
              />
            </View>
          );
        })}
        {recProducts.length === 0 && trending.map(p => (
          <View key={p.id} style={styles.gridCell}>
            <ProductCard
              product={p}
              profile={profile}
              sourceScreen="recommendations_fallback"
              trackReasonsViewed
              showBestPrice
              onBuy={handleBuy}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { padding: Spacing.base, paddingBottom: 80 },
  title:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: 4 },
  sub:         { fontSize: FontSize.sm, marginBottom: Spacing.lg },
  sectionHeader: { marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCell:    { width: '48%' },
  completeLookSection: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  // Pinterest pin cards
  pinCard:     { width: '48%', borderRadius: Radius.lg, overflow: 'hidden' },
  pinImage:    { width: '100%', aspectRatio: 3 / 4 },
  pinInfo:     { padding: Spacing.sm, gap: 4 },
  pinTitle:    { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, lineHeight: 16 },
  pinMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pinBoard:    { fontSize: FontSize.xs, flex: 1 },
  pinCount:    { fontSize: FontSize.xs },
});
