import { Ionicons } from '@expo/vector-icons';
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
import type { Product, ProductVariant } from '../../types';

const CATEGORIES = ['All', 'Tops', 'Dresses', 'Outerwear', 'Bottoms'] as const;
const MAX_COMPARE = 3;

export function TryMeScreen() {
  const { C } = useTheme();
  const userId         = useAppStore(s => s.userId);
  const compareIds     = useAppStore(s => s.compareProductIds);
  const addToCompare   = useAppStore(s => s.addToCompare);
  const removeCompare  = useAppStore(s => s.removeFromCompare);
  const setLastTryOnId = useAppStore(s => s.setLastTryOnRequestId);

  // ── Try-on state ─────────────────────────────────────────────────────────────
  const [userPhoto,     setUserPhoto]     = useState<string | null>(null);
  const [garmentUri,    setGarmentUri]    = useState<string | null>(null);
  const [garmentProduct, setGarmentProduct] = useState<Product | null>(null);
  const [garmentVariant, setGarmentVariant] = useState<ProductVariant | null>(null);
  const [generating,    setGenerating]    = useState(false);
  const [genProgress,   setGenProgress]   = useState(0);
  const [generatedUrl,  setGeneratedUrl]  = useState<string | null>(null);
  const [requestId,     setRequestId]     = useState<string | null>(null);
  const [savingLook,    setSavingLook]    = useState(false);
  const [lookSaved,     setLookSaved]     = useState(false);

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
    if (!result.canceled) { setUserPhoto(result.assets[0].uri); setGeneratedUrl(null); setLookSaved(false); }
  };

  const handleUserGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Gallery permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [3, 4], quality: 0.85,
    });
    if (!result.canceled) { setUserPhoto(result.assets[0].uri); setGeneratedUrl(null); setLookSaved(false); }
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
      setGeneratedUrl(null); setLookSaved(false);
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
      setGeneratedUrl(null); setLookSaved(false);
    }
  };

  const handleSelectFromStore = (product: Product) => {
    const variant = product.variants.find(v => v.inStock) ?? product.variants[0];
    setGarmentProduct(product);
    setGarmentVariant(variant ?? null);
    setGarmentUri(null);
    setShowPicker(false);
    setGeneratedUrl(null); setLookSaved(false);
  };

  const clearGarment = () => {
    setGarmentUri(null); setGarmentProduct(null); setGarmentVariant(null);
    setGeneratedUrl(null); setLookSaved(false);
  };

  // ── Generate ──────────────────────────────────────────────────────────────────
  const canGenerate = !!userPhoto && !!garmentVariant && !generating;

  const handleGenerate = async () => {
    if (!userPhoto || !garmentVariant) return;
    setGenerating(true); setGenProgress(5); setGeneratedUrl(null); setLookSaved(false);
    try {
      const created = await mobileApi.createTryOn(userId, garmentVariant.id, userPhoto);
      setRequestId(created.id); setLastTryOnId(created.id); setGenProgress(15);
      const result = await mobileApi.pollTryOnResult(created.id, pct => {
        setGenProgress(15 + Math.round(pct * 0.85));
      });
      setGeneratedUrl(result.resultImageUrl ?? null);
    } catch (err) {
      Alert.alert('Generation failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setGenerating(false); setGenProgress(0);
    }
  };

  // ── Save look ─────────────────────────────────────────────────────────────────
  const handleSaveLook = async () => {
    if (!generatedUrl || !garmentProduct) return;
    setSavingLook(true);
    try {
      await mobileApi.saveLook({
        userId,
        name: garmentProduct.name,
        tryOnResultId: requestId ?? undefined,
        tryOnImageUrl: generatedUrl,
        products:      [garmentProduct],
      });
      setLookSaved(true);
      showToast('Look saved!');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingLook(false);
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.title, { color: C.textPrimary }]}>Try Me</Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>See how clothes look on you</Text>

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
                  <Pressable style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]} onPress={() => { setUserPhoto(null); setGeneratedUrl(null); }}>
                    <Ionicons name="close" size={14} color={C.textMuted} />
                  </Pressable>
                </View>
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

        {/* Note when garment is from gallery/scan (no variant = can't generate) */}
        {garmentUri && !garmentVariant && (
          <Text style={[styles.noteText, { color: C.textMuted }]}>
            💡 Select from Store to enable AI try-on generation
          </Text>
        )}

        {/* Generate button */}
        <Pressable
          style={[styles.generateBtn, { backgroundColor: canGenerate ? C.primary : C.surface3 }]}
          onPress={handleGenerate}
          disabled={!canGenerate}
        >
          <Ionicons name="sparkles" size={18} color={canGenerate ? '#fff' : C.textMuted} />
          <Text style={[styles.generateTxt, { color: canGenerate ? '#fff' : C.textMuted }]}>
            Generate Try-Out
          </Text>
        </Pressable>

        {/* Generated result */}
        {generatedUrl && (
          <View style={[styles.resultCard, { backgroundColor: C.surface, borderColor: C.border }, Shadow.md]}>
            <Text style={[styles.resultTitle, { color: C.textPrimary }]}>Your Generated Look</Text>
            <Image source={{ uri: generatedUrl }} style={styles.resultImage} resizeMode="cover" />
            {lookSaved ? (
              <View style={[styles.savedBadge, { backgroundColor: C.successDim }]}>
                <Ionicons name="checkmark-circle" size={16} color={C.success} />
                <Text style={[styles.savedTxt, { color: C.success }]}>Saved to your looks</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.saveBtn, { backgroundColor: C.primary }]}
                onPress={handleSaveLook}
                disabled={savingLook}
              >
                <Ionicons name="bookmark" size={15} color="#fff" />
                <Text style={styles.saveTxt}>{savingLook ? 'Saving…' : 'Save to Looks'}</Text>
              </Pressable>
            )}
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

      <LoadingOverlay visible={generating} message="Generating your look…" progress={genProgress} />
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
  cardPlaceholder: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  placeholderEmoji: { fontSize: 28 },
  placeholderTxt:   { fontSize: 11, textAlign: 'center' },
  garmentName:      { fontSize: 11, textAlign: 'center' },
  cardBtns:   { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  iconBtn:    { width: 28, height: 28, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sourceBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 2, borderRadius: Radius.sm },
  sourceTxt:  { color: '#fff', fontSize: 10, fontWeight: FontWeight.semibold },

  noteText:   { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },

  // Generate button
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: Radius.full },
  generateTxt: { fontSize: FontSize.base, fontWeight: FontWeight.bold },

  // Result
  resultCard:  { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', padding: Spacing.sm, gap: Spacing.sm },
  resultTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  resultImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md },
  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 10, borderRadius: Radius.full },
  saveTxt:     { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  savedBadge:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 8, borderRadius: Radius.full },
  savedTxt:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

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
