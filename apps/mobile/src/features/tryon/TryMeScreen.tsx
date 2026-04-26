import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { ProductCard } from '../../components/ProductCard';
import { Toast } from '../../components/Toast';
import { useTheme } from '../../hooks/useTheme';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';
import { formatPrice } from '../../utils/currency';
import type { Product } from '../../types';

const CATEGORIES = ['All', 'Tops', 'Dresses', 'Outerwear', 'Bottoms'] as const;

export function TryMeScreen() {
  const { C }  = useTheme();
  const userId = useAppStore(s => s.userId);
  const compareIds    = useAppStore(s => s.compareProductIds);
  const addToCompare  = useAppStore(s => s.addToCompare);
  const removeCompare = useAppStore(s => s.removeFromCompare);
  const clearCompare  = useAppStore(s => s.clearCompare);

  const [products,  setProducts]  = useState<Product[]>([]);
  const [category,  setCategory]  = useState<string>('All');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [toast, setToast]   = useState('');
  const [toastVis, setToastVis] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { mobileApi.products().then(setProducts).catch(() => {}); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setToastVis(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVis(false), 2500);
  };

  const handleUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, base64: false });
    if (!result.canceled) {
      setUserPhoto(result.assets[0].uri);
      showToast('Photo uploaded! Select items to try on');
    }
  };

  const handleCompare = (product: Product) => {
    if (compareIds.includes(product.id)) {
      removeCompare(product.id);
      showToast('Removed from compare');
    } else if (compareIds.length >= 3) {
      showToast('Maximum 3 items for comparison');
    } else {
      addToCompare(product.id);
      showToast('Added to compare');
    }
  };

  const compareProducts = products.filter(p => compareIds.includes(p.id));
  const filtered = category === 'All'
    ? products
    : products.filter(p => p.category.toLowerCase() === category.toLowerCase());

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.title, { color: C.textPrimary }]}>Split-Screen Try-On</Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>
          Compare up to 3 outfits side-by-side
        </Text>

        {/* Upload bar */}
        <View style={[styles.uploadBar, { backgroundColor: C.surface }, Shadow.sm]}>
          <View style={styles.uploadBtns}>
            <Pressable style={[styles.btnPrimary, { backgroundColor: C.primary }]} onPress={handleUploadPhoto}>
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              <Text style={styles.btnPrimaryText}>Upload Photo</Text>
            </Pressable>
            <Pressable style={[styles.btnSecondary, { borderColor: C.border, backgroundColor: C.surface2 }]}
              onPress={() => { setUserPhoto(null); showToast('Using default avatar'); }}>
              <Ionicons name="person-outline" size={16} color={C.textSecondary} />
              <Text style={[styles.btnSecondaryText, { color: C.textSecondary }]}>Use Avatar</Text>
            </Pressable>
          </View>
          <Text style={[styles.compareCount, { color: C.textSecondary }]}>
            Comparing: <Text style={{ color: C.primary, fontWeight: FontWeight.bold }}>{compareIds.length}</Text>/3
          </Text>
        </View>

        {/* Compare slots */}
        {compareIds.length > 0 && (
          <View style={styles.slotsGrid}>
            {[0, 1, 2].map((i) => {
              const p = compareProducts[i];
              return p ? (
                <View key={p.id} style={[styles.slot, styles.slotFilled, { backgroundColor: C.surface, borderColor: C.primary }, Shadow.sm]}>
                  <Image
                    source={{ uri: p.variants[0]?.imageUrl ?? `https://picsum.photos/seed/${p.id}/300/400` }}
                    style={styles.slotImage}
                    resizeMode="cover"
                  />
                  <Pressable style={styles.slotRemove} onPress={() => removeCompare(p.id)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                  <View style={styles.slotInfo}>
                    <Text style={[styles.slotName, { color: C.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.slotPrice, { color: C.primary }]}>
                      {formatPrice(p.variants[0]?.price ?? 0)}
                    </Text>
                    <Pressable style={[styles.slotBuyBtn, { backgroundColor: C.primary }]}
                      onPress={() => showToast(`Checkout: ${p.name}`)}>
                      <Text style={styles.slotBuyText}>Instant Checkout</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View key={`empty-${i}`} style={[styles.slot, styles.slotEmpty, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <Ionicons name="add-circle-outline" size={36} color={C.textMuted} />
                  <Text style={[styles.slotEmptyText, { color: C.textSecondary }]}>Add to compare</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.filterChip,
                { backgroundColor: category === cat ? C.primary : C.surface2,
                  borderColor: category === cat ? C.primary : C.border }]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.filterText, { color: category === cat ? '#fff' : C.textSecondary }]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Products grid */}
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Add to Compare</Text>
        <View style={styles.grid}>
          {filtered.map((p) => (
            <View key={p.id} style={styles.gridCell}>
              <ProductCard
                product={p}
                showCompare
                onCompare={handleCompare}
                onBuy={(prod) => showToast(`Checkout: ${prod.name}`)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <Toast message={toast} visible={toastVis} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { padding: Spacing.base, paddingBottom: 80 },
  title:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: 4 },
  sub:         { fontSize: FontSize.sm, marginBottom: Spacing.md },
  uploadBar:   { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  uploadBtns:  { flexDirection: 'row', gap: Spacing.sm },
  btnPrimary:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: Radius.md },
  btnPrimaryText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: Radius.md, borderWidth: 1 },
  btnSecondaryText: { fontSize: FontSize.sm },
  compareCount: { fontSize: FontSize.sm },
  slotsGrid:   { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  slot:        { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 2 },
  slotFilled:  {},
  slotEmpty:   { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 6, padding: Spacing.md },
  slotImage:   { width: '100%', aspectRatio: 3/4 },
  slotRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  slotInfo:    { padding: Spacing.sm, gap: 4 },
  slotName:    { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  slotPrice:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  slotBuyBtn:  { borderRadius: Radius.sm, paddingVertical: 6, alignItems: 'center', marginTop: 2 },
  slotBuyText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  slotEmptyText: { fontSize: FontSize.xs, textAlign: 'center' },
  filterScroll: { marginBottom: Spacing.md },
  filterChip:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, marginRight: 8, borderWidth: 1 },
  filterText:  { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCell:    { width: '48%' },
});
