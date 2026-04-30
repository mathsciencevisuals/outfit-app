import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";

const occasionOptions = ["Casual", "Business", "Formal", "Party", "Sport", "Travel"] as const;
const colorOptions = ["Black", "White", "Navy", "Beige", "Earth Tones", "Bold Colors"] as const;
const fitOptions = ["Slim", "Regular", "Loose"] as const;

function normalizeArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function StylePreferencesScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);

  const { data: profileData } = useAsyncResource(
    () => mobileApi.profile(userId),
    [userId],
  );

  const [occasions, setOccasions] = useState<string[]>(["Casual", "Formal"]);
  const [colorsSelected, setColorsSelected] = useState<string[]>(["Black", "Navy"]);
  const [fit, setFit] = useState<(typeof fitOptions)[number]>("Regular");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profileData) return;
    const stylePreference = (profileData.stylePreference ?? {}) as Record<string, unknown>;
    const nextOccasions = normalizeArray(stylePreference.occasions);
    const nextColors = (profileData.preferredColors ?? []).map(String);
    const fitLabel = String(stylePreference.fitPreferenceLabel ?? profileData.fitPreference ?? "Regular");

    if (nextOccasions.length > 0) setOccasions(nextOccasions);
    if (nextColors.length > 0) setColorsSelected(nextColors);
    setFit(fitOptions.find((o) => o.toLowerCase() === fitLabel.toLowerCase()) ?? "Regular");
  }, [profileData]);

  const fitPreferenceValue = useMemo(
    () => (fit === "Slim" ? "slim" : fit === "Loose" ? "relaxed" : "regular"),
    [fit],
  );

  const toggleItem = (value: string, collection: string[], setCollection: (v: string[]) => void) => {
    setCollection(collection.includes(value) ? collection.filter((e) => e !== value) : [...collection, value]);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await mobileApi.updateStylePreferences(userId, {
        stylePreference: {
          ...(profileData?.stylePreference ?? {}),
          occasions,
          preferredStyles: occasions,
          fitPreferenceLabel: fit,
        },
        preferredColors: colorsSelected,
        avoidedColors: profileData?.avoidedColors ?? [],
        budgetMin: profileData?.budgetMin ?? null,
        budgetMax: profileData?.budgetMax ?? null,
        budgetLabel: profileData?.budgetLabel ?? null,
      });

      await mobileApi.updateProfile(userId, {
        firstName: profileData?.firstName ?? "FitMe",
        lastName: profileData?.lastName ?? "Member",
        fitPreference: fitPreferenceValue,
        preferredColors: colorsSelected,
        avoidedColors: profileData?.avoidedColors ?? [],
        stylePreference: {
          ...(profileData?.stylePreference ?? {}),
          occasions,
          preferredStyles: occasions,
          fitPreferenceLabel: fit,
        },
        budgetMin: profileData?.budgetMin ?? null,
        budgetMax: profileData?.budgetMax ?? null,
        budgetLabel: profileData?.budgetLabel ?? null,
        closetStatus: profileData?.closetStatus ?? "ACTIVE",
      });

      router.push("/budget" as never);
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.title}>Style Preferences</Text>
          <Text style={styles.step}>Step 2 of 3</Text>
        </View>

        <PreferenceCard title="Occasions">
          <View style={styles.wrapRow}>
            {occasionOptions.map((entry) => (
              <Chip key={entry} label={entry} selected={occasions.includes(entry)} onPress={() => toggleItem(entry, occasions, setOccasions)} />
            ))}
          </View>
        </PreferenceCard>

        <PreferenceCard title="Colors You Like">
          <View style={styles.wrapRow}>
            {colorOptions.map((entry) => (
              <Chip key={entry} label={entry} selected={colorsSelected.includes(entry)} onPress={() => toggleItem(entry, colorsSelected, setColorsSelected)} />
            ))}
          </View>
        </PreferenceCard>

        <PreferenceCard title="Fit Preference">
          <View style={styles.fitRow}>
            {fitOptions.map((entry) => (
              <Chip key={entry} label={entry} selected={fit === entry} onPress={() => setFit(entry)} />
            ))}
          </View>
        </PreferenceCard>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton onPress={save} disabled={saving}>
          {saving ? "Saving..." : "Continue"}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

function PreferenceCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16 },
  header: { gap: 4 },
  title: { color: colors.inkOnDark, fontSize: 30, lineHeight: 34, fontWeight: "800" },
  step: { color: colors.inkOnDarkSoft, fontSize: 14 },
  card: {
    gap: 14,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark,
  },
  cardTitle: { color: colors.inkOnDark, fontSize: 16, fontWeight: "700" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fitRow: { flexDirection: "row", gap: 10 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accentStrong },
  chipText: { color: colors.inkOnDarkSoft, fontSize: 14, fontWeight: "700" },
  chipTextSelected: { color: colors.inkOnDark },
  message: { color: "#fda4af", fontSize: 14 },
  pressed: { opacity: 0.92 },
});
