import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, FlatList, Image, Modal, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';

import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Toast } from '../../components/Toast';
import { useTheme } from '../../hooks/useTheme';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';
import { formatPrice } from '../../utils/currency';
import type { Product, ProductVariant, ViewAngle } from '../../types';
import { VIEW_ANGLE_LABELS } from '../../types';

const CATEGORIES = ['All', 'Tops', 'Dresses', 'Outerwear', 'Bottoms'] as const;
const MAX_COMPARE = 3;
const ALL_ANGLES: ViewAngle[] = ['front', 'back', 'side_left', 'side_right'];
const SAVE_DIR = `${FileSystem.documentDirectory}FitMe Generated/`;

async function ensureSaveDir() {
  const info = await FileSystem.getInfoAsync(SAVE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SAVE_DIR, { intermediates: true });
  }
}

async function saveImageToDevice(url: string, label: string): Promise<string> {
  await ensureSaveDir();
  const filename = `fitme_${label}_${Date.now()}.jpg`;
  const dest = SAVE_DIR + filename;
  await FileSystem.downloadAsync(url, dest);
  return dest;
}

export function TryMeScreen() {
  const { C } = useTheme();
  const userId         = useAppStore(s => s.userId);
  const compareIds     = useAppStore(s => s.compareProductIds);
  const addToCompare   = useAppStore(s => s.addToCompare);
  const removeCompare  = useAppStore(s => s.removeFromCompare);
  const setLastTryOnId = useAppStore(s => s.setLastTryOnRequestId);
  const setLocalSavedLookPreview = useAppStore(s => s.setLocalSavedLookPreview);

  // ── Try-on state ─────────────────────────────────────────────────────────────
  const [userPhoto,      setUserPhoto]      = useState<string | null>(null);
  const [photoWarning,   setPhotoWarning]   = useState<string | null>(null);
  const [garmentUri,     setGarmentUri]     = useState<string | null>(null);
  const [garmentProduct, setGarmentProduct] = useState<Product | null>(null);
  const [garmentVariant, setGarmentVariant] = useState<ProductVariant | null>(null);
  const [generating,     setGenerating]     = useState(false);
  const [genProgress,    setGenProgress]    = useState(0);
  const [generatedViews, setGeneratedViews] = useState<Partial<Record<ViewAngle, string>>>({});
  const [primaryUrl,     setPrimaryUrl]     = useState<string | null>(null);
  const [fitInsight,     setFitInsight]     = useState<TryOnFitInsight | null>(null);
  const [activeView,     setActiveView]     = useState<ViewAngle>('front');
  const [requestId,      setRequestId]      = useState<string | null>(null);
  const [savingLook,     setSavingLook]     = useState(false);
  const [lookSaved,      setLookSaved]      = useState(false);
  const [savedCount,     setSavedCount]     = useState(0);
  const [savingToDevice, setSavingToDevice] = useState(false);

  // ── View angle selection ─────────────────────────────────────────────────────
  const [selectedAngles, setSelectedAngles] = useState<Set<ViewAngle>>(new Set(['front']));

  // ── Products & compare ───────────────────────────────────────────────────────
  const [products,  setProducts]  = useState<Product[]>([]);
  const [category,  setCategory]  = useState('All');
  const [showPicker, setShowPicker] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const [toast,    setToast]    = useState('');
  const [toastVis, setToastVis] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    mobileApi.products().then(setProducts).catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setToastVis(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVis(false), 2500);
  };

  // ── User photo ───────────────────────────────────────────────────────────────
  const handleUserCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [3, 4], quality: 0.85,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setUserPhoto(asset.uri);
      setPhotoWarning(validateBodyFraming(asset.width, asset.height));
      resetResult();
    }
  };

  const handleUserGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Gallery permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [3, 4], quality: 0.85,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setUserPhoto(asset.uri);
      setPhotoWarning(validateBodyFraming(asset.width, asset.height));
      resetResult();
    }
  };

  // ── Garment ──────────────────────────────────────────────────────────────────
  const handleGarmentGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Gallery permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85,
    });
    if (!result.canceled) {
      setGarmentUri(result.assets[0].uri);
      setGarmentProduct(null);
      setGarmentVariant(null);
      resetResult();
    }
  };

  const handleGarmentScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
    if (!result.canceled) {
      setGarmentUri(result.assets[0].uri);
      setGarmentProduct(null);
      setGarmentVariant(null);
      resetResult();
    }
  };

  const handleSelectFromStore = (product: Product) => {
    const variant = product.variants.find(v => v.inStock) ?? product.variants[0];
    setGarmentProduct(product);
    setGarmentVariant(variant ?? null);
    setGarmentUri(null);
    setShowPicker(false);
    resetResult();
  };

  const clearGarment = () => {
    setGarmentUri(null); setGarmentProduct(null); setGarmentVariant(null);
    resetResult();
  };

  const resetResult = () => {
    setGeneratedViews({}); setPrimaryUrl(null); setFitInsight(null); setLookSaved(false); setSavedCount(0);
  };

  // ── View angle toggle ─────────────────────────────────────────────────────────
  const toggleAngle = (angle: ViewAngle) => {
    setSelectedAngles(prev => {
      const next = new Set(prev);
      if (next.has(angle)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(angle);
      } else {
        next.add(angle);
      }
      return next;
    });
  };

  // ── Generate ──────────────────────────────────────────────────────────────────
  const canGenerate = !!userPhoto && (!!garmentVariant || !!garmentUri) && !generating && selectedAngles.size > 0;

  const handleGenerate = async () => {
    if (!userPhoto) return;
    if (!garmentVariant && !garmentUri) return;
    if (photoWarning) {
      Alert.alert('Use a full-body photo', photoWarning);
      return;
    }

    setGenerating(true); setGenProgress(5); resetResult();

    try {
      const angles = Array.from(selectedAngles);
      const created = await mobileApi.createTryOn(userId, garmentVariant?.id, userPhoto, {
        viewAngles: angles,
        garmentPhotoUri: garmentUri ?? undefined,
      });
      setRequestId(created.id); setLastTryOnId(created.id); setGenProgress(15);

      const result = await mobileApi.pollTryOnResult(created.id, pct => {
        setGenProgress(15 + Math.round(pct * 0.85));
      });

      const views = result.result?.metadata?.views ?? {};
      const primary = result.result?.outputImageUrl ?? null;
      setGeneratedViews(views);
      setPrimaryUrl(primary);
      setFitInsight(buildFitInsight(result.result?.metadata, result.result?.summary));

      // Set active view to first generated angle
      const firstAngle = angles.find(a => views[a] || a === angles[0]);
      if (firstAngle) setActiveView(firstAngle);
    } catch (err) {
      Alert.alert('Generation failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setGenerating(false); setGenProgress(0);
    }
  };

  // ── Save look ─────────────────────────────────────────────────────────────────
  const handleSaveLook = async () => {
    if (!primaryUrl) return;
    setSavingLook(true);
    try {
      const savedLook = await mobileApi.saveLook({
        userId,
        name: garmentProduct?.name ?? 'Uploaded garment try-on',
        note: garmentProduct ? undefined : 'Saved from an uploaded garment try-on.',
        tryOnResultId: requestId ?? undefined,
        products: garmentProduct ? [garmentProduct] : [],
      });
      const localUri = await saveImageToDevice(primaryUrl, `saved_${savedLook.id}`);
      setLocalSavedLookPreview({
        lookId: savedLook.id,
        userId,
        imageUri: localUri,
        createdAt: new Date().toISOString(),
      });
      setLookSaved(true);
      showToast('Look saved!');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingLook(false);
    }
  };

  // ── Save to device ────────────────────────────────────────────────────────────
  const handleSaveToDevice = async () => {
    const allUrls = Object.entries(generatedViews) as [ViewAngle, string][];
    if (!allUrls.length && primaryUrl) allUrls.push(['front', primaryUrl]);
    if (!allUrls.length) return;

    setSavingToDevice(true);
    try {
      let count = 0;
      for (const [angle, url] of allUrls) {
        await saveImageToDevice(url, angle);
        count++;
      }
      setSavedCount(count);
      showToast(`${count} image${count > 1 ? 's' : ''} saved to device`);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Could not save to device.');
    } finally {
      setSavingToDevice(false);
    }
  };

  // ── Compare ───────────────────────────────────────────────────────────────────
  const handleCompare = (product: Product) => {
    if (compareIds.includes(product.id)) {
      removeCompare(product.id);
      showToast('Removed from compare');
    } else if (compareIds.length >= MAX_COMPARE) {
      showToast(`Maximum ${MAX_COMPARE} items`);
    } else {
      addToCompare(product.id);
      showToast('Added to compare');
    }
  };

  const compareProducts = products.filter(p => compareIds.includes(p.id));
  const filtered = category === 'All'
    ? products
    : products.filter(p => p.category.toLowerCase() === category.toLowerCase());

  const garmentDisplayUri = garmentUri ?? garmentProduct?.variants[0]?.imageUrl ?? null;
  const hasResult = !!primaryUrl || Object.keys(generatedViews).length > 0;
  const displayedAngles = Array.from(selectedAngles).filter(a => generatedViews[a]);

  const activeImageUrl = generatedViews[activeView] ?? primaryUrl ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.title, { color: C.textPrimary }]}>Try Me</Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>AI try-on · See how clothes look on you</Text>

        {/* ── Two-card row ── */}
        <View style={styles.cardRow}>
          {/* User photo card */}
          <View style={[styles.uploadCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.cardLabel, { color: C.textSecondary }]}>Your Photo</Text>
            {userPhoto ? (
              <>
                <Image source={{ uri: userPhoto }} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.cardBtns}>
                  <Pressable style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]} onPress={handleUserCamera}>
                    <Ionicons name="camera-outline" size={14} color={C.textSecondary} />
                  </Pressable>
                  <Pressable style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]} onPress={handleUserGallery}>
                    <Ionicons name="images-outline" size={14} color={C.textSecondary} />
                  </Pressable>
                  <Pressable style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]} onPress={() => { setUserPhoto(null); setPhotoWarning(null); resetResult(); }}>
                    <Ionicons name="close" size={14} color={C.textMuted} />
                  </Pressable>
                </View>
                {photoWarning && (
                  <View style={[styles.warningShell, { backgroundColor: C.warningDim, borderColor: C.warning }]}>
                    <Ionicons name="body-outline" size={14} color={C.warning} />
                    <Text style={[styles.warningText, { color: C.textPrimary }]}>{photoWarning}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={[styles.cardPlaceholder, { backgroundColor: C.surface2 }]}>
                  <Text style={styles.placeholderEmoji}>🧍</Text>
                  <Text style={[styles.placeholderTxt, { color: C.textMuted }]}>Add photo</Text>
                </View>
                <View style={styles.cardBtns}>
                  <Pressable style={[styles.sourceBtn, { backgroundColor: C.primary }]} onPress={handleUserCamera}>
                    <Ionicons name="camera" size={12} color="#fff" />
                    <Text style={styles.sourceTxt}>Camera</Text>
                  </Pressable>
                  <Pressable style={[styles.sourceBtn, { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border }]} onPress={handleUserGallery}>
                    <Ionicons name="images" size={12} color={C.textSecondary} />
                    <Text style={[styles.sourceTxt, { color: C.textSecondary }]}>Gallery</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {/* Garment card */}
          <View style={[styles.uploadCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.cardLabel, { color: C.textSecondary }]}>Garment</Text>
            {garmentDisplayUri ? (
              <>
                <Image source={{ uri: garmentDisplayUri }} style={styles.cardImage} resizeMode="cover" />
                {garmentProduct && (
                  <Text style={[styles.garmentName, { color: C.textSecondary }]} numberOfLines={1}>
                    {garmentProduct.name}
                  </Text>
                )}
                <View style={styles.cardBtns}>
                  <Pressable style={[styles.sourceBtn, { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border }]} onPress={() => setShowPicker(true)}>
                    <Ionicons name="storefront-outline" size={12} color={C.textSecondary} />
                    <Text style={[styles.sourceTxt, { color: C.textSecondary }]}>Change</Text>
                  </Pressable>
                  <Pressable style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]} onPress={clearGarment}>
                    <Ionicons name="close" size={14} color={C.textMuted} />
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.cardPlaceholder, { backgroundColor: C.surface2 }]}>
                  <Text style={styles.placeholderEmoji}>👕</Text>
                  <Text style={[styles.placeholderTxt, { color: C.textMuted }]}>Add garment</Text>
                </View>
                <View style={styles.cardBtns}>
                  <Pressable style={[styles.sourceBtn, { backgroundColor: C.primary }]} onPress={() => setShowPicker(true)}>
                    <Ionicons name="storefront" size={12} color="#fff" />
                    <Text style={styles.sourceTxt}>Store</Text>
                  </Pressable>
                  <Pressable style={[styles.sourceBtn, { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border }]} onPress={handleGarmentGallery}>
                    <Ionicons name="images" size={12} color={C.textSecondary} />
                    <Text style={[styles.sourceTxt, { color: C.textSecondary }]}>Gallery</Text>
                  </Pressable>
                  <Pressable style={[styles.sourceBtn, { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border }]} onPress={handleGarmentScan}>
                    <Ionicons name="scan" size={12} color={C.textSecondary} />
                    <Text style={[styles.sourceTxt, { color: C.textSecondary }]}>Scan</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Gallery garment tip */}
        {garmentUri && !garmentVariant && (
          <Text style={[styles.noteText, { color: C.textMuted }]}>
            Your uploaded garment image will be used directly for the try-on result.
          </Text>
        )}

        {/* ── View angle selector ── */}
        <View style={[styles.angleSection, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.angleTitle, { color: C.textPrimary }]}>Generate Views</Text>
          <View style={styles.angleRow}>
            {ALL_ANGLES.map(angle => {
              const active = selectedAngles.has(angle);
              return (
                <Pressable
                  key={angle}
                  style={[styles.angleChip, {
                    backgroundColor: active ? C.primary : C.surface2,
                    borderColor: active ? C.primary : C.border,
                  }]}
                  onPress={() => toggleAngle(angle)}
                >
                  <Text style={[styles.angleChipTxt, { color: active ? '#fff' : C.textSecondary }]}>
                    {VIEW_ANGLE_LABELS[angle]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Generate button */}
        <Pressable
          style={[styles.generateBtn, { backgroundColor: canGenerate ? C.primary : C.surface3 }]}
          onPress={handleGenerate}
          disabled={!canGenerate}
        >
          <Ionicons name="sparkles" size={18} color={canGenerate ? '#fff' : C.textMuted} />
          <Text style={[styles.generateTxt, { color: canGenerate ? '#fff' : C.textMuted }]}>
            Generate {selectedAngles.size > 1 ? `${selectedAngles.size} Views` : 'Try-On'}
          </Text>
        </Pressable>

        {/* Generated result */}
        {hasResult && (
          <View style={[styles.resultCard, { backgroundColor: C.surface, borderColor: C.border }, Shadow.md]}>
            <Text style={[styles.resultTitle, { color: C.textPrimary }]}>Your Generated Look</Text>

            {/* View tabs */}
            {displayedAngles.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.viewTabs}>
                {displayedAngles.map(angle => (
                  <Pressable
                    key={angle}
                    style={[styles.viewTab, {
                      backgroundColor: activeView === angle ? C.primary : C.surface2,
                      borderColor: activeView === angle ? C.primary : C.border,
                    }]}
                    onPress={() => setActiveView(angle)}
                  >
                    <Text style={[styles.viewTabTxt, { color: activeView === angle ? '#fff' : C.textSecondary }]}>
                      {VIEW_ANGLE_LABELS[angle]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* Active view image */}
            {activeImageUrl && (
              <View style={styles.resultImageWrap}>
                <Image source={{ uri: activeImageUrl }} style={styles.resultImage} resizeMode="cover" />
                <Pressable
                  style={[
                    styles.imageSaveBtn,
                    { backgroundColor: lookSaved ? C.success : C.primary },
                  ]}
                  onPress={handleSaveLook}
                  disabled={savingLook || lookSaved}
                >
                  <Ionicons name={lookSaved ? 'checkmark' : 'bookmark'} size={18} color="#fff" />
                </Pressable>
              </View>
            )}

            {fitInsight && (
              <View style={[styles.fitInsightCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <View style={styles.fitInsightTop}>
                  <Text style={[styles.fitInsightTitle, { color: C.textPrimary }]}>Fit notes</Text>
                  {fitInsight.fitScore ? (
                    <Text style={[styles.fitScore, { color: C.primary }]}>{fitInsight.fitScore}/100</Text>
                  ) : null}
                </View>
                <View style={styles.fitPillRow}>
                  {fitInsight.sizeRecommendation ? (
                    <View style={[styles.fitPill, { backgroundColor: C.primaryDim }]}>
                      <Text style={[styles.fitPillText, { color: C.primary }]}>Size {fitInsight.sizeRecommendation}</Text>
                    </View>
                  ) : null}
                  {fitInsight.colourMatch ? (
                    <View style={[styles.fitPill, { backgroundColor: C.warningDim }]}>
                      <Text style={[styles.fitPillText, { color: C.warning }]}>{fitInsight.colourMatch} color</Text>
                    </View>
                  ) : null}
                  {fitInsight.occasion ? (
                    <View style={[styles.fitPill, { backgroundColor: C.successDim }]}>
                      <Text style={[styles.fitPillText, { color: C.success }]}>{fitInsight.occasion}</Text>
                    </View>
                  ) : null}
                </View>
                {fitInsight.styleNotes ? (
                  <Text style={[styles.fitInsightText, { color: C.textSecondary }]}>{fitInsight.styleNotes}</Text>
                ) : null}
                {fitInsight.stylistNote ? (
                  <Text style={[styles.stylistNote, { color: C.textPrimary }]}>{fitInsight.stylistNote}</Text>
                ) : null}
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.resultActions}>
              {/* Save to device */}
              {savedCount > 0 ? (
                <View style={[styles.savedBadge, { backgroundColor: C.successDim, flex: 1 }]}>
                  <Ionicons name="folder-open" size={14} color={C.success} />
                  <Text style={[styles.savedTxt, { color: C.success }]}>
                    {savedCount} image{savedCount > 1 ? 's' : ''} saved to device
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1, flex: 1 }]}
                  onPress={handleSaveToDevice}
                  disabled={savingToDevice}
                >
                  <Ionicons name="download-outline" size={14} color={C.textSecondary} />
                  <Text style={[styles.actionBtnTxt, { color: C.textSecondary }]}>
                    {savingToDevice ? 'Saving…' : `Save to Device`}
                  </Text>
                </Pressable>
              )}

              {/* Save look */}
              {lookSaved ? (
                <View style={[styles.savedBadge, { backgroundColor: C.successDim, flex: 1 }]}>
                  <Ionicons name="checkmark-circle" size={14} color={C.success} />
                  <Text style={[styles.savedTxt, { color: C.success }]}>Saved to looks</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: C.primary, flex: 1 }]}
                  onPress={handleSaveLook}
                  disabled={savingLook}
                >
                  <Ionicons name="bookmark" size={14} color="#fff" />
                  <Text style={styles.actionBtnTxt}>{savingLook ? 'Saving…' : 'Save Look'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ── Compare section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Compare outfits</Text>
          <Text style={[styles.sectionSub, { color: C.textSecondary }]}>
            Add up to {MAX_COMPARE} items
          </Text>
        </View>

        {/* Compare slots */}
        <View style={styles.slotsRow}>
          {[0, 1, 2].map((i) => {
            const p = compareProducts[i];
            return p ? (
              <View key={p.id} style={[styles.slot, styles.slotFilled, { backgroundColor: C.surface, borderColor: C.primary }, Shadow.sm]}>
                <Image
                  source={{ uri: p.variants[0]?.imageUrl ?? `https://picsum.photos/seed/${p.id}/200/267` }}
                  style={styles.slotImage} resizeMode="cover"
                />
                <Pressable style={styles.slotRemove} onPress={() => removeCompare(p.id)}>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
                <View style={styles.slotInfo}>
                  <Text style={[styles.slotName, { color: C.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.slotPrice, { color: C.primary }]}>{formatPrice(p.variants[0]?.price ?? 0)}</Text>
                </View>
              </View>
            ) : (
              <View key={`empty-${i}`} style={[styles.slot, styles.slotEmpty, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Ionicons name="add-circle-outline" size={28} color={C.textMuted} />
                <Text style={[styles.slotEmptyTxt, { color: C.textSecondary }]}>Add item</Text>
              </View>
            );
          })}
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, { backgroundColor: category === cat ? C.primary : C.surface2, borderColor: category === cat ? C.primary : C.border }]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipTxt, { color: category === cat ? '#fff' : C.textSecondary }]}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Product grid */}
        <Text style={[styles.gridTitle, { color: C.textPrimary }]}>
          Browse &amp; Add  <Text style={{ color: C.textMuted }}>({compareIds.length}/{MAX_COMPARE})</Text>
        </Text>
        <View style={styles.grid}>
          {filtered.map((p) => {
            const selected = compareIds.includes(p.id);
            return (
              <Pressable
                key={p.id}
                style={[styles.gridCell, { backgroundColor: C.surface, borderColor: selected ? C.primary : C.border, borderWidth: selected ? 2 : 1 }, Shadow.sm]}
                onPress={() => handleCompare(p)}
              >
                <Image
                  source={{ uri: p.variants[0]?.imageUrl ?? `https://picsum.photos/seed/${p.id}/200/267` }}
                  style={styles.gridImg} resizeMode="cover"
                />
                <View style={styles.gridInfo}>
                  <Text style={[styles.gridName, { color: C.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.gridPrice, { color: C.primary }]}>{formatPrice(p.variants[0]?.price ?? 0)}</Text>
                  <View style={[styles.comparePill, { backgroundColor: selected ? C.primary : C.surface2 }]}>
                    <Ionicons name={selected ? 'checkmark' : 'add'} size={11} color={selected ? '#fff' : C.textSecondary} />
                    <Text style={[styles.pillTxt, { color: selected ? '#fff' : C.textSecondary }]}>
                      {selected ? 'Added' : 'Compare'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Store garment picker modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={[styles.modal, { backgroundColor: C.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Choose Garment</Text>
            <Pressable onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={products}
            keyExtractor={p => p.id}
            contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}
            renderItem={({ item: p }) => (
              <Pressable
                style={[styles.pickerRow, { backgroundColor: C.surface, borderColor: C.border }, Shadow.sm]}
                onPress={() => handleSelectFromStore(p)}
              >
                <Image
                  source={{ uri: p.variants[0]?.imageUrl ?? `https://picsum.photos/seed/${p.id}/80/107` }}
                  style={styles.pickerImg} resizeMode="cover"
                />
                <View style={styles.pickerInfo}>
                  <Text style={[styles.pickerName, { color: C.textPrimary }]}>{p.name}</Text>
                  <Text style={[styles.pickerBrand, { color: C.textSecondary }]}>{p.brand.name}</Text>
                  <Text style={[styles.pickerPrice, { color: C.primary }]}>{formatPrice(p.variants[0]?.price ?? 0)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <LoadingOverlay visible={generating} message="Generating your try-on…" progress={genProgress} />
      <Toast message={toast} visible={toastVis} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { padding: Spacing.base, gap: Spacing.md },
  title:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  sub:        { fontSize: FontSize.sm, marginTop: -Spacing.xs },

  // Two-card row
  cardRow:    { flexDirection: 'row', gap: Spacing.sm },
  uploadCard: { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.sm, gap: Spacing.sm, overflow: 'hidden' },
  cardLabel:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardImage:  { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md },
  warningShell: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm },
  warningText: { flex: 1, fontSize: FontSize.xs, lineHeight: 16 },
  cardPlaceholder: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  placeholderEmoji: { fontSize: 28 },
  placeholderTxt:   { fontSize: 11, textAlign: 'center' },
  garmentName:      { fontSize: 11, textAlign: 'center' },
  cardBtns:   { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  iconBtn:    { width: 28, height: 28, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sourceBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 2, borderRadius: Radius.sm },
  sourceTxt:  { color: '#fff', fontSize: 10, fontWeight: FontWeight.semibold },

  noteText:   { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },

  // View angle selector
  angleSection: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.sm, gap: Spacing.xs },
  angleTitle:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  angleRow:     { flexDirection: 'row', gap: Spacing.xs },
  angleChip:    { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.sm, borderWidth: 1 },
  angleChipTxt: { fontSize: 11, fontWeight: FontWeight.semibold },

  // Generate button
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: Radius.full },
  generateTxt: { fontSize: FontSize.base, fontWeight: FontWeight.bold },

  // Result
  resultCard:    { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', padding: Spacing.sm, gap: Spacing.sm },
  resultTitle:   { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  resultImageWrap: { position: 'relative' },
  resultImage:   { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md },
  imageSaveBtn:  { position: 'absolute', top: 10, right: 10, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  fitInsightCard: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, gap: Spacing.xs },
  fitInsightTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fitInsightTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  fitScore: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  fitPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  fitPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  fitPillText: { fontSize: 10, fontWeight: FontWeight.bold },
  fitInsightText: { fontSize: FontSize.xs, lineHeight: 17 },
  stylistNote: { fontSize: FontSize.xs, lineHeight: 17, fontWeight: FontWeight.medium },
  viewTabs:      { flexDirection: 'row' as any },
  viewTab:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, marginRight: 6, borderWidth: 1 },
  viewTabTxt:    { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  resultActions: { flexDirection: 'row', gap: Spacing.xs },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: Radius.full },
  actionBtnTxt:  { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  savedBadge:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 10, borderRadius: Radius.full },
  savedTxt:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  // Compare section
  sectionHeader: { gap: 2 },
  sectionTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sectionSub:    { fontSize: FontSize.xs },
  slotsRow:      { flexDirection: 'row', gap: Spacing.sm },
  slot:          { flex: 1, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 2 },
  slotFilled:    {},
  slotEmpty:     { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 4, padding: Spacing.sm },
  slotImage:     { width: '100%', aspectRatio: 3 / 4 },
  slotRemove:    { position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  slotInfo:      { padding: Spacing.xs, gap: 2 },
  slotName:      { fontSize: 11, fontWeight: FontWeight.semibold },
  slotPrice:     { fontSize: 11, fontWeight: FontWeight.bold },
  slotEmptyTxt:  { fontSize: 11, textAlign: 'center' },

  chip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, marginRight: 8, borderWidth: 1 },
  chipTxt: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  gridTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCell:  { width: '48%', borderRadius: Radius.md, overflow: 'hidden' },
  gridImg:   { width: '100%', aspectRatio: 3 / 4 },
  gridInfo:  { padding: Spacing.sm, gap: 4 },
  gridName:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  gridPrice: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  comparePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 8, borderRadius: Radius.full, alignSelf: 'flex-start' },
  pillTxt:   { fontSize: 10, fontWeight: FontWeight.semibold },

  // Modal
  modal:       { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, paddingTop: Spacing.xl, borderBottomWidth: 1 },
  modalTitle:  { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  pickerRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', padding: Spacing.sm },
  pickerImg:   { width: 56, height: 75, borderRadius: Radius.sm },
  pickerInfo:  { flex: 1, gap: 2 },
  pickerName:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  pickerBrand: { fontSize: FontSize.xs },
  pickerPrice: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});

type TryOnFitInsight = {
  fitScore: number | null;
  sizeRecommendation: string | null;
  colourMatch: string | null;
  occasion: string | null;
  styleNotes: string | null;
  stylistNote: string | null;
};

function buildFitInsight(metadata?: Record<string, unknown>, summary?: string): TryOnFitInsight | null {
  const insight = {
    fitScore: typeof metadata?.fitScore === 'number' ? metadata.fitScore : null,
    sizeRecommendation: stringValue(metadata?.sizeRecommendation),
    colourMatch: stringValue(metadata?.colourMatch),
    occasion: stringValue(metadata?.occasion),
    styleNotes: stringValue(metadata?.styleNotes) ?? summary ?? null,
    stylistNote: stringValue(metadata?.stylistNote),
  };

  return Object.values(insight).some(Boolean) ? insight : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function validateBodyFraming(width?: number, height?: number): string | null {
  if (!width || !height) {
    return 'Use a full-body photo from head to shoes so pants, dresses, and long outfits can be placed accurately.';
  }

  const aspectRatio = height / width;
  if (aspectRatio < 1.25) {
    return 'This photo looks too wide or cropped. Use a portrait full-body photo from head to shoes for best try-on results.';
  }

  if (aspectRatio > 2.4) {
    return 'This photo looks unusually narrow. Use a clear full-body photo with your full outfit area visible.';
  }

  return null;
}
