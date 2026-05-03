import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CreditBalanceCard } from '../../components/CreditBalanceCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProductVariantPicker } from '../../components/ProductVariantPicker';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { analytics } from '../../services/analytics';
import { useAppStore } from '../../store/app-store';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';
import type { Product, ProductVariant } from '../../types';

// ─── Permission helpers ────────────────────────────────────────────────────────

async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Camera permission needed',
      'Please allow camera access in your device settings to take photos.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
}

async function requestGalleryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Photo library permission needed',
      'Please allow photo library access to select images.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
}

// ─── Image picker options ──────────────────────────────────────────────────────

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [3, 4],      // portrait crop — best for body silhouette
  quality: 0.85,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export function TryOnUploadScreen() {
  const router = useRouter();

  // Store
  const userId              = useAppStore((s) => s.userId);
  const capturedPhotoUri    = useAppStore((s) => s.capturedPhotoUri);
  const selectedVariant     = useAppStore((s) => s.selectedVariant);
  const selectedProduct     = useAppStore((s) => s.selectedProduct);
  const tryOnStatus         = useAppStore((s) => s.tryOnStatus);
  const tryOnProgress       = useAppStore((s) => s.tryOnProgress);
  const setCapturedPhoto    = useAppStore((s) => s.setCapturedPhoto);
  const selectVariant       = useAppStore((s) => s.selectVariant);
  const setTryOnStatus      = useAppStore((s) => s.setTryOnStatus);
  const setTryOnProgress    = useAppStore((s) => s.setTryOnProgress);
  const setTryOnError       = useAppStore((s) => s.setTryOnError);
  const setLastTryOnRequestId = useAppStore((s) => s.setLastTryOnRequestId);
  const resetTryOn          = useAppStore((s) => s.resetTryOn);

  // Catalog
  const { data: productsData, loading: catalogLoading, error: catalogError } =
    useAsyncResource(() => mobileApi.products({ limit: 20 }), []);
  const products: Product[] = Array.isArray(productsData) ? productsData : [];
  const {
    data: creditBalance,
    loading: creditsLoading,
    error: creditsError,
    refetch: refetchCredits,
  } = useAsyncResource(() => mobileApi.tryOnCredits(userId), [userId]);

  const isSubmitting = tryOnStatus === 'uploading' || tryOnStatus === 'processing';
  const limitReached = creditBalance?.limitReached === true;
  const canSubmit    = !!capturedPhotoUri && !!selectedVariant && !isSubmitting && !limitReached;

  // ── Photo capture ────────────────────────────────────────────────────────────

  const handleCamera = useCallback(async () => {
    const allowed = await requestCameraPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchCameraAsync({
      ...PICKER_OPTIONS,
      // On Android, front camera gives better body framing
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedPhoto(result.assets[0].uri);
    }
  }, [setCapturedPhoto]);

  const handleGallery = useCallback(async () => {
    const allowed = await requestGalleryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

    if (!result.canceled && result.assets[0]) {
      setCapturedPhoto(result.assets[0].uri);
    }
  }, [setCapturedPhoto]);

  // ── Variant selection ────────────────────────────────────────────────────────

  const handleSelectVariant = useCallback(
    (product: Product, variant: ProductVariant) => {
      selectVariant(variant, product);
    },
    [selectVariant]
  );

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!capturedPhotoUri || !selectedVariant) return;
    if (limitReached) {
      Alert.alert(
        'Daily try-on limit reached',
        'You have used today’s free try-on credits. Premium is prepared, but payments are not enabled yet.',
        [
          { text: 'View Premium', onPress: () => router.push('/premium' as never) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    try {
      setTryOnStatus('uploading');
      setTryOnProgress(5);

      // 1. Upload photo + variant — server queues GPU job
      const created = await mobileApi.createTryOn(
        userId,
        selectedVariant.id,
        capturedPhotoUri
      );
      refetchCredits();
      analytics.track('tryon_started', {
        sourceScreen: 'tryon_upload',
        productId: selectedProduct?.id,
        variantId: selectedVariant.id,
        tryOnId: created.id,
        tryOnRequestId: created.id,
      }).catch(() => {});
      setLastTryOnRequestId(created.id);
      setTryOnStatus('processing');
      setTryOnProgress(15);

      // 2. Poll until done (800 ms interval, 30 s max)
      await mobileApi.pollTryOnResult(created.id, (pct) => {
        setTryOnProgress(15 + Math.round(pct * 0.85)); // scale 15→100
      });

      setTryOnStatus('complete');
      router.push('/tryon-result');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      analytics.track('tryon_failed', {
        sourceScreen: 'tryon_upload',
        productId: selectedProduct?.id,
        variantId: selectedVariant?.id,
        errorMessage: message,
        stage: tryOnStatus,
      }).catch(() => {});
      setTryOnError(message);
      setTryOnStatus('error');
      const reachedServerLimit = message.toLowerCase().includes('daily try-on limit');
      Alert.alert(reachedServerLimit ? 'Daily try-on limit reached' : 'Try-on failed', message, [
        reachedServerLimit
          ? { text: 'View Premium', onPress: () => router.push('/premium' as never) }
          : { text: 'Retry', onPress: () => setTryOnStatus('idle') },
        { text: 'Cancel', style: 'cancel', onPress: reachedServerLimit ? undefined : resetTryOn },
      ]);
    }
  }, [
    capturedPhotoUri, selectedVariant, userId, limitReached,
    setTryOnStatus, setTryOnProgress, setTryOnError,
    selectedProduct?.id, tryOnStatus,
    setLastTryOnRequestId, resetTryOn, router, refetchCredits,
  ]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const progressMessage =
    tryOnStatus === 'uploading'   ? 'Uploading your photo…'  :
    tryOnStatus === 'processing'  ? 'Generating your look…'  : '';

  return (
    <>
      <Screen>
        <CreditBalanceCard
          balance={creditBalance}
          loading={creditsLoading}
          error={creditsError}
          compact
          onRetry={refetchCredits}
          onUpgrade={() => router.push('/premium' as never)}
        />

        {/* ── Step 1: Your photo ── */}
        <SectionCard title="Step 1 — Your photo">
          {capturedPhotoUri ? (
            /* Preview + retake */
            <View>
              <Image
                source={{ uri: capturedPhotoUri }}
                style={styles.preview}
                resizeMode="cover"
              />
              <View style={styles.retakeRow}>
                <PrimaryButton
                  variant="secondary"
                  onPress={handleCamera}
                  style={styles.retakeBtn}
                >
                  📷  Retake
                </PrimaryButton>
                <PrimaryButton
                  variant="ghost"
                  onPress={() => setCapturedPhoto(undefined)}
                  style={styles.retakeBtn}
                >
                  Remove
                </PrimaryButton>
              </View>
            </View>
          ) : (
            /* Photo capture options */
            <View style={styles.captureOptions}>
              {/* Primary: camera — prominent for "snap in store" use case */}
              <Pressable
                style={({ pressed }) => [styles.cameraBlock, pressed && styles.cameraBlockPressed]}
                onPress={handleCamera}
              >
                <Text style={styles.cameraIcon}>📷</Text>
                <Text style={styles.cameraTitle}>Take photo</Text>
                <Text style={styles.cameraHint}>
                  Best result — stand in front of a plain background
                </Text>
              </Pressable>

              <Text style={styles.orText}>or</Text>

              <PrimaryButton
                variant="secondary"
                onPress={handleGallery}
              >
                Choose from gallery
              </PrimaryButton>

              <Text style={styles.tipText}>
                💡 Tip: wear fitted clothing and stand with arms slightly away from your body
              </Text>
            </View>
          )}
        </SectionCard>

        {/* ── Step 2: Garment selector ── */}
        <SectionCard title="Step 2 — Choose outfit">
          {catalogLoading ? (
            <Text style={styles.loadingText}>Loading catalogue…</Text>
          ) : catalogError ? (
            <EmptyState
              icon="⚠️"
              title="Couldn't load products"
              subtitle={catalogError}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon="🛍️"
              title="No products available"
              subtitle="Check back soon for new arrivals."
            />
          ) : (
            <ProductVariantPicker
              products={products}
              selectedVariant={selectedVariant}
              selectedProduct={selectedProduct}
              onSelect={handleSelectVariant}
            />
          )}
        </SectionCard>

        {/* ── Step 3: Generate ── */}
        <SectionCard>
          {/* Readiness checklist */}
          <View style={styles.checklist}>
            <CheckItem done={!!capturedPhotoUri} label="Photo added" />
            <CheckItem done={!!selectedVariant}  label="Outfit selected" />
          </View>

          <PrimaryButton
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={isSubmitting}
          >
            {limitReached ? 'Daily limit reached' : isSubmitting ? 'Processing…' : '✨  Generate try-on'}
          </PrimaryButton>

          {tryOnStatus === 'error' && (
            <Text style={styles.errorText}>
              Try-on failed. Tap Generate to retry.
            </Text>
          )}
        </SectionCard>
      </Screen>

      {/* Full-screen overlay while processing */}
      <LoadingOverlay
        visible={isSubmitting}
        message={progressMessage}
        progress={tryOnProgress}
      />
    </>
  );
}

// ─── Check item ───────────────────────────────────────────────────────────────

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.checkRow}>
      <View style={[styles.checkDot, done && styles.checkDotDone]}>
        <Text style={styles.checkDotText}>{done ? '✓' : ''}</Text>
      </View>
      <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Photo preview
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
  },
  retakeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  retakeBtn: { flex: 1 },

  // Capture options
  captureOptions: { gap: Spacing.md },
  cameraBlock: {
    backgroundColor: Colors.primaryDim,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    ...Shadow.sm,
  },
  cameraBlockPressed: { opacity: 0.75 },
  cameraIcon:  { fontSize: 36 },
  cameraTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  cameraHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  orText: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  tipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  // Checklist
  checklist: { gap: Spacing.sm, marginBottom: Spacing.md },
  checkRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkDotText: { fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold },
  checkLabel:     { fontSize: FontSize.sm, color: Colors.textMuted },
  checkLabelDone: { color: Colors.textPrimary, fontWeight: FontWeight.medium },

  errorText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    textAlign: 'center',
  },
});
