import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, GestureResponderEvent, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import { mobileApi } from '../services/api';
import { analytics } from '../services/analytics';
import { useAppStore } from '../store/app-store';
import { FontSize, FontWeight, Radius, Spacing } from '../utils/theme';
import type { Product, SavedLook } from '../types';

type SaveLookButtonMode = 'icon' | 'pill' | 'full';

interface SaveLookButtonProps {
  product?: Product | null;
  generatedImageUrl?: string | null;
  tryOnResultId?: string | null;
  fitScore?: number | null;
  stylistNote?: string | null;
  sourceScreen: string;
  note?: string;
  metadata?: Record<string, unknown>;
  mode?: SaveLookButtonMode;
  disabled?: boolean;
  style?: ViewStyle;
  onSaved?: (look: SavedLook) => void | Promise<void>;
  onUnsaved?: (lookId: string) => void | Promise<void>;
}

function productsForLook(look: SavedLook): Product[] {
  const directProducts = look.products ?? [];
  const itemProducts = look.items?.map((item) => item.product).filter(Boolean) as Product[] | undefined;
  return directProducts.length > 0 ? directProducts : itemProducts ?? [];
}

function productIdsForLook(look: SavedLook): string[] {
  return productsForLook(look).map((product) => product.id).sort();
}

function sameProductSet(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function productPreviewImage(product?: Product | null) {
  return product?.imageUrl ?? product?.variants?.[0]?.imageUrl ?? null;
}

export function SaveLookButton({
  product,
  generatedImageUrl,
  tryOnResultId,
  fitScore,
  stylistNote,
  sourceScreen,
  note,
  metadata,
  mode = 'icon',
  disabled = false,
  style,
  onSaved,
  onUnsaved,
}: SaveLookButtonProps) {
  const { C } = useTheme();
  const userId = useAppStore((state) => state.userId);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewImageUrl = generatedImageUrl ?? productPreviewImage(product);
  const productIds = useMemo(() => (product ? [product.id] : []).sort(), [product]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    mobileApi.savedLooks(userId)
      .then((looks) => {
        if (active) setSavedLooks(Array.isArray(looks) ? looks : []);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [userId]);

  const matchingLook = useMemo(() => {
    return savedLooks.find((look) => {
      const lookImage = look.tryOnImageUrl ?? null;
      const imageMatches = previewImageUrl ? lookImage === previewImageUrl : !lookImage;
      return imageMatches && sameProductSet(productIdsForLook(look), productIds);
    }) ?? null;
  }, [previewImageUrl, productIds, savedLooks]);

  const isSaved = !!matchingLook;
  const isDisabled = disabled || busy || loading || (!previewImageUrl && productIds.length === 0);

  const track = (eventName: 'look_saved' | 'look_unsaved', lookId: string) => {
    analytics.track(eventName, {
      lookId,
      productId: product?.id,
      generatedImageUrl: previewImageUrl,
      sourceScreen,
    }).catch(() => {});
  };

  const handleSave = async (event?: GestureResponderEvent) => {
    event?.stopPropagation();
    if (isDisabled) return;
    if (error) {
      Alert.alert('Saved looks unavailable', error);
      return;
    }

    setBusy(true);
    try {
      if (matchingLook) {
        await mobileApi.deleteSavedLook(matchingLook.id);
        setSavedLooks((looks) => looks.filter((look) => look.id !== matchingLook.id));
        track('look_unsaved', matchingLook.id);
        await onUnsaved?.(matchingLook.id);
        return;
      }

      const savedAt = new Date().toISOString();
      const savedLook = await mobileApi.saveLook({
        userId,
        name: product?.name ?? 'Generated try-on look',
        note,
        tryOnResultId: tryOnResultId ?? undefined,
        tryOnImageUrl: previewImageUrl ?? undefined,
        sourceScreen,
        fitScore: fitScore ?? undefined,
        stylistNote: stylistNote ?? undefined,
        metadata: {
          ...(metadata ?? {}),
          sourceScreen,
          savedAt,
          product: product ? {
            id: product.id,
            name: product.name,
            category: product.category,
            brand: product.brand?.name,
            baseColor: product.baseColor,
          } : undefined,
          garment: product ? undefined : {
            imageUrl: previewImageUrl,
            name: 'Uploaded garment',
          },
        },
        products: product ? [product] : [],
      });
      setSavedLooks((looks) => [savedLook, ...looks.filter((look) => look.id !== savedLook.id)]);
      track('look_saved', savedLook.id);
      await onSaved?.(savedLook);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const iconName = isSaved ? 'heart' : 'heart-outline';
  const iconColor = isSaved ? '#ef4444' : mode === 'icon' ? C.textSecondary : '#fff';

  if (mode === 'icon') {
    return (
      <Pressable
        style={[styles.iconButton, { backgroundColor: C.surface + 'ee' }, style]}
        onPress={handleSave}
        disabled={isDisabled}
        accessibilityLabel={isSaved ? 'Remove saved look' : 'Save look'}
      >
        {busy || loading ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : (
          <Ionicons name={iconName} size={18} color={iconColor} />
        )}
      </Pressable>
    );
  }

  const label = isSaved ? 'Saved' : 'Save Look';

  return (
    <Pressable
      style={[
        mode === 'full' ? styles.fullButton : styles.pillButton,
        { backgroundColor: isSaved ? C.success : C.primary, opacity: isDisabled ? 0.55 : 1 },
        style,
      ]}
      onPress={handleSave}
      disabled={isDisabled}
      accessibilityLabel={isSaved ? 'Remove saved look' : 'Save look'}
    >
      {busy || loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name={isSaved ? 'checkmark-circle' : 'heart'} size={mode === 'full' ? 16 : 14} color="#fff" />
          <Text style={styles.buttonText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButton: {
    minHeight: 36,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fullButton: {
    minHeight: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
