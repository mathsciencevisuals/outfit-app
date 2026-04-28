import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { ONBOARDED_KEY } from '../../../app/_layout';
import { PrimaryButton }  from '../../components/PrimaryButton';
import { Screen }         from '../../components/Screen';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }      from '../../services/api';
import { useAppStore }    from '../../store/app-store';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

// ── Data ──────────────────────────────────────────────────────────────────────

const STYLES = [
  { key: 'casual',     label: 'Casual',      emoji: '👕' },
  { key: 'formal',     label: 'Formal',      emoji: '👔' },
  { key: 'streetwear', label: 'Streetwear',  emoji: '🧢' },
  { key: 'ethnic',     label: 'Ethnic / Traditional', emoji: '🛕' },
  { key: 'sporty',     label: 'Sporty',      emoji: '🏃' },
  { key: 'bohemian',   label: 'Bohemian',    emoji: '🌸' },
  { key: 'minimalist', label: 'Minimalist',  emoji: '⚪' },
  { key: 'party',      label: 'Party / Night out', emoji: '🎉' },
];

const COLORS = [
  { key: 'black',   label: 'Black',   swatch: '#1a1a1a' },
  { key: 'white',   label: 'White',   swatch: '#f5f5f5' },
  { key: 'navy',    label: 'Navy',    swatch: '#1e3a5f' },
  { key: 'beige',   label: 'Beige',   swatch: '#d4b896' },
  { key: 'red',     label: 'Red',     swatch: '#dc2626' },
  { key: 'green',   label: 'Green',   swatch: '#16a34a' },
  { key: 'yellow',  label: 'Yellow',  swatch: '#eab308' },
  { key: 'pink',    label: 'Pink',    swatch: '#ec4899' },
  { key: 'blue',    label: 'Blue',    swatch: '#3b82f6' },
  { key: 'orange',  label: 'Orange',  swatch: '#f97316' },
];

const BUDGETS = [
  { key: 'under500',    label: 'Under ₹500'      },
  { key: '500_2000',    label: '₹500 – ₹2,000'   },
  { key: '2000_5000',   label: '₹2,000 – ₹5,000' },
  { key: 'above5000',   label: 'Above ₹5,000'    },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function StylePreferencesScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const { data: profile, refetch } = useAsyncResource(
    () => mobileApi.profile(userId),
    [userId],
  );

  const [selectedStyles,  setStyles]  = useState<Set<string>>(new Set());
  const [selectedColors,  setColors]  = useState<Set<string>>(new Set());
  const [selectedBudget,  setBudget]  = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    const stylePreference = (profile?.stylePreference as Record<string, unknown> | undefined) ?? {};
    const savedStyles =
      Array.isArray(stylePreference.styles) ? stylePreference.styles :
      Array.isArray(stylePreference.preferredStyles) ? stylePreference.preferredStyles :
      Array.isArray(stylePreference.occasions) ? stylePreference.occasions :
      [];

    setStyles(new Set(savedStyles.map(String)));
    setColors(new Set((profile?.preferredColors ?? []).map(String)));

    const savedBudgetKey = BUDGETS.find((entry) => entry.label === profile?.budgetLabel)?.key ?? null;
    setBudget(savedBudgetKey);
  }, [profile]);

  const toggle = (set: Set<string>, key: string): Set<string> => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  };

  const handleDone = useCallback(async () => {
    setSaving(true);
    try {
      await mobileApi.saveStylePreferences(userId, {
        styles:  Array.from(selectedStyles),
        colors:  Array.from(selectedColors),
        budget:  selectedBudget ?? undefined,
      });
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
      router.replace('/discover');
    } catch (err) {
      Alert.alert('Save failed', 'Your preferences could not be saved. You can update them later in Profile.');
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
      router.replace('/discover');
    } finally {
      setSaving(false);
    }
  }, [selectedStyles, selectedColors, selectedBudget, userId, router]);

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    router.replace('/discover');
  }, [router]);

  return (
    <Screen scroll>
      {/* ── Style ── */}
      <Text style={styles.sectionTitle}>Your style</Text>
      <Text style={styles.sectionSub}>Pick all that apply</Text>
      <View style={styles.chipGrid}>
        {STYLES.map((s) => {
          const active = selectedStyles.has(s.key);
          return (
            <Pressable
              key={s.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStyles(toggle(selectedStyles, s.key))}
            >
              <Text style={styles.chipEmoji}>{s.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Colours ── */}
      <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Favourite colours</Text>
      <View style={styles.colorGrid}>
        {COLORS.map((c) => {
          const active = selectedColors.has(c.key);
          return (
            <Pressable
              key={c.key}
              style={styles.colorItem}
              onPress={() => setColors(toggle(selectedColors, c.key))}
            >
              <View style={[
                styles.colorSwatch,
                { backgroundColor: c.swatch },
                active && styles.colorSwatchActive,
                c.key === 'white' && styles.colorSwatchWhite,
              ]}>
                {active && <Text style={[styles.colorCheck, c.key === 'white' && { color: '#333' }]}>✓</Text>}
              </View>
              <Text style={styles.colorLabel}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Budget ── */}
      <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Budget per outfit</Text>
      <View style={styles.budgetList}>
        {BUDGETS.map((b) => {
          const active = selectedBudget === b.key;
          return (
            <Pressable
              key={b.key}
              style={[styles.budgetRow, active && styles.budgetRowActive]}
              onPress={() => setBudget(b.key)}
            >
              <Text style={[styles.budgetLabel, active && styles.budgetLabelActive]}>{b.label}</Text>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        <PrimaryButton onPress={handleDone} loading={saving}>
          Complete setup →
        </PrimaryButton>
        <PrimaryButton variant="ghost" onPress={handleSkip}>
          Skip for now
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  // Style chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },
  chip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    paddingVertical:  9,
    paddingHorizontal: Spacing.md,
    borderRadius:   Radius.full,
    backgroundColor: Colors.surface,
    borderWidth:    1,
    borderColor:    Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryDim,
    borderColor:    Colors.primary,
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipLabelActive: { color: Colors.primary },

  // Colour swatches
  colorGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.md,
  },
  colorItem: { alignItems: 'center', gap: 5, width: 56 },
  colorSwatch: {
    width:        48,
    height:       48,
    borderRadius: 24,
    alignItems:   'center',
    justifyContent: 'center',
    borderWidth:  2,
    borderColor:  'transparent',
  },
  colorSwatchActive: { borderColor: Colors.primary },
  colorSwatchWhite:  { borderColor: Colors.border },
  colorCheck:        { color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold },
  colorLabel:        { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },

  // Budget list
  budgetList: { gap: Spacing.xs },
  budgetRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        Spacing.md,
    borderRadius:   Radius.md,
    backgroundColor: Colors.surface,
    borderWidth:    1,
    borderColor:    Colors.border,
  },
  budgetRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  budgetLabel:     { fontSize: FontSize.base, color: Colors.textSecondary },
  budgetLabelActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  radio: {
    width:        20,
    height:       20,
    borderRadius: 10,
    borderWidth:  2,
    borderColor:  Colors.border,
    alignItems:   'center',
    justifyContent: 'center',
  },
  radioActive:  { borderColor: Colors.primary },
  radioDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  actions: { gap: Spacing.sm, marginTop: Spacing.xl },
});
