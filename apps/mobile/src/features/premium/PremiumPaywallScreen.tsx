import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CreditBalanceCard } from '../../components/CreditBalanceCard';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { Colors, FontSize, FontWeight, Spacing } from '../../utils/theme';

export function PremiumPaywallScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const { data: credits, loading, error, refetch } = useAsyncResource(() => mobileApi.tryOnCredits(userId), [userId]);

  const premiumFeatures = credits?.plans?.premium?.features ?? [
    'More try-ons',
    'HD try-on',
    'Advanced styling notes',
    'Early trend access',
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>FitMe Premium</Text>
        <Text style={styles.title}>Premium try-on credits are ready for launch.</Text>
        <Text style={styles.subtitle}>
          Payments are intentionally disabled until a provider and entitlement sync are connected.
        </Text>
      </View>

      <CreditBalanceCard
        balance={credits}
        loading={loading}
        error={error}
        onRetry={refetch}
      />

      <SectionCard title="Premium plan">
        <View style={styles.featureList}>
          {premiumFeatures.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.dot} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>
          No card, checkout, or subscription SDK is active in this build.
        </Text>
      </SectionCard>

      <SectionCard title="Free plan">
        <Text style={styles.planText}>
          {credits?.plans?.free?.dailyTryOns ?? 3} daily try-ons with standard quality.
        </Text>
      </SectionCard>

      <View style={styles.actions}>
        <PrimaryButton disabled>
          Payments coming soon
        </PrimaryButton>
        <PrimaryButton variant="secondary" onPress={() => router.back()}>
          Back
        </PrimaryButton>
      </View>

      {!loading && !credits && !error ? (
        <EmptyState
          icon="i"
          title="Credits are not available yet"
          subtitle="Try again after the API is updated."
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  kicker: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  featureText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  note: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  planText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  actions: {
    gap: Spacing.sm,
  },
});
