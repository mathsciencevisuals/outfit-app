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

type ShopForm = { name: string; slug: string; url: string; region: string; description: string };

const EMPTY_FORM: ShopForm = { name: '', slug: '', url: '', region: 'IN', description: '' };

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function AdminShopsScreen() {
  const { data: shops, loading, error, refetch } = useAsyncResource(
    () => mobileApi.adminListShops(),
    [],
  );

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<ShopForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };

  const openEdit = (shop: any) => {
    setEditingId(shop.id);
    setForm({ name: shop.name ?? '', slug: shop.slug ?? '', url: shop.url ?? '', region: shop.region ?? 'IN', description: shop.description ?? '' });
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const setField = (key: keyof ShopForm, value: string) =>
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === 'name' && !editingId ? { slug: toSlug(value) } : {}),
    }));

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) { Alert.alert('Validation', 'Shop name is required.'); return; }
    if (!form.url.trim())  { Alert.alert('Validation', 'Shop URL is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        slug:        form.slug.trim() || toSlug(form.name),
        url:         form.url.trim(),
        region:      form.region.trim() || 'IN',
        description: form.description.trim() || undefined,
      };
      if (editingId) {
        await mobileApi.adminUpdateShop(editingId, payload);
      } else {
        await mobileApi.adminCreateShop(payload);
      }
      cancelForm();
      refetch();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, refetch]);

  if (loading) {
    return (
      <Screen>
        <SectionCard><Text style={styles.loadingText}>Loading shops…</Text></SectionCard>
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
        <Text style={styles.pageTitle}>Shops ({shops?.length ?? 0})</Text>
        {!showForm && (
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.addBtnText}>Add shop</Text>
          </Pressable>
        )}
      </View>

      {showForm && (
        <SectionCard title={editingId ? 'Edit Shop' : 'New Shop'}>
          {(['name', 'slug', 'url', 'region', 'description'] as (keyof ShopForm)[]).map((key) => (
            <View key={key} style={styles.formGroup}>
              <Text style={styles.label}>{key.charAt(0).toUpperCase() + key.slice(1)}{key === 'name' || key === 'url' ? ' *' : ''}</Text>
              <TextInput
                style={[styles.input, key === 'description' && styles.textarea]}
                value={form[key]}
                onChangeText={(v) => setField(key, v)}
                placeholder={key === 'url' ? 'https://…' : key === 'slug' ? 'auto-generated' : undefined}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize={key === 'region' ? 'characters' : key === 'url' || key === 'slug' ? 'none' : 'words'}
                keyboardType={key === 'url' ? 'url' : 'default'}
                multiline={key === 'description'}
                numberOfLines={key === 'description' ? 3 : 1}
              />
            </View>
          ))}
          <View style={styles.formActions}>
            <PrimaryButton onPress={handleSave} loading={saving}>
              {editingId ? 'Update Shop' : 'Create Shop'}
            </PrimaryButton>
            <Pressable onPress={cancelForm} style={styles.cancelLink}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </SectionCard>
      )}

      <SectionCard title="All Shops">
        {!shops?.length ? (
          <Text style={styles.emptyText}>No shops yet.</Text>
        ) : (
          shops.map((shop: any, idx: number) => (
            <View key={shop.id}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{shop.name}</Text>
                  <Text style={styles.rowSub}>{shop.slug} · {shop.region}</Text>
                  {shop.url ? <Text style={styles.rowUrl} numberOfLines={1}>{shop.url}</Text> : null}
                </View>
                <Pressable style={styles.editBtn} onPress={() => openEdit(shop)}>
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
  rowInfo:     { flex: 1, gap: 2 },
  rowTitle:    { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  rowSub:      { fontSize: FontSize.xs, color: Colors.textMuted },
  rowUrl:      { fontSize: FontSize.xs, color: Colors.primary },
  divider:     { height: 1, backgroundColor: Colors.border },
  editBtn:     { padding: Spacing.xs, borderRadius: Radius.sm, backgroundColor: Colors.primaryDim },
});
