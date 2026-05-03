import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { analytics } from '../services/analytics';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';

const viewedReasonKeys = new Set<string>();

interface RecommendationReasonBadgeProps {
  reason: string;
}

interface RecommendationReasonBadgesProps {
  reasons: string[];
  productId?: string;
  sourceScreen?: string;
  trackViewed?: boolean;
}

export function RecommendationReasonBadge({ reason }: RecommendationReasonBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{reason}</Text>
    </View>
  );
}

export function RecommendationReasonBadges({
  reasons,
  productId,
  sourceScreen,
  trackViewed = false,
}: RecommendationReasonBadgesProps) {
  const visibleReasons = reasons.slice(0, 4);

  useEffect(() => {
    if (!trackViewed || !productId || !sourceScreen || visibleReasons.length === 0) return;
    const key = `${sourceScreen}:${productId}:${visibleReasons.join('|')}`;
    if (viewedReasonKeys.has(key)) return;
    viewedReasonKeys.add(key);
    analytics.track('recommendation_reason_viewed', {
      productId,
      sourceScreen,
      reasons: visibleReasons,
    }).catch(() => {});
  }, [productId, sourceScreen, trackViewed, visibleReasons]);

  if (visibleReasons.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {visibleReasons.map((reason) => (
        <RecommendationReasonBadge key={reason} reason={reason} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
