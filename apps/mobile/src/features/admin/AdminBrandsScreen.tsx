import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Alert, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { EmptyState }    from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen }        from '../../components/Screen';
import { SectionCard }   from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }     from '../../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

type BrandForm = {
  name: string;
  slug: string;
  countryCode: string;
  sizingNotes: string;
};

const EMPTY_FORM: BrandForm = { name: '', slug: '', countryCode: 'IN', sizingNotes: '' };

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function AdminBrandsScreen() {
  const { data: brands, loading, error, refetch } = useAsyncResource(
    () => mobileApi.adminListBrands(),
    [],
  );

  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<BrandForm>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (brand: any) => {
    setEditingId(brand.id);
    setForm({
      name:        brand.name ?? '',
      slug:        brand.slug ?? '',
      countryCode: brand.countryCode ?? 'IN',
      sizingNotes: brand.sizingNotes ?? '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Brand name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        slug:        form.slug.trim() || toSlug(form.name),
        countryCode: form.countryCode.trim() || 'IN',
        sizingNotes: form.sizingNotes.trim() || undefined,
      };
      if (editingId) {
        await mobileApi.adminUpdateBrand(editingId, payload);
      } else {
        await mobileApi.adminCreateBrand(payload);
      }
      cancelForm();
      refetch();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, refetch]);

  const setField = (key: keyof BrandForm, value: string) =>
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === 'name' && !editingId ? { slug: toSlug(value) } : {}),
    }));

  if (loading) {
    return (
      <Screen>
        <SectionCard><Text style={styles.loadingText}>Loading brands…</Text></SectionCard>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <EmptyState icon="⚠️" title="Failed to load" subtitle={error} action="Retry" onAction={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Text style={styles.pageTitle}>Brands ({brands?.length ?? 0})</Text>
        {!showForm && (
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.addBtnText}>Add brand</Text>
          </Pressable>
        )}
      </View>

      {/* ── Inline form ── */}
      {showForm && (
        <SectionCard title={editingId ? 'Edit Brand' : 'New Brand'}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              placeholder="e.g. H&M India"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Slug</Text>
            <TextInput
              style={styles.input}
              value={form.slug}
              onChangeText={(v) => setField('slug', v)}
              placeholder="auto-generated from name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Country Code</Text>
            <TextInput
              style={styles.input}
              value={form.countryCode}
              onChangeText={(v) => setField('countryCode', v.toUpperCase())}
              placeholder="IN"
              placeholderTextColor={Colors.textMuted}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Sizing Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.sizingNotes}
              onChangeText={(v) => setField('sizingNotes', v)}
              placeholder="Optional sizing guidance…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={styles.formActions}>
            <PrimaryButton onPress={handleSave} loading={saving}>
              {editingId ? 'Update Brand' : 'Create Brand'}
            </PrimaryButton>
            <Pressable onPress={cancelForm} style={styles.cancelLink}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </SectionCard>
      )}

      {/* ── Brand list ── */}
      <SectionCard title="All Brands">
        {!brands?.length ? (
          <Text style={styles.emptyText}>No brands yet.</Text>
        ) : (
          brands.map((brand: any, idx: number) => (
            <View key={brand.id}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{brand.name}</Text>
                  <Text style={styles.rowSub}>{brand.slug} · {brand.countryCode}</Text>
                </View>
                <Pressable style={styles.editBtn} onPress={() => openEdit(brand)}>
                  <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
  pageTitle:   { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  topRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.primaryDim },
  addBtnText:  { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  formGroup:   { marginBottom: Spacing.md },
  label:       { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4, fontWeight: FontWeight.medium },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: FontSize.base, color: Colors.textPrimary, backgroundColor: Colors.bg,
  },
  textarea:    { minHeight: 72, textAlignVertical: 'top' },
  formActions: { gap: Spacing.sm, marginTop: Spacing.sm },
  cancelLink:  { alignItems: 'center', paddingVertical: Spacing.xs },
  cancelText:  { fontSize: FontSize.sm, color: Colors.textMuted },
  emptyText:   { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.md },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  rowInfo:     { flex: 1 },
  rowTitle:    { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  rowSub:      { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  divider:     { height: 1, backgroundColor: Colors.border, marginLeft: 0 },
  editBtn:     { padding: Spacing.xs, borderRadius: Radius.sm, backgroundColor: Colors.primaryDim },
});
