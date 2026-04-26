import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ONBOARDED_KEY } from '../../../app/_layout';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/app-store';
import type { AccentColor, ThemeMode } from '../../store/app-store';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';

const ACCENTS: { key: AccentColor; color: string }[] = [
  { key: 'teal',   color: '#0f766e' },
  { key: 'purple', color: '#7c3aed' },
  { key: 'blue',   color: '#1d4ed8' },
  { key: 'pink',   color: '#db2777' },
];

export function SettingsScreen() {
  const { C, theme, accent } = useTheme();
  const setTheme  = useAppStore(s => s.setTheme);
  const setAccent = useAppStore(s => s.setAccent);
  const router    = useRouter();

  const [trending,   setTrending]   = useState(true);
  const [priceDrops, setPriceDrops] = useState(true);
  const [arrivals,   setArrivals]   = useState(false);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: C.textPrimary }]}>Settings</Text>
      <Text style={[styles.sub,   { color: C.textSecondary }]}>Customize your FITME.AI experience</Text>

      {/* Appearance */}
      <View style={[styles.card, { backgroundColor: C.surface }, Shadow.sm]}>
        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Appearance</Text>

        <Text style={[styles.subLabel, { color: C.textPrimary }]}>Theme Mode</Text>
        <View style={styles.row2}>
          {(['light', 'dark'] as ThemeMode[]).map(t => (
            <Pressable key={t} style={[styles.themeBtn, { backgroundColor: C.surface2,
              borderColor: theme === t ? C.primary : C.border, borderWidth: theme === t ? 2 : 1 }]}
              onPress={() => setTheme(t)}>
              <Ionicons name={t === 'light' ? 'sunny-outline' : 'moon-outline'} size={18}
                color={theme === t ? C.primary : C.textMuted} />
              <Text style={[styles.themeTxt, { color: theme === t ? C.primary : C.textSecondary }]}>
                {t === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.subLabel, { color: C.textPrimary, marginTop: Spacing.md }]}>Accent Color</Text>
        <View style={styles.row4}>
          {ACCENTS.map(a => (
            <Pressable key={a.key} style={[styles.accentBtn, { backgroundColor: a.color }]}
              onPress={() => setAccent(a.key)}>
              {accent === a.key && <Ionicons name="checkmark" size={22} color="#fff" />}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={[styles.card, { backgroundColor: C.surface }, Shadow.sm]}>
        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Notifications</Text>
        {[
          { label: 'Trending Alerts',  sub: 'Get notified about trending outfits', val: trending,   set: setTrending   },
          { label: 'Price Drops',      sub: 'Alert when saved items go on sale',   val: priceDrops, set: setPriceDrops },
          { label: 'New Arrivals',     sub: 'Weekly updates on new styles',        val: arrivals,   set: setArrivals   },
        ].map(n => (
          <View key={n.label} style={[styles.settingRow, { borderTopColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{n.label}</Text>
              <Text style={[styles.rowSub,   { color: C.textSecondary }]}>{n.sub}</Text>
            </View>
            <Switch value={n.val} onValueChange={n.set} trackColor={{ true: C.primary }} thumbColor="#fff" />
          </View>
        ))}
      </View>

      {/* Region */}
      <View style={[styles.card, { backgroundColor: C.surface }, Shadow.sm]}>
        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Region</Text>
        <View style={[styles.settingRow, { borderTopColor: C.border }]}>
          <Text style={[styles.rowLabel, { color: C.textPrimary }]}>Currency</Text>
          <Text style={[styles.rowSub, { color: C.textSecondary }]}>₹ Indian Rupee</Text>
        </View>
        <View style={[styles.settingRow, { borderTopColor: C.border }]}>
          <Text style={[styles.rowLabel, { color: C.textPrimary }]}>Language</Text>
          <Text style={[styles.rowSub, { color: C.textSecondary }]}>English</Text>
        </View>
      </View>

      {/* Privacy */}
      <View style={[styles.card, { backgroundColor: C.surface }, Shadow.sm]}>
        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Privacy & Data</Text>
        <Pressable style={[styles.privacyRow, { backgroundColor: C.surface2 }]}>
          <Text style={[styles.rowLabel, { color: C.textPrimary }]}>Export My Data</Text>
          <Text style={[styles.rowSub,   { color: C.textSecondary }]}>Download all your data</Text>
        </Pressable>
        <Pressable style={[styles.privacyRow, { backgroundColor: C.surface2 }]}
          onPress={() => Alert.alert('Reset onboarding', 'Restart the setup flow?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: async () => {
              await AsyncStorage.removeItem(ONBOARDED_KEY);
              router.replace('/onboarding');
            }},
          ])}>
          <Text style={[styles.rowLabel, { color: C.error }]}>Reset Onboarding</Text>
          <Text style={[styles.rowSub,   { color: C.textSecondary }]}>Restart the setup flow</Text>
        </Pressable>
        <Pressable style={[styles.privacyRow, { backgroundColor: C.surface2 }]}>
          <Text style={[styles.rowLabel, { color: C.error }]}>Delete Account</Text>
          <Text style={[styles.rowSub,   { color: C.textSecondary }]}>Permanently delete your account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { padding: Spacing.base, paddingBottom: 80, gap: Spacing.md },
  title:      { fontSize: FontSize.xl,  fontWeight: FontWeight.bold   },
  sub:        { fontSize: FontSize.sm,  marginBottom: Spacing.sm      },
  card:       { borderRadius: Radius.lg, padding: Spacing.base, gap: 6 },
  cardTitle:  { fontSize: FontSize.md,  fontWeight: FontWeight.bold, marginBottom: 4 },
  subLabel:   { fontSize: FontSize.sm,  fontWeight: FontWeight.medium, marginBottom: 6 },
  row2:       { flexDirection: 'row', gap: Spacing.sm },
  row4:       { flexDirection: 'row', gap: Spacing.sm },
  themeBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: Radius.md },
  themeTxt:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  accentBtn:  { width: 56, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  rowLabel:   { fontSize: FontSize.base, fontWeight: FontWeight.medium },
  rowSub:     { fontSize: FontSize.xs, marginTop: 2 },
  privacyRow: { borderRadius: Radius.md, padding: Spacing.md, marginTop: 4, gap: 2 },
});
