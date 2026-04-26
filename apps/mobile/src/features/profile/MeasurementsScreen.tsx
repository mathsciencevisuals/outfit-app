import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TextInput, View,
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

type MeasurementKey = 'chestCm' | 'waistCm' | 'hipsCm' | 'inseamCm' | 'shouldersCm' | 'heightCm';

type UnitSystem = 'cm' | 'inch';

const CM_TO_INCH = 0.393701;

const FIELDS: { key: MeasurementKey; label: string; hint: string }[] = [
  { key: 'heightCm',    label: 'Height',    hint: 'Stand straight, feet together' },
  { key: 'chestCm',     label: 'Chest',     hint: 'Fullest part of chest' },
  { key: 'shouldersCm', label: 'Shoulders', hint: 'Shoulder tip to shoulder tip' },
  { key: 'waistCm',     label: 'Waist',     hint: 'Narrowest part of torso' },
  { key: 'hipsCm',      label: 'Hips',      hint: 'Fullest part of hips' },
  { key: 'inseamCm',    label: 'Inseam',    hint: 'Crotch to ankle (inside leg)' },
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

export function MeasurementsScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const [unit, setUnit] = useState<UnitSystem>('cm');

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.measurements(userId),
    [userId],
  );

  const latest: Partial<Measurement> = Array.isArray(data) && data.length > 0 ? data[0] : {};

  const [edits, setEdits] = useState<Record<MeasurementKey, string>>({
    heightCm:    String(latest.heightCm    ?? ''),
    chestCm:     String(latest.chestCm     ?? ''),
    shouldersCm: String(latest.shouldersCm ?? ''),
    waistCm:     String(latest.waistCm     ?? ''),
    hipsCm:      String(latest.hipsCm      ?? ''),
    inseamCm:    String(latest.inseamCm    ?? ''),
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key: MeasurementKey, raw: string) => {
    // Store internally as display value; convert on save
    setEdits((prev) => ({ ...prev, [key]: raw }));
  };

  const handleSave = useCallback(async () => {
    const updates: Partial<Measurement> = {};
    for (const { key } of FIELDS) {
      const cm = toCm(edits[key], unit);
      if (!isNaN(cm) && cm > 0) (updates as Record<string, number>)[key] = cm;
    }
    setSaving(true);
    try {
      await mobileApi.saveMeasurements(userId, updates);
      router.push('/style-preferences');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [edits, unit, userId, router]);

  if (loading) return <Screen><SectionCard><Text style={styles.loadingText}>Loading…</Text></SectionCard></Screen>;
  if (error)   return <Screen><EmptyState icon="⚠️" title="Couldn't load" subtitle={error} action="Retry" onAction={refetch} /></Screen>;

  const unitLabel = unit === 'cm' ? 'cm' : 'in';

  return (
    <Screen scroll>
      {/* Unit toggle */}
      <View style={styles.unitRow}>
        <Text style={styles.unitLabel}>Unit</Text>
        <View style={styles.unitToggle}>
          <View
            style={[styles.unitOption, unit === 'cm' && styles.unitOptionActive]}
            onTouchEnd={() => setUnit('cm')}
          >
            <Text style={[styles.unitOptionText, unit === 'cm' && styles.unitOptionTextActive]}>cm</Text>
          </View>
          <View
            style={[styles.unitOption, unit === 'inch' && styles.unitOptionActive]}
            onTouchEnd={() => setUnit('inch')}
          >
            <Text style={[styles.unitOptionText, unit === 'inch' && styles.unitOptionTextActive]}>inch</Text>
          </View>
        </View>
      </View>

      <SectionCard
        title="Your measurements"
        subtitle="Used for fit scoring and size recommendations. All values stored in cm internally."
      >
        {FIELDS.map(({ key, label, hint }, i) => (
          <View key={key} style={[styles.inputRow, i < FIELDS.length - 1 && styles.inputRowBorder]}>
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
        ))}
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
