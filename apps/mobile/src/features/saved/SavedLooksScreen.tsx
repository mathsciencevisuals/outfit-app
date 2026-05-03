import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Image, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BestPriceCard } from '../../components/BestPriceCard';
import { CompleteLookSection } from '../../components/CompleteLookSection';
import { EmptyState } from '../../components/EmptyState';
import { RecommendationReasonBadges } from '../../components/RecommendationReasonBadge';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { StudentRewardsSummary } from '../../components/StudentRewardsSummary';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { analytics } from '../../services/analytics';
import { useAppStore } from '../../store/app-store';
import { formatPrice } from '../../utils/currency';
import { buildRecommendationReasons } from '../../utils/recommendationReasons';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';
import type { Product, SavedLook, UserProfile } from '../../types';

export function SavedLooksScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const localPreviews = useAppStore((s) => s.localSavedLookPreviews);

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.savedLooks(userId),
    [userId]
  );
  const { data: profile } = useAsyncResource<UserProfile>(
    () => mobileApi.profile(userId),
    [userId]
  );
  const { data: referral } = useAsyncResource(
    () => mobileApi.referralCode(),
    [userId]
  );
  const looks: SavedLook[] = Array.isArray(data) ? data : [];

  const handleShareReferral = useCallback(async (code?: string) => {
    const nextCode = code ?? referral?.code;
    if (!nextCode) return;
    try {
      const shared = await Share.share({
        message: `Join FitMe free with my code ${nextCode}. Try outfits virtually and earn student rewards.`,
        title: 'Join FitMe',
      });
      if (shared.action === Share.sharedAction) {
        const channel = shared.activityType ?? 'native';
        analytics.track('referral_code_shared', {
          sourceScreen: 'saved_looks_rewards',
          referralCode: nextCode,
          channel,
        }).catch(() => {});
      }
    } catch {
      // User cancelled share sheet.
    }
  }, [referral?.code]);

  const handleShareLook = useCallback(async (look: SavedLook, previewUri?: string | null) => {
    const productName = look.products?.[0]?.name ?? look.items?.[0]?.product?.name ?? look.name;
    const codeTag = referral?.code ? `\n\nJoin FitMe free -> use code ${referral.code}` : '';
    try {
      const shared = await Share.share({
        message: `Check out my saved FitMe look: ${productName}${codeTag}`,
        url: previewUri ?? look.tryOnImageUrl,
        title: 'My FitMe saved look',
      });
      if (shared.action === Share.sharedAction) {
        const channel = shared.activityType ?? 'native';
        await mobileApi.recordShare({ savedLookId: look.id, channel }).catch(() => {});
        analytics.track('share_completed', {
          sourceScreen: 'saved_looks',
          savedLookId: look.id,
          lookId: look.id,
          productId: look.products?.[0]?.id ?? look.items?.[0]?.productId,
          channel,
        }).catch(() => {});
        if (referral?.code) {
          analytics.track('referral_code_shared', {
            sourceScreen: 'saved_looks',
            referralCode: referral.code,
            channel,
            savedLookId: look.id,
          }).catch(() => {});
        }
        Alert.alert('Shared', 'You earned 10 FitMe points.');
      }
    } catch {
      // User cancelled share sheet.
    }
  }, [referral?.code]);

  const handleDeleteLook = (look: SavedLook) => {
    Alert.alert('Delete saved look?', `Remove "${look.name}" from your saved list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mobileApi.deleteSavedLook(look.id);
            analytics.track('look_unsaved', {
              lookId: look.id,
              sourceScreen: 'saved_looks',
            }).catch(() => {});
            refetch();
          } catch (deleteError) {
            Alert.alert(
              'Delete failed',
              deleteError instanceof Error ? deleteError.message : 'Please try again.'
            );
          }
        },
      },
    ]);
  };

  if (error) {
    return (
      <Screen>
        <EmptyState icon="⚠️" title="Couldn't load saved looks" subtitle={error} action="Retry" onAction={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard title="Rewards" subtitle="Share looks, invite friends, and unlock student perks.">
        <StudentRewardsSummary
          userId={userId}
          compact
          onShareReferral={handleShareReferral}
        />
      </SectionCard>

      <SectionCard
        title="Saved looks"
        subtitle="Outfits you can revisit after try-on and shop comparison."
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading saved looks…</Text>
        ) : looks.length === 0 ? (
          <EmptyState
            icon="💾"
            title="No saved looks yet. Try an outfit and tap the heart icon."
            subtitle="Saved products and generated try-ons will appear here for shopping and outfit planning."
            action="Start a try-on"
            onAction={() => router.push('/tryon-upload')}
          />
        ) : (
          looks.map((look) => {
            const localPreviewUri = localPreviews[look.id]?.imageUri;
            const products: Product[] = look.products ?? look.items?.map((item) => item.product).filter((product): product is Product => Boolean(product)) ?? [];
            const primaryProduct = products[0] ?? null;
            const previewUri = localPreviewUri ?? look.tryOnImageUrl ?? products[0]?.variants[0]?.imageUrl;

            return (
              <View key={look.id} style={styles.lookBlock}>
                <TouchableOpacity
                  style={styles.lookCard}
                  onPress={() => {/* navigate to look detail */}}
                  activeOpacity={0.8}
                >
                  <View style={styles.lookImageWrap}>
                    {previewUri ? (
                      <Image
                        source={{ uri: previewUri }}
                        style={styles.lookImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.lookImage, styles.lookImagePlaceholder]}>
                        <Ionicons name="shirt-outline" size={30} color={Colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.lookImageBadge}>
                      <Ionicons name="bookmark" size={11} color={Colors.white} />
                    </View>
                  </View>
                  <View style={styles.lookInfo}>
                    <Text style={styles.lookName}>{look.name}</Text>
                    {look.note ? (
                      <Text style={styles.lookNote} numberOfLines={2}>{look.note}</Text>
                    ) : null}
                    {look.fitScore != null || look.sourceScreen || look.stylistNote ? (
                      <Text style={styles.lookMeta} numberOfLines={1}>
                        {[
                          look.fitScore != null ? `${Math.round(look.fitScore)}% fit` : null,
                          look.sourceScreen ? look.sourceScreen.split('_').join(' ') : null,
                          look.stylistNote ? 'stylist note' : null,
                        ].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    <Text style={styles.lookDate}>
                      {new Date(look.savedAt ?? look.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleDeleteLook(look);
                    }}
                    accessibilityLabel={`Delete ${look.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </Pressable>
                </TouchableOpacity>

                {primaryProduct ? (
                  <View style={styles.bestPriceBlock}>
                    <BestPriceCard
                      product={primaryProduct}
                      sourceScreen="saved_looks"
                      compact
                    />
                  </View>
                ) : null}

                <View style={styles.shareBlock}>
                  <Pressable
                    style={styles.shareButton}
                    onPress={() => handleShareLook(look, previewUri)}
                  >
                    <Ionicons name="share-social-outline" size={15} color={Colors.white} />
                    <Text style={styles.shareButtonText}>Share this look</Text>
                  </Pressable>
                </View>

                {primaryProduct ? (
                  <View style={styles.completeLookBlock}>
                    <CompleteLookSection
                      userId={userId}
                      anchorProduct={primaryProduct}
                      sourceScreen="saved_looks"
                      profile={profile}
                      fallbackProducts={look.recommendedProducts ?? []}
                      title="Complete your look"
                    />
                  </View>
                ) : null}

                {(look.recommendedProducts ?? []).length > 0 ? (
                  <View style={styles.suggestedBlock}>
                    <Text style={styles.suggestedTitle}>Suggested next looks</Text>
                    {(look.recommendedProducts ?? []).slice(0, 3).map((product) => (
                      <SuggestedLookRow
                        key={product.id}
                        product={product}
                        profile={profile}
                        savedLook={look}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </SectionCard>
    </Screen>
  );
}

function productImage(product: Product) {
  return product.imageUrl ?? product.variants?.[0]?.imageUrl ?? null;
}

function SuggestedLookRow({
  product,
  profile,
  savedLook,
}: {
  product: Product;
  profile?: UserProfile | null;
  savedLook: SavedLook;
}) {
  const variant = product.variants?.[0];
  const reasons = buildRecommendationReasons({
    product,
    profile,
    savedLook,
    source: 'saved_looks',
  });

  return (
    <View style={styles.suggestedRow}>
      {productImage(product) ? (
        <Image source={{ uri: productImage(product)! }} style={styles.suggestedImage} resizeMode="cover" />
      ) : (
        <View style={[styles.suggestedImage, styles.lookImagePlaceholder]}>
          <Ionicons name="shirt-outline" size={18} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.suggestedInfo}>
        <Text style={styles.suggestedName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.suggestedPrice}>
          {variant ? formatPrice(variant.price, variant.currency) : product.category}
        </Text>
        <RecommendationReasonBadges
          reasons={reasons}
          productId={product.id}
          sourceScreen="saved_looks_suggested"
          trackViewed
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    fontSize: FontSize.sm, color: Colors.textMuted,
    textAlign: 'center', padding: Spacing.lg,
  },
  lookBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  lookCard: {
    flexDirection: 'row', gap: Spacing.md,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  lookImageWrap: {
    position: 'relative',
  },
  lookImage: {
    width: 72, height: 90, borderRadius: Radius.sm,
    backgroundColor: Colors.surface2,
  },
  lookImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lookImageBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  lookInfo: { flex: 1, gap: 3 },
  lookName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  lookNote: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  lookMeta: { fontSize: FontSize.xs, color: Colors.primary, textTransform: 'capitalize' },
  lookDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorDim,
  },
  bestPriceBlock: { marginLeft: 88, paddingBottom: Spacing.sm },
  shareBlock: { marginLeft: 88, paddingBottom: Spacing.sm },
  shareButton: {
    minHeight: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
  },
  shareButtonText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  completeLookBlock: { marginLeft: 88, paddingBottom: Spacing.sm },
  suggestedBlock: { marginLeft: 88, gap: Spacing.sm, paddingBottom: Spacing.xs },
  suggestedTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted },
  suggestedRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  suggestedImage: { width: 44, height: 56, borderRadius: Radius.sm, backgroundColor: Colors.surface2 },
  suggestedInfo: { flex: 1, gap: 3 },
  suggestedName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  suggestedPrice: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
});
