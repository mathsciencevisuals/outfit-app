import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { BestPriceCard } from '../../components/BestPriceCard';
import { CompleteLookSection } from '../../components/CompleteLookSection';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SaveLookButton } from '../../components/SaveLookButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { StudentRewardsSummary } from '../../components/StudentRewardsSummary';
import { mobileApi } from '../../services/api';
import { analytics } from '../../services/analytics';
import { useAppStore } from '../../store/app-store';
import {
  Colors, FontSize, FontWeight, Radius, Shadow, Spacing,
} from '../../utils/theme';
import type { Product, Recommendation, TryOnResult, UserProfile } from '../../types';

function useResultState(): [TryOnResult | null, (r: TryOnResult) => void] {
  const [result, setResult] = useState<TryOnResult | null>(null);
  return [result, setResult];
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export function TryOnResultScreen() {
  const router = useRouter();

  const requestId        = useAppStore((s) => s.lastTryOnRequestId);
  const userId           = useAppStore((s) => s.userId);
  const tryOnStatus      = useAppStore((s) => s.tryOnStatus);
  const tryOnProgress    = useAppStore((s) => s.tryOnProgress);
  const selectedProduct  = useAppStore((s) => s.selectedProduct);
  const selectedVariant  = useAppStore((s) => s.selectedVariant);
  const setTryOnStatus   = useAppStore((s) => s.setTryOnStatus);
  const setTryOnProgress = useAppStore((s) => s.setTryOnProgress);
  const setTryOnError    = useAppStore((s) => s.setTryOnError);
  const resetTryOn       = useAppStore((s) => s.resetTryOn);

  const [result, setResult] = useResultState();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [affiliate, setAffiliate] = useState<{ affiliateUrl: string; shopName: string | null; price: number | null } | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareRewarded, setShareRewarded] = useState(false);
  const completionTrackedRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!requestId || tryOnStatus === 'complete' || result) return;

    let cancelled = false;

    setTryOnStatus('processing');
    mobileApi
      .pollTryOnResult(requestId, (pct) => {
        if (!cancelled) setTryOnProgress(pct);
      })
      .then((r) => {
        if (!cancelled) {
          setResult(r);
          setTryOnStatus('complete');
          Animated.timing(fadeAnim, {
            toValue: 1, duration: 500, useNativeDriver: true,
          }).start();
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          analytics.track('tryon_failed', {
            sourceScreen: 'try_on_result',
            tryOnId: requestId,
            tryOnRequestId: requestId,
            productId: selectedProduct?.id,
            stage: 'result_poll',
            errorMessage: err.message,
          }).catch(() => {});
          setTryOnError(err.message);
          setTryOnStatus('error');
        }
      });

    return () => { cancelled = true; };
  }, [fadeAnim, requestId, result, selectedProduct?.id, setTryOnError, setTryOnProgress, setTryOnStatus, tryOnStatus]);

  const resultImageUrl = result?.result?.outputImageUrl ?? null;
  const confidence = result?.result?.confidence;
  const confidenceScore = confidence !== undefined ? Math.round(confidence * 100) : null;
  const metadata = result?.result?.metadata;
  const stylistNote = typeof metadata?.stylistNote === 'string' ? metadata.stylistNote : null;
  const warningFlags = [
    ...toStringArray(metadata?.warningFlags),
    ...toStringArray(metadata?.issueFlags),
    ...toStringArray(metadata?.issues),
  ];
  const fitReason =
    (typeof metadata?.fitReason === 'string' && metadata.fitReason) ||
    result?.result?.summary ||
    'The outfit is evaluated against your current try-on photo, selected size, and product fit data.';

  const outfitPrice = affiliate?.price ?? selectedProduct?.offerSummary?.lowestPrice ?? selectedVariant?.price ?? null;

  const completeLookProducts = useMemo(() => {
    const selectedCategory = selectedProduct?.category;
    return recommendations
      .map((item) => item.product)
      .filter(Boolean)
      .filter((product) => product!.id !== selectedProduct?.id)
      .filter((product) => product!.category !== selectedCategory)
      .slice(0, 4) as Product[];
  }, [recommendations, selectedProduct]);

  const whyThisOutfit = useMemo(() => {
    const stylePrefs = Array.isArray(profile?.stylePreference?.styles)
      ? (profile?.stylePreference?.styles as unknown[]).map(String)
      : profile?.stylePreferences ?? [];
    const colorPrefs = profile?.preferredColors ?? [];
    const price = outfitPrice;
    const withinBudget = profile?.budgetMax && price ? price <= profile.budgetMax : null;

    return [
      {
        label: 'Style match',
        detail: stylePrefs.length > 0
          ? `Matches ${stylePrefs.slice(0, 2).join(', ')} preferences.`
          : 'Matches your current style profile.',
      },
      {
        label: 'Color match',
        detail: colorPrefs.length > 0 && selectedProduct?.baseColor
          ? `${selectedProduct.baseColor} works with your saved palette.`
          : 'Uses a versatile color profile for repeat wear.',
      },
      {
        label: 'Budget fit',
        detail: withinBudget === null
          ? 'Price is shown before handoff so you can decide quickly.'
          : withinBudget
            ? 'This option sits inside your saved budget range.'
            : 'This is above your saved budget, so compare offers before buying.',
      },
      {
        label: 'Trend signal',
        detail: selectedProduct?.trending || selectedProduct?.instagramLikes
          ? 'Trending signal detected from Pinterest, internal activity, or catalog offers.'
          : 'Comparable styles are active in the recommendation feed.',
      },
    ];
  }, [outfitPrice, profile, selectedProduct]);

  useEffect(() => {
    if (resultImageUrl) {
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim, resultImageUrl]);

  useEffect(() => {
    if (!userId) return;
    mobileApi.profile(userId).then(setProfile).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (selectedProduct) {
      mobileApi.affiliateLink(selectedProduct.id).then(setAffiliate).catch(() => {});
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!result || !requestId) return;
    mobileApi.referralCode().then(r => setReferralCode(r.code)).catch(() => {});
    mobileApi.afterTryOnRecs(userId, requestId)
      .then(setRecommendations)
      .catch(() => mobileApi.recommendations(userId).then(setRecommendations).catch(() => {}));
  }, [requestId, result, userId]);

  useEffect(() => {
    if (!resultImageUrl || completionTrackedRef.current) return;
    completionTrackedRef.current = true;
    analytics.track('tryon_completed', {
      tryOnRequestId: requestId,
      tryOnId: requestId ?? undefined,
      productId: selectedProduct?.id,
      resultImageUrl,
      confidenceScore,
    }).catch(() => {});
  }, [confidenceScore, requestId, resultImageUrl, selectedProduct?.id]);

  const handleShare = useCallback(async (channelHint = 'native') => {
    if (!resultImageUrl) return;
    const codeTag = referralCode ? `\n\nJoin FitMe free -> use code ${referralCode}` : '';
    const message = `Check out how I look in ${selectedProduct?.name ?? 'this outfit'} - styled with AI on FitMe${codeTag}`;
    try {
      const shared = await Share.share({ message, url: resultImageUrl, title: 'My FitMe Try-On' });
      if (shared.action === Share.sharedAction) {
        const channel = shared.activityType ?? channelHint;
        mobileApi.recordShare({ tryOnRequestId: requestId ?? undefined, channel }).catch(() => {});
        analytics.track('share_completed', {
          tryOnRequestId: requestId,
          tryOnId: requestId ?? undefined,
          productId: selectedProduct?.id,
          channel,
        }).catch(() => {});
        if (referralCode) {
          analytics.track('referral_code_shared', {
            sourceScreen: 'try_on_result',
            referralCode,
            channel,
            tryOnRequestId: requestId,
          }).catch(() => {});
        }
        if (!shareRewarded) {
          setShareRewarded(true);
          Alert.alert('Shared', 'You earned 10 FitMe points.');
        }
      }
    } catch {
      // User cancelled share sheet.
    }
  }, [resultImageUrl, selectedProduct, referralCode, requestId, shareRewarded]);

  const handleBuyNow = useCallback(async () => {
    if (!selectedProduct) return;
    try {
      const nextAffiliate = affiliate ?? await mobileApi.affiliateLink(selectedProduct.id);
      analytics.track('affiliate_link_opened', {
        tryOnRequestId: requestId,
        tryOnId: requestId ?? undefined,
        productId: selectedProduct.id,
        shopName: nextAffiliate.shopName,
        price: nextAffiliate.price,
      }).catch(() => {});
      await Linking.openURL(nextAffiliate.affiliateUrl);
    } catch { /* no-op */ }
  }, [affiliate, requestId, selectedProduct]);

  const handleRecommendationPress = useCallback((product: Product, source: string) => {
    analytics.track('recommendation_clicked', {
      tryOnRequestId: requestId,
      tryOnId: requestId ?? undefined,
      productId: product.id,
      source,
    }).catch(() => {});
    router.push('/recommendations' as never);
  }, [requestId, router]);

  const handleTryAnother = useCallback(() => {
    resetTryOn();
    router.replace('/tryon-upload');
  }, [resetTryOn, router]);

  const handleShareReferral = useCallback(async (code?: string) => {
    const nextCode = code ?? referralCode;
    if (!nextCode) return;
    try {
      const shared = await Share.share({
        message: `Join FitMe free with my code ${nextCode}. Try outfits virtually and earn student rewards.`,
        title: 'Join FitMe',
      });
      if (shared.action === Share.sharedAction) {
        const channel = shared.activityType ?? 'native';
        analytics.track('referral_code_shared', {
          sourceScreen: 'try_on_result_rewards',
          referralCode: nextCode,
          channel,
        }).catch(() => {});
      }
    } catch {
      // User cancelled share sheet.
    }
  }, [referralCode]);

  const isProcessing = tryOnStatus === 'processing' || tryOnStatus === 'uploading';

  if (!requestId) {
    return (
      <Screen>
        <EmptyState
          icon="✨"
          title="No try-on yet"
          subtitle="Go back and choose an outfit to try on."
          action="Start try-on"
          onAction={() => router.replace('/tryon-upload')}
        />
      </Screen>
    );
  }

  if (tryOnStatus === 'error') {
    return (
      <Screen>
        <EmptyState
          icon="⚠️"
          title="Try-on failed"
          subtitle="Something went wrong generating your look. Please try again."
          action="Try again"
          onAction={handleTryAnother}
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen>
        {resultImageUrl ? (
          <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }]}>
            <Image source={{ uri: resultImageUrl }} style={styles.resultImage} resizeMode="cover" />
            {confidenceScore !== null ? (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{confidenceScore}% fit match</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>👕</Text>
            <Text style={styles.placeholderText}>
              {isProcessing ? 'Rendering your look...' : 'No preview available'}
            </Text>
          </View>
        )}

        <View style={styles.headlineBlock}>
          <Text style={styles.eyebrow}>Try-on result</Text>
          <Text style={styles.headline}>This look works well for you</Text>
          {selectedProduct ? (
            <Text style={styles.subhead}>
              {selectedProduct.name} by {selectedProduct.brand.name}
            </Text>
          ) : null}
        </View>

        {result?.result ? (
          <SectionCard title="Fit confidence" subtitle="Clear enough to act, with any risks called out.">
            <View style={styles.scoreRow}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{confidenceScore ?? '--'}</Text>
                <Text style={styles.scoreUnit}>/100</Text>
              </View>
              <View style={styles.scoreCopy}>
                <Text style={styles.fitReason}>{fitReason}</Text>
                <View style={styles.warningWrap}>
                  {warningFlags.length > 0 ? warningFlags.slice(0, 3).map((flag) => (
                    <View key={flag} style={[styles.warningPill, styles.warningPillAlert]}>
                      <Text style={styles.warningText}>{flag.split('-').join(' ')}</Text>
                    </View>
                  )) : (
                    <View style={styles.warningPill}>
                      <Text style={styles.warningText}>No major fit warnings</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </SectionCard>
        ) : null}

        <SectionCard title="Why this outfit">
          <View style={styles.reasonGrid}>
            {whyThisOutfit.map((reason) => (
              <View key={reason.label} style={styles.reasonCard}>
                <Text style={styles.reasonLabel}>{reason.label}</Text>
                <Text style={styles.reasonDetail}>{reason.detail}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Best price / shop comparison" subtitle="Compare before leaving FitMe.">
          <BestPriceCard
            product={selectedProduct}
            sourceScreen="try_on_result"
            tryOnRequestId={requestId}
          />
        </SectionCard>

        <SectionCard>
          <CompleteLookSection
            userId={userId}
            anchorProduct={selectedProduct}
            sourceScreen="try_on_result"
            profile={profile}
            fallbackProducts={completeLookProducts}
            tryOnRequestId={requestId}
          />
        </SectionCard>

        {result ? (
          <SectionCard>
            <View style={styles.primaryCtaStack}>
              <PrimaryButton onPress={handleBuyNow}>
                🛒  Buy Now
              </PrimaryButton>
              <SaveLookButton
                product={selectedProduct}
                generatedImageUrl={resultImageUrl}
                tryOnResultId={requestId}
                fitScore={confidenceScore ?? undefined}
                stylistNote={stylistNote ?? undefined}
                sourceScreen="try_on_result"
                mode="full"
                metadata={{
                  saveType: 'try_on_result',
                  variantId: selectedVariant?.id,
                  variantSize: selectedVariant?.size,
                  fitReason,
                  warningFlags,
                }}
              />
              <PrimaryButton variant="secondary" onPress={() => handleShare()}>
                📤  Share
              </PrimaryButton>
              <PrimaryButton variant="ghost" onPress={handleTryAnother}>
                Try Another
              </PrimaryButton>
            </View>
            <View style={styles.secondaryCtaRow}>
              <Pressable
                style={styles.secondaryCta}
                onPress={() => {
                  if (selectedProduct) handleRecommendationPress(selectedProduct, 'similar_looks');
                  else router.push('/recommendations' as never);
                }}
              >
                <Text style={styles.secondaryCtaText}>Similar Looks</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryCta}
                onPress={() => {
                  analytics.track('shop_link_opened', {
                    tryOnRequestId: requestId,
                    tryOnId: requestId ?? undefined,
                    productId: selectedProduct?.id,
                    source: 'nearby_stores_cta',
                  }).catch(() => {});
                  router.push('/shops' as never);
                }}
              >
                <Text style={styles.secondaryCtaText}>Nearby Stores</Text>
              </Pressable>
            </View>
          </SectionCard>
        ) : null}

        <SectionCard title="Rewards" subtitle="Share looks, invite friends, and unlock student perks.">
          <StudentRewardsSummary
            userId={userId}
            onShareReferral={handleShareReferral}
          />
        </SectionCard>
      </Screen>

      <LoadingOverlay
        visible={isProcessing}
        message="Generating your look..."
        progress={tryOnProgress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.md,
  },
  resultImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: Colors.surface2,
  },
  confidenceBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(15,118,110,0.92)',
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: Spacing.md,
  },
  confidenceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  placeholderIcon: { fontSize: 48 },
  placeholderText: { fontSize: FontSize.sm, color: Colors.textMuted },
  headlineBlock: { gap: Spacing.xs },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  headline: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  subhead: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  scoreRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  scoreCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  scoreUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  scoreCopy: { flex: 1, gap: Spacing.sm },
  fitReason: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  warningWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  warningPill: {
    borderRadius: Radius.full,
    backgroundColor: Colors.successDim,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  warningPillAlert: { backgroundColor: Colors.warningDim },
  warningText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  reasonGrid: { gap: Spacing.sm },
  reasonCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface2,
  },
  reasonLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  reasonDetail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  offerStack: { gap: Spacing.sm },
  offerCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  offerText: { flex: 1, gap: 2 },
  offerLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
  },
  offerTitle: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  offerMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  offerButton: {
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  offerButtonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  offerButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  offerButtonSecondaryText: { color: Colors.primary },
  affiliateDisclosure: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  primaryCtaStack: { gap: Spacing.sm },
  secondaryCtaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  secondaryCta: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryCtaText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
});
