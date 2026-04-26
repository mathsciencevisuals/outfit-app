import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { RangeSlider } from "../../components/RangeSlider";
import { Screen } from "../../components/Screen";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";

const budgetOptions = [
  { label: "Budget", range: [0, 50] as const, description: "$0 - $50" },
  { label: "Mid-Range", range: [50, 150] as const, description: "$50 - $150" },
  { label: "Premium", range: [150, 300] as const, description: "$150 - $300" },
  { label: "Luxury", range: [300, 1000] as const, description: "$300+" }
] as const;

export function BudgetScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const profile = useAppStore((state) => state.profile);

  const [budgetLabel, setBudgetLabel] = useState<(typeof budgetOptions)[number]["label"]>("Mid-Range");
  const [monthlyBudget, setMonthlyBudget] = useState(300);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const nextLabel = budgetOptions.find((entry) => entry.label === profile.budgetLabel)?.label;
    if (nextLabel) {
      setBudgetLabel(nextLabel);
    }
    if (profile.budgetMax != null) {
      setMonthlyBudget(profile.budgetMax);
    }
  }, [profile]);

  const selectedBudget = budgetOptions.find((entry) => entry.label === budgetLabel) ?? budgetOptions[1];

  const save = async () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await Promise.all([
        mobileApi.updateStylePreferences(userId, {
          stylePreference: {
            ...(profile.stylePreference ?? {}),
            monthlyBudget
          },
          preferredColors: profile.preferredColors ?? [],
          avoidedColors: profile.avoidedColors ?? [],
          budgetMin: selectedBudget.range[0],
          budgetMax: monthlyBudget,
          budgetLabel
        }),
        mobileApi.updateProfile(userId, {
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUploadId: profile.avatarUploadId ?? null,
          avatarUrl: profile.avatarUrl ?? null,
          gender: profile.gender ?? null,
          age: profile.age ?? null,
          heightCm: profile.heightCm ?? null,
          weightKg: profile.weightKg ?? null,
          bodyShape: profile.bodyShape ?? null,
          fitPreference: profile.fitPreference ?? "regular",
          budgetMin: selectedBudget.range[0],
          budgetMax: monthlyBudget,
          budgetLabel,
          closetStatus: profile.closetStatus ?? "ACTIVE",
          stylePreference: {
            ...(profile.stylePreference ?? {}),
            monthlyBudget
          },
          preferredColors: profile.preferredColors ?? [],
          avoidedColors: profile.avoidedColors ?? []
        })
      ]);

      router.replace("/feed");
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not save budget.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.title}>Budget Range</Text>
          <Text style={styles.step}>Step 3 of 3</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Range per Item</Text>
          <View style={styles.grid}>
            {budgetOptions.map((entry) => (
              <Pressable key={entry.label} onPress={() => setBudgetLabel(entry.label)} style={({ pressed }) => [styles.optionCard, budgetLabel === entry.label && styles.optionCardSelected, pressed && styles.pressed]}>
                <Text style={[styles.optionTitle, budgetLabel === entry.label && styles.optionTitleSelected]}>{entry.description}</Text>
                <Text style={[styles.optionBody, budgetLabel === entry.label && styles.optionBodySelected]}>{entry.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Budget</Text>
          <Text style={styles.amount}>${monthlyBudget} / month</Text>
          <RangeSlider min={0} max={1000} value={monthlyBudget} onChange={setMonthlyBudget} leftLabel="$0" rightLabel="$1000" />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton onPress={save} disabled={saving || !profile}>
          {saving ? "Saving..." : "Complete Setup"}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  header: {
    gap: 4
  },
  title: {
    color: colors.inkOnDark,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800"
  },
  step: {
    color: colors.inkOnDarkSoft,
    fontSize: 14
  },
  card: {
    gap: 14,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  cardTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  optionCard: {
    width: "47%",
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 6
  },
  optionCardSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  optionTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "800"
  },
  optionTitleSelected: {
    color: colors.inkOnDark
  },
  optionBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 13
  },
  optionBodySelected: {
    color: colors.inkOnDark
  },
  amount: {
    color: colors.accent,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800"
  },
  message: {
    color: "#fda4af",
    fontSize: 14
  },
  pressed: {
    opacity: 0.92
  }
});
