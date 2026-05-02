import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Keyboard, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { EmptyState }     from '../../components/EmptyState';
import { PrimaryButton }  from '../../components/PrimaryButton';
import { Screen }         from '../../components/Screen';
import { SectionCard }    from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }      from '../../services/api';
import { useAppStore }    from '../../store/app-store';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import type { Measurement } from '../../types';

type MeasurementKey =
  | 'heightCm'
  | 'chestCm' | 'shouldersCm' | 'sleeveCm' | 'neckCm'
  | 'waistCm' | 'hipsCm' | 'inseamCm' | 'thighCm' | 'riseCm';

type UnitSystem = 'cm' | 'inch';

const CM_TO_INCH = 0.393701;

const TOP_FIELDS: { key: MeasurementKey; label: string; hint: string }[] = [
  { key: 'chestCm',     label: 'Chest / Bust', hint: 'Fullest part of chest' },
  { key: 'shouldersCm', label: 'Shoulders',    hint: 'Shoulder tip to shoulder tip' },
  { key: 'sleeveCm',    label: 'Sleeve',       hint: 'Shoulder to wrist' },
  { key: 'neckCm',      label: 'Neck',         hint: 'Around base of neck' },
  { key: 'waistCm',     label: 'Waist (upper)', hint: 'Narrowest part of torso' },
];

const BOTTOM_FIELDS: { key: MeasurementKey; label: string; hint: string }[] = [
  { key: 'waistCm',   label: 'Waist',   hint: 'Where you wear your waistband' },
  { key: 'hipsCm',    label: 'Hips',    hint: 'Fullest part of hips' },
  { key: 'inseamCm',  label: 'Inseam',  hint: 'Crotch to ankle (inside leg)' },
  { key: 'thighCm',   label: 'Thigh',   hint: 'Fullest part of upper thigh' },
  { key: 'riseCm',    label: 'Rise',    hint: 'Crotch point to waistband' },
];

function toDisplay(valueCm: string, unit: UnitSystem): string {
  if (!valueCm) return '';
  const n = parseFloat(valueCm);
  if (isNaN(n)) return valueCm;
  if (unit === 'inch') return (n * CM_TO_INCH).toFixed(1);
  return valueCm;
}

function toCm(valueDisplay: string, unit: UnitSystem): number {
  const n = parseFloat(valueDisplay);
  if (isNaN(n)) return NaN;
  return unit === 'inch' ? n / CM_TO_INCH : n;
}

const EMPTY_EDITS: Record<MeasurementKey, string> = {
  heightCm: '', chestCm: '', shouldersCm: '', sleeveCm: '', neckCm: '',
  waistCm:  '', hipsCm:  '', inseamCm:    '', thighCm:  '', riseCm: '',
};

export function MeasurementsScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const [unit, setUnit] = useState<UnitSystem>('cm');

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.measurements(userId),
    [userId],
  );

  const [edits, setEdits] = useState<Record<MeasurementKey, string>>(EMPTY_EDITS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const m = data[0];
    setEdits({
      heightCm:    m.heightCm    != null ? String(m.heightCm)    : '',
      chestCm:     m.chestCm     != null ? String(m.chestCm)     : '',
      shouldersCm: (m.shouldersCm ?? m.shoulderCm) != null ? String(m.shouldersCm ?? m.shoulderCm) : '',
      sleeveCm:    m.sleeveCm    != null ? String(m.sleeveCm)    : '',
      neckCm:      m.neckCm      != null ? String(m.neckCm)      : '',
      waistCm:     m.waistCm     != null ? String(m.waistCm)     : '',
      hipsCm:      m.hipsCm      != null ? String(m.hipsCm)      : '',
      inseamCm:    m.inseamCm    != null ? String(m.inseamCm)    : '',
      thighCm:     m.thighCm     != null ? String(m.thighCm)     : '',
      riseCm:      m.riseCm      != null ? String(m.riseCm)      : '',
    });
  }, [data]);

  const handleChange = (key: MeasurementKey, raw: string) => {
    setEdits((prev) => ({ ...prev, [key]: raw }));
  };

  const handleSave = useCallback(async () => {
    const updates: Partial<Measurement> = {};
    const allFields = [...TOP_FIELDS, ...BOTTOM_FIELDS];
    // de-dup waistCm which appears in both sections
    const seen = new Set<string>();
    for (const { key } of allFields) {
      if (seen.has(key)) continue;
      seen.add(key);
      const cm = toCm(edits[key], unit);
      if (!isNaN(cm) && cm > 0) (updates as Record<string, number>)[key] = cm;
    }
    // height is separate
    const h = toCm(edits.heightCm, unit);
    if (!isNaN(h) && h > 0) updates.heightCm = h;

    Keyboard.dismiss();
    setSaving(true);
    try {
      await mobileApi.saveMeasurements(userId, updates);
      router.replace('/style-preferences');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [edits, unit, userId, router]);

  if (loading) return <Screen><SectionCard><Text style={styles.loadingText}>Loading…</Text></SectionCard></Screen>;
  if (error)   return <Screen><EmptyState icon="⚠️" title="Couldn't load" subtitle={error} action="Retry" onAction={refetch} /></Screen>;

  const unitLabel = unit === 'cm' ? 'cm' : 'in';

  const renderField = (
    { key, label, hint }: { key: MeasurementKey; label: string; hint: string },
    isLast: boolean,
  ) => (
    <View key={key} style={[styles.inputRow, !isLast && styles.inputRowBorder]}>
      <View style={styles.inputMeta}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={styles.inputHint}>{hint}</Text>
      </View>
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          value={toDisplay(edits[key], unit)}
          onChangeText={(v) => handleChange(key, v)}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="next"
        />
        <Text style={styles.unitChip}>{unitLabel}</Text>
      </View>
    </View>
  );

  return (
    <Screen scroll>
      {/* Unit toggle */}
      <View style={styles.unitRow}>
        <Text style={styles.unitLabel}>Unit</Text>
        <View style={styles.unitToggle}>
          {(['cm', 'inch'] as UnitSystem[]).map((u) => (
            <View
              key={u}
              style={[styles.unitOption, unit === u && styles.unitOptionActive]}
              onTouchEnd={() => setUnit(u)}
            >
              <Text style={[styles.unitOptionText, unit === u && styles.unitOptionTextActive]}>{u}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Height */}
      <SectionCard title="Height">
        <View style={styles.inputRow}>
          <View style={styles.inputMeta}>
            <Text style={styles.inputLabel}>Height</Text>
            <Text style={styles.inputHint}>Stand straight, feet together</Text>
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={toDisplay(edits.heightCm, unit)}
              onChangeText={(v) => handleChange('heightCm', v)}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
            />
            <Text style={styles.unitChip}>{unitLabel}</Text>
          </View>
        </View>
      </SectionCard>

      {/* Top wear */}
      <SectionCard
        title="Top Wear"
        subtitle="For shirts, kurtas, jackets, and upper-body garments"
      >
        {TOP_FIELDS.map((f, i) => renderField(f, i === TOP_FIELDS.length - 1))}
      </SectionCard>

      {/* Bottom wear */}
      <SectionCard
        title="Bottom Wear"
        subtitle="For trousers, jeans, skirts, and lower-body garments"
      >
        {BOTTOM_FIELDS.map((f, i) => renderField(f, i === BOTTOM_FIELDS.length - 1))}
      </SectionCard>

      <Text style={styles.hint}>
        💡 AI body scan (coming soon) will fill these automatically from a photo
      </Text>

      <View style={styles.actions}>
        <PrimaryButton onPress={handleSave} loading={saving}>
          Continue to style →
        </PrimaryButton>
        <PrimaryButton variant="ghost" onPress={() => router.push('/style-preferences')}>
          Skip for now
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },

  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  unitLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface2,
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  unitOptionActive: { backgroundColor: Colors.primary },
  unitOptionText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  unitOptionTextActive: { color: Colors.white },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  inputRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  inputMeta: { flex: 1, gap: 2 },
  inputLabel: { fontSize: FontSize.base, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  inputHint:  { fontSize: FontSize.xs,  color: Colors.textMuted },
  inputGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  input: {
    width: 76,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    textAlign: 'right',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface2,
  },
  unitChip: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 28 },

  hint: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
});
