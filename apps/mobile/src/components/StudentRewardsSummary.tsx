import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAsyncResource } from '../hooks/useAsyncResource';
import { mobileApi } from '../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';

const FALLBACK_CAMPAIGNS = [
  {
    id: 'campus-challenge',
    title: 'Campus challenge',
    description: 'Share your best campus-ready look and climb the student style board.',
  },
  {
    id: 'best-look-week',
    title: 'Best look of the week',
    description: 'Top shared try-on gets highlighted in FitMe student picks.',
  },
  {
    id: 'refer-3-premium',
    title: 'Refer 3 friends',
    description: 'Unlock premium try-on perks after three friends join with your code.',
  },
];

interface Props {
  userId: string;
  compact?: boolean;
  onShareReferral?: (code?: string) => void;
}

export function StudentRewardsSummary({ userId, compact = false, onShareReferral }: Props) {
  const { data: wallet } = useAsyncResource(() => mobileApi.rewardsWallet(), [userId]);
  const { data: referral } = useAsyncResource(() => mobileApi.referralCode(), [userId]);
  const { data: redemptions } = useAsyncResource(() => mobileApi.couponRedemptions(), [userId]);
  const { data: campaigns } = useAsyncResource(() => mobileApi.campaigns(), [userId]);

  const unlockedCoupons = (redemptions ?? []).filter((item) => item.status === 'UNLOCKED' || item.status === 'REDEEMED').length;
  const campaignItems = useMemo(() => {
    const active = Array.isArray(campaigns) && campaigns.length > 0
      ? campaigns.slice(0, 3).map((campaign) => ({
          id: campaign.id,
          title: campaign.title,
          description: campaign.description ?? campaign.budgetLabel ?? 'Student growth campaign',
        }))
      : FALLBACK_CAMPAIGNS;
    return active;
  }, [campaigns]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.summaryRow}>
        <Metric label="Available points" value={wallet?.balancePoints ?? 0} />
        <Metric label="Referral code" value={referral?.code ?? 'FITME'} />
        <Metric label="Unlocked coupons" value={unlockedCoupons} />
      </View>

      <Pressable style={styles.referralButton} onPress={() => onShareReferral?.(referral?.code)}>
        <Text style={styles.referralButtonText}>Share referral code</Text>
      </Pressable>

      <View style={styles.campaignStack}>
        {campaignItems.map((campaign) => (
          <View key={campaign.id} style={styles.campaignCard}>
            <Text style={styles.campaignTitle}>{campaign.title}</Text>
            <Text style={styles.campaignCopy}>{campaign.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  wrapCompact: { gap: Spacing.sm },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metric: {
    flexGrow: 1,
    minWidth: '30%',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: 3,
  },
  metricValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  referralButton: {
    minHeight: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  referralButtonText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  campaignStack: { gap: Spacing.sm },
  campaignCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    padding: Spacing.md,
    gap: 4,
  },
  campaignTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  campaignCopy: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
});
