import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Alert, Pressable, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';

import { EmptyState }    from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen }        from '../../components/Screen';
import { SectionCard }   from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }     from '../../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

const COUPON_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;

type CouponForm = {
  code:             string;
  title:            string;
  description:      string;
  type:             string;
  discountValue:    string;
  isActive:         boolean;
  rewardCostPoints: string;
  startsAt:         string;
  endsAt:           string;
};

const EMPTY_FORM: CouponForm = {
  code: '', title: '', description: '', type: 'PERCENTAGE',
  discountValue: '', isActive: true, rewardCostPoints: '', startsAt: '', endsAt: '',
};

export function AdminCouponsScreen() {
  const { data: coupons, loading, error, refetch } = useAsyncResource(
    () => mobileApi.adminListCoupons(),
    [],
  );

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<CouponForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      code:             c.code ?? '',
      title:            c.title ?? '',
      description:      c.description ?? '',
      type:             c.type ?? 'PERCENTAGE',
      discountValue:    String(c.discountValue ?? ''),
      isActive:         c.isActive ?? true,
      rewardCostPoints: String(c.rewardCostPoints ?? ''),
      startsAt:         c.startsAt ? c.startsAt.slice(0, 10) : '',
      endsAt:           c.endsAt   ? c.endsAt.slice(0, 10)   : '',
    });
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const setField = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = useCallback(async () => {
    if (!form.code.trim())  { Alert.alert('Validation', 'Coupon code is required.'); return; }
    if (!form.title.trim()) { Alert.alert('Validation', 'Coupon title is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        code:             form.code.trim().toUpperCase(),
        title:            form.title.trim(),
        description:      form.description.trim() || undefined,
        type:             form.type,
        discountValue:    parseFloat(form.discountValue) || 0,
        isActive:         form.isActive,
        rewardCostPoints: form.rewardCostPoints ? parseInt(form.rewardCostPoints, 10) : undefined,
        startsAt:         form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt:           form.endsAt   ? new Date(form.endsAt).toISOString()   : undefined,
      };
      if (editingId) {
        await mobileApi.adminUpdateCoupon(editingId, payload);
      } else {
        await mobileApi.adminCreateCoupon(payload);
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
        <SectionCard><Text style={styles.loadingText}>Loading coupons…</Text></SectionCard>
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
        <Text style={styles.pageTitle}>Coupons ({coupons?.length ?? 0})</Text>
        {!showForm && (
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.addBtnText}>Add coupon</Text>
          </Pressable>
        )}
      </View>

      {showForm && (
        <SectionCard title={editingId ? 'Edit Coupon' : 'New Coupon'}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Code *</Text>
            <TextInput style={styles.input} value={form.code} onChangeText={(v) => setField('code', v.toUpperCase())} placeholderTextColor={Colors.textMuted} placeholder="SAVE20" autoCapitalize="characters" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(v) => setField('title', v)} placeholderTextColor={Colors.textMuted} placeholder="20% off" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(v) => setField('description', v)} placeholderTextColor={Colors.textMuted} placeholder="Optional details" multiline numberOfLines={3} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.chipRow}>
              {COUPON_TYPES.map((t) => (
                <Pressable key={t} style={[styles.chip, form.type === t && styles.chipActive]} onPress={() => setField('type', t)}>
                  <Text style={[styles.chipLabel, form.type === t && styles.chipLabelActive]}>{t.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Discount Value</Text>
            <TextInput style={styles.input} value={form.discountValue} onChangeText={(v) => setField('discountValue', v)} placeholderTextColor={Colors.textMuted} placeholder={form.type === 'PERCENTAGE' ? '20 (for 20%)' : '100 (₹100 off)'} keyboardType="decimal-pad" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Reward Cost (points)</Text>
            <TextInput style={styles.input} value={form.rewardCostPoints} onChangeText={(v) => setField('rewardCostPoints', v)} placeholderTextColor={Colors.textMuted} placeholder="Optional — points to redeem" keyboardType="number-pad" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Starts At (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.startsAt} onChangeText={(v) => setField('startsAt', v)} placeholderTextColor={Colors.textMuted} placeholder="2026-01-01" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ends At (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.endsAt} onChangeText={(v) => setField('endsAt', v)} placeholderTextColor={Colors.textMuted} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Active</Text>
            <Switch
              value={form.isActive}
              onValueChange={(v) => setField('isActive', v)}
              trackColor={{ true: Colors.primary }}
            />
          </View>
          <View style={styles.formActions}>
            <PrimaryButton onPress={handleSave} loading={saving}>
              {editingId ? 'Update Coupon' : 'Create Coupon'}
            </PrimaryButton>
            <Pressable onPress={cancelForm} style={styles.cancelLink}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </SectionCard>
      )}

      <SectionCard title="All Coupons">
        {!coupons?.length ? (
          <Text style={styles.emptyText}>No coupons yet.</Text>
        ) : (
          coupons.map((c: any, idx: number) => (
            <View key={c.id}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <View style={styles.codeRow}>
                    <Text style={styles.code}>{c.code}</Text>
                    <View style={[styles.activeBadge, { backgroundColor: c.isActive ? Colors.successDim : Colors.errorDim }]}>
                      <Text style={[styles.activeBadgeText, { color: c.isActive ? Colors.success : Colors.error }]}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rowTitle}>{c.title}</Text>
                  <Text style={styles.rowSub}>{c.type} · {c.discountValue}</Text>
                </View>
                <Pressable style={styles.editBtn} onPress={() => openEdit(c)}>
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
  loadingText:     { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
  pageTitle:       { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  topRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  addBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.primaryDim },
  addBtnText:      { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  formGroup:       { marginBottom: Spacing.md },
  label:           { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4, fontWeight: FontWeight.medium },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: FontSize.base, color: Colors.textPrimary, backgroundColor: Colors.bg,
  },
  textarea:        { minHeight: 72, textAlignVertical: 'top' },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip:            { paddingVertical: 7, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive:      { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
  chipLabel:       { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipLabelActive: { color: Colors.primary },
  switchRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  formActions:     { gap: Spacing.sm, marginTop: Spacing.sm },
  cancelLink:      { alignItems: 'center', paddingVertical: Spacing.xs },
  cancelText:      { fontSize: FontSize.sm, color: Colors.textMuted },
  emptyText:       { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.md },
  row:             { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  rowInfo:         { flex: 1, gap: 2 },
  codeRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  code:            { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary, fontFamily: 'monospace' },
  activeBadge:     { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  activeBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  rowTitle:        { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  rowSub:          { fontSize: FontSize.xs, color: Colors.textMuted },
  divider:         { height: 1, backgroundColor: Colors.border },
  editBtn:         { padding: Spacing.xs, borderRadius: Radius.sm, backgroundColor: Colors.primaryDim },
});
