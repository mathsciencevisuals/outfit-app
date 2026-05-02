import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { PrimaryButton }  from '../../components/PrimaryButton';
import { Screen }         from '../../components/Screen';
import { SectionCard }    from '../../components/SectionCard';
import { mobileApi }      from '../../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

type BoardEntry = { key: string; boardId: string };

const BOARD_GROUPS: Array<{ title: string; subtitle: string; keys: string[] }> = [
  {
    title: 'Gender boards',
    subtitle: 'One board per gender — the main personal filter',
    keys: ['men', 'women', 'unisex'],
  },
  {
    title: 'Style boards',
    subtitle: 'Matched to user style preferences',
    keys: ['casual', 'formal', 'streetwear', 'ethnic', 'sports', 'minimalist', 'party', 'bohemian'],
  },
  {
    title: 'Colour boards',
    subtitle: 'Matched to user favourite colours',
    keys: ['black', 'white', 'earthy', 'blue', 'navy', 'pink', 'red', 'green', 'brights'],
  },
  {
    title: 'Budget boards',
    subtitle: 'These boards earn CueLinks affiliate commissions on every purchase',
    keys: ['under500', '500_2000', '2000_5000', 'above5000'],
  },
  {
    title: 'Size boards',
    subtitle: 'Matched to user clothing size',
    keys: ['xs_s', 'm_l', 'xl_xxl', 'plus'],
  },
];

const BOARD_LABELS: Record<string, string> = {
  men: 'FitMe - Men', women: 'FitMe - Women', unisex: 'FitMe - Unisex',
  casual: 'FitMe - Casual', formal: 'FitMe - Formal',
  streetwear: 'FitMe - Streetwear', ethnic: 'FitMe - Ethnic Indian',
  sports: 'FitMe - Sports & Active', minimalist: 'FitMe - Minimalist',
  party: 'FitMe - Party & Festive', bohemian: 'FitMe - Bohemian',
  black: 'FitMe - Black Outfits', white: 'FitMe - White & Ivory',
  earthy: 'FitMe - Earth Tones', blue: 'FitMe - Blues', navy: 'FitMe - Navy & Denim',
  pink: 'FitMe - Pinks & Reds', red: 'FitMe - Pinks & Reds',
  green: 'FitMe - Greens', brights: 'FitMe - Brights & Neons',
  under500: 'FitMe - Under ₹500', '500_2000': 'FitMe - ₹500 to ₹2000',
  '2000_5000': 'FitMe - ₹2000 to ₹5000', above5000: 'FitMe - Above ₹5000',
  xs_s: 'FitMe - XS & S Sizes', m_l: 'FitMe - M & L Sizes',
  xl_xxl: 'FitMe - XL & XXL Sizes', plus: 'FitMe - Plus Size Fashion',
};

export function AdminPinterestScreen() {
  const router = useRouter();
  const [entries, setEntries]   = useState<BoardEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);

  useEffect(() => {
    mobileApi.adminGetPinterestBoards()
      .then((data) => setEntries(data))
      .catch(() => Alert.alert('Error', 'Could not load board list.'))
      .finally(() => setLoading(false));
  }, []);

  const setId = (key: string, boardId: string) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, boardId } : e));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = await mobileApi.adminUpdatePinterestBoards(entries);
      Alert.alert('Saved', `${result.updated} board ID${result.updated !== 1 ? 's' : ''} saved.`);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [entries]);

  const filledCount = entries.filter((e) => e.boardId.trim()).length;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Pinterest Boards</Text>
        <Text style={styles.subtitle}>
          Paste the numeric board ID from each Pinterest board URL.{'\n'}
          pinterest.com/fitme-account/<Text style={styles.mono}>BOARD-ID</Text>/
        </Text>
        <View style={styles.progressRow}>
          <View style={[styles.progressBar, { width: `${Math.round((filledCount / Math.max(entries.length, 1)) * 100)}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{filledCount} / {entries.length} boards configured</Text>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : (
        BOARD_GROUPS.map((group) => {
          const groupEntries = entries.filter((e) => group.keys.includes(e.key));
          if (!groupEntries.length) return null;
          return (
            <SectionCard key={group.title} title={group.title} subtitle={group.subtitle}>
              {groupEntries.map(({ key, boardId }, i) => (
                <View key={key} style={[styles.row, i < groupEntries.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowMeta}>
                    <Text style={styles.boardLabel}>{BOARD_LABELS[key] ?? key}</Text>
                    <Text style={styles.boardKey}>{key}</Text>
                  </View>
                  <TextInput
                    style={[styles.input, boardId.trim() ? styles.inputFilled : undefined]}
                    value={boardId}
                    onChangeText={(v) => setId(key, v.trim())}
                    placeholder="Board ID"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />
                </View>
              ))}
            </SectionCard>
          );
        })
      )}

      {!loading && (
        <>
          <PrimaryButton onPress={handleSave} loading={saving}>
            Save all board IDs
          </PrimaryButton>
          <PrimaryButton variant="secondary" onPress={() => router.push('/admin-pinterest-pin' as never)}>
            📌  Create / post pins
          </PrimaryButton>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.xs, marginBottom: Spacing.md },
  title: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  mono: { fontFamily: 'monospace', color: Colors.primary },

  progressRow: {
    height: 4,
    backgroundColor: Colors.surface2,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },

  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: Spacing.lg,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowMeta: { flex: 1, gap: 2 },
  boardLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  boardKey:   { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace' },
  input: {
    width: 130,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    textAlign: 'right',
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface2,
  },
  inputFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
});
