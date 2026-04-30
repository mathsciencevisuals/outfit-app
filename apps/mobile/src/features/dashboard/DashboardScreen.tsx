import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProductCard } from '../../components/ProductCard';
import { useTheme } from '../../hooks/useTheme';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';
import type { Product, UserProfile, UserStats } from '../../types';

export function DashboardScreen() {
  const { C }  = useTheme();
  const router = useRouter();
  const userId = useAppStore(s => s.userId);
  const savedCount = useAppStore(s => s.savedProductIds.length);

  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [stats,    setStats]    = useState<UserStats | null>(null);
  const [trending, setTrending] = useState<Product[]>([]);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    let resolved = false;
    const markReady = () => { if (!resolved) { resolved = true; setReady(true); } };
    mobileApi.profile(userId).then(p => { setProfile(p); markReady(); }).catch(markReady);
    mobileApi.stats(userId).then(setStats).catch(() => {});
    mobileApi.trending(4).then(setTrending).catch(() => {});
  }, [userId]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const firstName = profile?.firstName ?? 'there';

  const statCards = [
    { label: 'Try-ons',     value: stats?.tryOnsCount    ?? 0,    icon: 'shirt-outline'    as const },
    { label: 'Saved Items', value: stats?.savedCount ?? savedCount, icon: 'heart-outline'    as const },
    { label: 'Style Match', value: `${stats?.styleMatchPct ?? 0}%`, icon: 'trending-up-outline' as const },
  ];

  const quickActions = [
    { label: 'Virtual Try-On', sub: 'Test new looks',    icon: 'camera-outline'    as const, route: '/tryme'           },
    { label: 'AI Picks',       sub: 'For you',           icon: 'sparkles-outline'  as const, route: '/recommendations'  },
    { label: 'Wishlist',       sub: 'Saved items',       icon: 'bookmark-outline'  as const, route: '/saved-looks'     },
    { label: 'My Style',       sub: 'Preferences',       icon: 'person-outline'    as const, route: '/profile-main'    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome */}
      <Text style={[styles.welcome, { color: C.textPrimary }]}>
        Welcome back, {firstName}! 👋
      </Text>
      <Text style={[styles.sub, { color: C.textSecondary }]}>
        Discover your perfect style with AI-powered recommendations
      </Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {statCards.map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: C.surface }, Shadow.sm]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
              <Ionicons name={s.icon} size={16} color={C.primary} />
            </View>
            <Text style={[styles.statValue, { color: C.textPrimary }]}>{String(s.value)}</Text>
          </View>
        ))}
      </View>

      {/* Trending */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Trending 🔥</Text>
        <Pressable onPress={() => router.push('/recommendations' as never)}>
          <Text style={[styles.viewAll, { color: C.primary }]}>See all →</Text>
        </Pressable>
      </View>
      <View style={styles.grid2}>
        {trending.map((p) => (
          <View key={p.id} style={styles.gridCell}>
            <ProductCard
              product={p}
              onBuy={(prod) => router.push({ pathname: '/tryme', params: { productId: prod.id } } as never)}
            />
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: C.textPrimary, marginTop: Spacing.lg }]}>
        Quick Actions
      </Text>
      <View style={styles.grid2}>
        {quickActions.map((qa) => (
          <Pressable
            key={qa.label}
            style={[styles.actionCard, { backgroundColor: C.surface }, Shadow.sm]}
            onPress={() => router.push(qa.route as never)}
          >
            <Ionicons name={qa.icon} size={28} color={C.primary} style={{ marginBottom: 8 }} />
            <Text style={[styles.actionTitle, { color: C.textPrimary }]}>{qa.label}</Text>
            <Text style={[styles.actionSub, { color: C.textSecondary }]}>{qa.sub}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  welcome:     { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: 4 },
  sub:         { fontSize: FontSize.sm, marginBottom: Spacing.lg },
  statsRow:    { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard:    { flex: 1, borderRadius: Radius.lg, padding: Spacing.md },
  statHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statLabel:   { fontSize: FontSize.xs },
  statValue:   { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  viewAll:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  grid2:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCell:    { width: '48%' },
  actionCard:  { width: '48%', borderRadius: Radius.lg, padding: Spacing.base },
  actionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  actionSub:   { fontSize: FontSize.xs, marginTop: 2 },
});
