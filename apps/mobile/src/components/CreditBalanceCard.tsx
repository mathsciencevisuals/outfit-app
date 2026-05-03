import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';
import type { TryOnCreditBalance } from '../types';

interface CreditBalanceCardProps {
  balance: TryOnCreditBalance | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
  onUpgrade?: () => void;
  onRetry?: () => void;
}

export function CreditBalanceCard({
  balance,
  loading = false,
  error,
  compact = false,
  onUpgrade,
  onRetry,
}: CreditBalanceCardProps) {
  if (loading) {
    return (
      <View style={[styles.card, compact && styles.compactCard]}>
        <Text style={styles.title}>Try-on credits</Text>
        <Text style={styles.muted}>Checking today's balance...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, compact && styles.compactCard]}>
        <Text style={styles.title}>Try-on credits</Text>
        <Text style={styles.error}>Could not load credits.</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const remaining = balance?.remainingToday ?? 0;
  const limit = balance?.dailyLimit ?? 0;
  const planLabel = balance?.plan === 'PREMIUM' ? 'Premium' : 'Free';
  const limitReached = balance?.limitReached === true;
  const premiumEnabled = balance?.enabled === true;

  return (
    <View style={[styles.card, limitReached && styles.limitCard, compact && styles.compactCard]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Try-on credits</Text>
          <Text style={styles.muted}>{planLabel} plan</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{premiumEnabled ? 'Enabled' : 'Preview'}</Text>
        </View>
      </View>

      <View style={styles.balanceRow}>
        <Text style={styles.balanceNumber}>{remaining}</Text>
        <Text style={styles.balanceCopy}>remaining today</Text>
      </View>
      <Text style={styles.detail}>
        {balance ? `${balance.usedToday} used of ${limit} daily credits` : 'Daily free credits are being prepared.'}
      </Text>

      {limitReached ? (
        <Text style={styles.limitText}>Daily free try-ons used. Upgrade scaffolding is ready, but payments are not enabled yet.</Text>
      ) : null}

      {onUpgrade ? (
        <PrimaryButton variant={limitReached ? 'primary' : 'secondary'} onPress={onUpgrade} style={styles.cta}>
          View Premium
        </PrimaryButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  compactCard: {
    marginBottom: Spacing.md,
  },
  limitCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  muted: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    borderRadius: Radius.full,
    backgroundColor: Colors.surface2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  balanceNumber: {
    fontSize: 34,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  balanceCopy: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  detail: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  limitText: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  error: {
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  retryText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  cta: {
    marginTop: Spacing.xs,
  },
});
