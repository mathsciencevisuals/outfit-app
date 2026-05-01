import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen }        from '../../components/Screen';
import { SectionCard }   from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }     from '../../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

type Variant = { sku: string; sizeLabel: string; color: string; price: string };

const CATEGORIES = ['tops', 'bottoms', 'outerwear', 'footwear', 'accessories', 'dresses'];

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const EMPTY_VARIANT: Variant = { sku: '', sizeLabel: '', color: '', price: '' };

export function AdminProductFormScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const isEdit = !!productId;

  // ── Brands list ──────────────────────────────────────────────────────────
  const { data: brands } = useAsyncResource(() => mobileApi.adminListBrands(), []);

  // ── Load existing product for edit ───────────────────────────────────────
  const { data: allProducts } = useAsyncResource(
    () => mobileApi.adminListProducts(),
    [],
  );

  const existing = allProducts?.find((p: any) => p.id === productId) ?? null;

  // ── Form state ───────────────────────────────────────────────────────────
  const [brandId,         setBrandId]         = useState('');
  const [name,            setName]            = useState('');
  const [slug,            setSlug]            = useState('');
  const [category,        setCategory]        = useState('');
  const [description,     setDescription]     = useState('');
  const [baseColor,       setBaseColor]       = useState('');
  const [secondaryColors, setSecondaryColors] = useState('');
  const [materials,       setMaterials]       = useState('');
  const [styleTags,       setStyleTags]       = useState('');
  const [imageUrl,        setImageUrl]        = useState('');
  const [variants,        setVariants]        = useState<Variant[]>([]);
  const [saving,          setSaving]          = useState(false);

  // Populate form when existing product loads
  useEffect(() => {
    if (!existing) return;
    setBrandId(existing.brandId ?? '');
    setName(existing.name ?? '');
    setSlug(existing.slug ?? '');
    setCategory(existing.category ?? '');
    setDescription(existing.description ?? '');
    setBaseColor(existing.baseColor ?? '');
    setSecondaryColors((existing.secondaryColors ?? []).join(', '));
    setMaterials((existing.materials ?? []).join(', '));
    setStyleTags((existing.styleTags ?? []).join(', '));
    setImageUrl(existing.imageUrl ?? existing.images?.[0] ?? '');
    setVariants(
      (existing.variants ?? []).map((v: any) => ({
        sku:       v.sku ?? '',
        sizeLabel: v.sizeLabel ?? '',
        color:     v.color ?? '',
        price:     String(v.price ?? ''),
      })),
    );
  }, [existing]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) setSlug(toSlug(val));
  };

  // ── Variant management ───────────────────────────────────────────────────
  const addVariant = () => setVariants((vs) => [...vs, { ...EMPTY_VARIANT }]);

  const removeVariant = (idx: number) =>
    setVariants((vs) => vs.filter((_, i) => i !== idx));

  const updateVariant = (idx: number, key: keyof Variant, val: string) =>
    setVariants((vs) => vs.map((v, i) => (i === idx ? { ...v, [key]: val } : v)));

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!name.trim()) { Alert.alert('Validation', 'Product name is required.'); return; }
    if (!brandId)     { Alert.alert('Validation', 'Please select a brand.'); return; }

    setSaving(true);
    try {
      const payload = {
        brandId,
        name:            name.trim(),
        slug:            slug.trim() || toSlug(name),
        category:        category || undefined,
        description:     description.trim() || undefined,
        baseColor:       baseColor.trim() || undefined,
        secondaryColors: secondaryColors.split(',').map((s) => s.trim()).filter(Boolean),
        materials:       materials.split(',').map((s) => s.trim()).filter(Boolean),
        styleTags:       styleTags.split(',').map((s) => s.trim()).filter(Boolean),
        imageUrl:        imageUrl.trim() || undefined,
        variants: variants.map((v) => ({
          sku:       v.sku.trim(),
          sizeLabel: v.sizeLabel.trim(),
          color:     v.color.trim(),
          price:     parseFloat(v.price) || 0,
        })),
      };

      if (isEdit && productId) {
        await mobileApi.adminUpdateProduct(productId, payload);
      } else {
        await mobileApi.adminCreateProduct(payload);
      }
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [brandId, name, slug, category, description, baseColor, secondaryColors, materials, styleTags, imageUrl, variants, isEdit, productId, router]);

  return (
    <Screen scroll>
      <Text style={styles.pageTitle}>{isEdit ? 'Edit Product' : 'New Product'}</Text>

      {/* ── Brand ── */}
      <SectionCard title="Brand">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            {(brands ?? []).map((b: any) => (
              <Pressable
                key={b.id}
                style={[styles.chip, brandId === b.id && styles.chipActive]}
                onPress={() => setBrandId(b.id)}
              >
                <Text style={[styles.chipLabel, brandId === b.id && styles.chipLabelActive]}>
                  {b.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SectionCard>

      {/* ── Basic info ── */}
      <SectionCard title="Basic Info">
        <View style={styles.formGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Product name"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Slug</Text>
          <TextInput
            style={styles.input}
            value={slug}
            onChangeText={setSlug}
            placeholder="auto-generated"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Product description…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Image URL</Text>
          <TextInput
            style={styles.input}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://…"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      </SectionCard>

      {/* ── Category ── */}
      <SectionCard title="Category">
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipLabel, category === cat && styles.chipLabelActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      {/* ── Style & colour ── */}
      <SectionCard title="Style & Colour">
        <View style={styles.formGroup}>
          <Text style={styles.label}>Base Colour</Text>
          <TextInput
            style={styles.input}
            value={baseColor}
            onChangeText={setBaseColor}
            placeholder="e.g. navy"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Secondary Colours (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={secondaryColors}
            onChangeText={setSecondaryColors}
            placeholder="e.g. white, gold"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Materials (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={materials}
            onChangeText={setMaterials}
            placeholder="e.g. cotton, polyester"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Style Tags (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={styleTags}
            onChangeText={setStyleTags}
            placeholder="e.g. casual, summer"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>
      </SectionCard>

      {/* ── Variants ── */}
      <SectionCard title="Variants">
        {variants.map((v, idx) => (
          <View key={idx} style={styles.variantRow}>
            <View style={styles.variantFields}>
              <TextInput
                style={[styles.input, styles.variantInput]}
                value={v.sku}
                onChangeText={(val) => updateVariant(idx, 'sku', val)}
                placeholder="SKU"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, styles.variantInput]}
                value={v.sizeLabel}
                onChangeText={(val) => updateVariant(idx, 'sizeLabel', val)}
                placeholder="Size (e.g. M)"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.variantInput]}
                value={v.color}
                onChangeText={(val) => updateVariant(idx, 'color', val)}
                placeholder="Colour"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, styles.variantInputPrice]}
                value={v.price}
                onChangeText={(val) => updateVariant(idx, 'price', val)}
                placeholder="Price"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable style={styles.removeVariant} onPress={() => removeVariant(idx)}>
              <Ionicons name="close-circle" size={20} color={Colors.error} />
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.addVariantBtn} onPress={addVariant}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addVariantText}>Add Variant</Text>
        </Pressable>
      </SectionCard>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        <PrimaryButton onPress={handleSave} loading={saving}>
          {isEdit ? 'Update Product' : 'Create Product'}
        </PrimaryButton>
        <Pressable onPress={() => router.back()} style={styles.cancelLink}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle:    { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingVertical: Spacing.md },
  formGroup:    { marginBottom: Spacing.md },
  label:        { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4, fontWeight: FontWeight.medium },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: FontSize.base, color: Colors.textPrimary, backgroundColor: Colors.bg,
  },
  textarea:     { minHeight: 80, textAlignVertical: 'top' },
  chipScroll:   { marginHorizontal: -Spacing.sm },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingVertical: 7, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive:      { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
  chipLabel:       { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipLabelActive: { color: Colors.primary },
  variantRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginBottom: Spacing.sm },
  variantFields: { flex: 1, gap: Spacing.xs },
  variantInput:  { flex: 1, fontSize: FontSize.sm },
  variantInputPrice: { width: 80, fontSize: FontSize.sm },
  removeVariant: { paddingTop: Spacing.xs },
  addVariantBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  addVariantText:{ fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  actions:      { gap: Spacing.sm, marginTop: Spacing.sm },
  cancelLink:   { alignItems: 'center', paddingVertical: Spacing.xs },
  cancelText:   { fontSize: FontSize.sm, color: Colors.textMuted },
});
