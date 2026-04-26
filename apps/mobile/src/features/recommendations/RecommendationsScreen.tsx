import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProductCard } from '../../components/ProductCard';
import { useTheme } from '../../hooks/useTheme';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { FontSize, FontWeight, Spacing } from '../../utils/theme';
import type { Product, Recommendation } from '../../types';

export function RecommendationsScreen() {
  const { C }  = useTheme();
  const userId = useAppStore(s => s.userId);
  const [trending, setTrending] = useState<Product[]>([]);
  const [recs,     setRecs]     = useState<Recommendation[]>([]);

  useEffect(() => {
    mobileApi.trending(4).then(setTrending).catch(() => {});
    mobileApi.recommendations(userId).then(setRecs).catch(() => {});
  }, [userId]);

  const recProducts = recs.map(r => r.product).filter(Boolean) as Product[];

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: C.textPrimary }]}>AI Recommendations</Text>
      <Text style={[styles.sub, { color: C.textSecondary }]}>
        Curated picks based on your style profile and trending looks
      </Text>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
          📸 Trending on Instagram
        </Text>
      </View>
      <View style={styles.grid}>
        {trending.map(p => (
          <View key={p.id} style={styles.gridCell}>
            <ProductCard product={p} onBuy={() => {}} />
          </View>
        ))}
      </View>

      <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>✨ Recommended for You</Text>
      </View>
      <View style={styles.grid}>
        {recProducts.map(p => (
          <View key={p.id} style={styles.gridCell}>
            <ProductCard product={p} onBuy={() => {}} />
          </View>
        ))}
        {recProducts.length === 0 && trending.map(p => (
          <View key={p.id} style={styles.gridCell}>
            <ProductCard product={p} onBuy={() => {}} />
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
});
