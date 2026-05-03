import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen }      from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';

type AdminSection = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  adminOnly?: boolean;
};

const SECTIONS: AdminSection[] = [
  { title: 'Brands',    subtitle: 'Manage brand catalogue', icon: 'ribbon-outline',        route: '/admin-brands' },
  { title: 'Products',  subtitle: 'Add & edit products',    icon: 'shirt-outline',          route: '/admin-products' },
  { title: 'Shops',     subtitle: 'Manage partner shops',   icon: 'storefront-outline',     route: '/admin-shops' },
  { title: 'Campaigns', subtitle: 'Promotional campaigns',  icon: 'megaphone-outline',      route: '/admin-campaigns' },
  { title: 'Coupons',   subtitle: 'Discount codes',         icon: 'pricetag-outline',       route: '/admin-coupons' },
  { title: 'Try-On',    subtitle: 'AI provider config',     icon: 'sparkles-outline',       route: '/admin-tryon' },
  { title: 'Users',     subtitle: 'Browse user accounts',   icon: 'people-outline',         route: '/admin-users' },
  { title: 'Rewards',   subtitle: 'Adjust point balances',  icon: 'star-outline',           route: '/admin-rewards', adminOnly: true },
  { title: 'Pinterest', subtitle: 'Board IDs & affiliate',  icon: 'logo-pinterest',         route: '/admin-pinterest' },
];

export function AdminDashboardScreen() {
  const router   = useRouter();
  const userRole = useAppStore((s) => s.userRole);
  const { data: analyticsSummary } = useAsyncResource(
    () => mobileApi.adminAnalyticsSummary(),
    [userRole],
  );
  const { data: trendDiagnostics } = useAsyncResource(
    () => mobileApi.adminTrendDiagnostics(),
    [userRole],
  );

  useEffect(() => {
    if (userRole !== 'ADMIN' && userRole !== 'OPERATOR') {
      router.replace('/dashboard' as never);
    }
  }, [userRole, router]);

  if (userRole !== 'ADMIN' && userRole !== 'OPERATOR') {
    return null;
  }

  const visibleSections = SECTIONS.filter(
    (s) => !s.adminOnly || userRole === 'ADMIN',
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, userRole === 'ADMIN' ? styles.adminBadge : styles.operatorBadge]}>
            <Text style={styles.roleBadgeText}>{userRole}</Text>
          </View>
        </View>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Manage the FitMe platform</Text>
      </View>

      <SectionCard title="Manage">
        <View style={styles.grid}>
          {visibleSections.map((section) => (
            <Pressable
              key={section.route + section.title}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(section.route as never)}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={section.icon} size={22} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardSubtitle}>{section.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      {analyticsSummary ? (
        <SectionCard title="Launch analytics" subtitle="Core activation, engagement, and conversion counters.">
          <View style={styles.metricsGrid}>
            <Metric label="Try-ons" value={analyticsSummary.tryOns} />
            <Metric label="Saves" value={analyticsSummary.saves} />
            <Metric label="Affiliate clicks" value={analyticsSummary.affiliateClicks} />
            <Metric label="Shop clicks" value={analyticsSummary.shopClicks} />
            <Metric label="Shares" value={analyticsSummary.shares} />
            <Metric label="Merchant signups" value={analyticsSummary.merchantRegistrations} />
          </View>
        </SectionCard>
      ) : null}

      {trendDiagnostics ? (
        <SectionCard title="Trend source diagnostics" subtitle="Instagram is optional; Pinterest, internal, and affiliate catalog signals stay primary.">
          <View style={styles.diagnosticsList}>
            {trendDiagnostics.map((item) => (
              <View key={item.provider} style={styles.diagnosticRow}>
                <View style={styles.diagnosticText}>
                  <Text style={styles.diagnosticProvider}>{formatProvider(item.provider)}</Text>
                  <Text style={styles.diagnosticNote} numberOfLines={2}>
                    {item.errorMessage ?? item.notes ?? 'No recent errors.'}
                  </Text>
                  <Text style={styles.diagnosticMeta}>
                    Last success: {item.lastSuccessfulFetchAt ? new Date(item.lastSuccessfulFetchAt).toLocaleString() : '—'}
                  </Text>
                </View>
                <View style={[styles.statusPill, statusStyle(item.status)]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function formatProvider(provider: string) {
  return provider
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusStyle(status: string) {
  if (status === 'active') return styles.statusActive;
  if (status === 'error') return styles.statusError;
  if (status === 'disabled') return styles.statusDisabled;
  return styles.statusPending;
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  adminBadge: {
    backgroundColor: Colors.errorDim,
  },
  operatorBadge: {
    backgroundColor: Colors.warningDim,
  },
  roleBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  card: {
    width: '47%',
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    width: '48%',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    padding: Spacing.md,
    gap: 3,
  },
  metricValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  diagnosticsList: {
    gap: Spacing.sm,
  },
  diagnosticRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    padding: Spacing.md,
  },
  diagnosticText: {
    flex: 1,
    gap: 3,
  },
  diagnosticProvider: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  diagnosticNote: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  diagnosticMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: Colors.successDim,
  },
  statusPending: {
    backgroundColor: Colors.warningDim,
  },
  statusError: {
    backgroundColor: Colors.errorDim,
  },
  statusDisabled: {
    backgroundColor: Colors.surface,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
});
