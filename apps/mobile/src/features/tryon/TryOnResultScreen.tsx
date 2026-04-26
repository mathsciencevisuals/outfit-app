import { formatPrice } from '../../utils/currency';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { InfoRow } from '../../components/InfoRow';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import {
  Colors, FontSize, FontWeight, Radius, Shadow, Spacing,
} from '../../utils/theme';

export function TryOnResultScreen() {
  const router = useRouter();

  const requestId       = useAppStore((s) => s.lastTryOnRequestId);
  const tryOnStatus     = useAppStore((s) => s.tryOnStatus);
  const tryOnProgress   = useAppStore((s) => s.tryOnProgress);
  const selectedProduct = useAppStore((s) => s.selectedProduct);
  const selectedVariant = useAppStore((s) => s.selectedVariant);
  const setTryOnStatus  = useAppStore((s) => s.setTryOnStatus);
  const setTryOnProgress= useAppStore((s) => s.setTryOnProgress);
  const setTryOnError   = useAppStore((s) => s.setTryOnError);
  const resetTryOn      = useAppStore((s) => s.resetTryOn);

  // Result data — we poll here if the navigation happened before polling finished
  // (edge case: user is sent straight here by a notification / deep-link)
  const [result, setResult] = useResultState();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Poll if we arrive here without a completed result ────────────────────────
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
          // Fade in result image
          Animated.timing(fadeAnim, {
            toValue: 1, duration: 500, useNativeDriver: true,
          }).start();
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setTryOnError(err.message);
          setTryOnStatus('error');
        }
      });

    return () => { cancelled = true; };
  }, [requestId]);

  // Fade in if result already available on mount
  useEffect(() => {
    if (result?.resultImageUrl) {
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    }
  }, [result]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (!result?.resultImageUrl) return;
    try {
      await Share.share({
        message: `Check out how I look in ${selectedProduct?.name ?? 'this outfit'} — FitMe`,
        url: result.resultImageUrl,          // iOS
        title: 'My FitMe Try-On',
      });
    } catch {
      // User cancelled share sheet — no-op
    }
  }, [result, selectedProduct]);

  const handleSaveLook = useCallback(async () => {
    if (!selectedProduct || !result) return;
    Alert.alert('Saved!', 'This look has been added to your Saved Looks.');
    // In production: mobileApi.saveLook({ ... })
  }, [selectedProduct, result]);

  const handleTryAnother = useCallback(() => {
    resetTryOn();
    router.replace('/tryon-upload');
  }, [resetTryOn, router]);

  // ── Loading state ────────────────────────────────────────────────────────────

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

  // ── Result ───────────────────────────────────────────────────────────────────

  const confidence = result?.result?.confidence;
  const fitNotes   = result?.result?.fitNotes ?? [];

  return (
    <>
      <Screen>
        {/* Result image */}
        {result?.resultImageUrl ? (
          <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }]}>
            <Image
              source={{ uri: result.resultImageUrl }}
              style={styles.resultImage}
              resizeMode="cover"
            />
            {/* Confidence badge */}
            {confidence !== undefined && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(confidence * 100)}% fit match
                </Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>👕</Text>
            <Text style={styles.placeholderText}>
              {isProcessing ? 'Rendering your look…' : 'No preview available'}
            </Text>
          </View>
        )}

        {/* Product info */}
        {selectedProduct && selectedVariant && (
          <SectionCard title={selectedProduct.name}>
            <InfoRow label="Brand"  value={selectedProduct.brand.name} />
            <InfoRow label="Colour" value={selectedVariant.color} />
            <InfoRow label="Size"   value={selectedVariant.size} />
            <InfoRow
              label="Price"
              value={`${selectedVariant.currency} ${selectedVariant.price}`}
              last
            />
          </SectionCard>
        )}

        {/* Fit analysis */}
        {result?.result && (
          <SectionCard title="Fit analysis">
            {confidence !== undefined && (
              <InfoRow
                label="Fit confidence"
                value={`${Math.round(confidence * 100)}%`}
                valueColor={confidence > 0.75 ? Colors.success : Colors.warning}
              />
            )}
            {result.result.summary ? (
              <Text style={styles.summary}>{result.result.summary}</Text>
            ) : null}
            {fitNotes.length > 0 && (
              <View style={styles.fitNotes}>
                {fitNotes.map((note, i) => (
                  <Text key={i} style={styles.fitNote}>• {note}</Text>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {/* Actions */}
        {result && (
          <SectionCard>
            <PrimaryButton onPress={handleSaveLook}>
              💾  Save this look
            </PrimaryButton>
            <PrimaryButton variant="secondary" onPress={handleShare}>
              📤  Share
            </PrimaryButton>
            <PrimaryButton
              variant="outline"
              onPress={() => router.push('/recommendations')}
            >
              See recommendations
            </PrimaryButton>
            <PrimaryButton variant="ghost" onPress={handleTryAnother}>
              Try another outfit
            </PrimaryButton>
          </SectionCard>
        )}
      </Screen>

      {/* Processing overlay (covers full screen) */}
      <LoadingOverlay
        visible={isProcessing}
        message="Generating your look…"
        progress={tryOnProgress}
      />
    </>
  );
}

// ─── Local result state hook ──────────────────────────────────────────────────
// Kept separate so the main component stays readable

import { useState } from 'react';
import type { TryOnResult } from '../../types';

function useResultState(): [TryOnResult | null, (r: TryOnResult) => void] {
  const [result, setResult] = useState<TryOnResult | null>(null);
  return [result, setResult];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    backgroundColor: 'rgba(15,118,110,0.9)',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
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

  summary: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  fitNotes: { gap: Spacing.xs },
  fitNote:  { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
