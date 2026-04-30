import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { RangeSlider } from "../../components/RangeSlider";
import { Screen } from "../../components/Screen";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import { formatPrice } from "../../utils/currency";

const budgetOptions = [
  { label: "Thrifty",    range: [0,    500]  as const, description: "Under ₹500"         },
  { label: "Mid-Range",  range: [500,  2000] as const, description: "₹500 – ₹2,000"      },
  { label: "Premium",    range: [2000, 5000] as const, description: "₹2,000 – ₹5,000"    },
  { label: "Luxury",     range: [5000, 20000] as const, description: "₹5,000+"            },
] as const;

type BudgetLabel = (typeof budgetOptions)[number]["label"];

export function BudgetScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);

  const { data: profileData } = useAsyncResource(
    () => mobileApi.profile(userId),
    [userId],
  );

  const [budgetLabel, setBudgetLabel] = useState<BudgetLabel>("Mid-Range");
  const [monthlyBudget, setMonthlyBudget] = useState(2000);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profileData) return;
    const matched = budgetOptions.find((o) => o.label === profileData.budgetLabel);
    if (matched) setBudgetLabel(matched.label);
    if (profileData.budgetMax != null) setMonthlyBudget(profileData.budgetMax);
  }, [profileData]);

  const selectedBudget = budgetOptions.find((o) => o.label === budgetLabel) ?? budgetOptions[1];

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await mobileApi.updateStylePreferences(userId, {
        stylePreference: {
          ...(profileData?.stylePreference ?? {}),
          monthlyBudget,
        },
        preferredColors: profileData?.preferredColors ?? [],
        avoidedColors:   profileData?.avoidedColors   ?? [],
        budgetMin:   selectedBudget.range[0],
        budgetMax:   monthlyBudget,
        budgetLabel,
      });

      await mobileApi.updateProfile(userId, {
        firstName:   profileData?.firstName   ?? "FitMe",
        lastName:    profileData?.lastName    ?? "Member",
        fitPreference: profileData?.fitPreference ?? "regular",
        budgetMin:   selectedBudget.range[0],
        budgetMax:   monthlyBudget,
        budgetLabel,
        closetStatus: profileData?.closetStatus ?? "ACTIVE",
        stylePreference: {
          ...(profileData?.stylePreference ?? {}),
          monthlyBudget,
        },
        preferredColors: profileData?.preferredColors ?? [],
        avoidedColors:   profileData?.avoidedColors   ?? [],
      });

      router.replace("/dashboard" as never);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Could not save budget.");
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
            {budgetOptions.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setBudgetLabel(opt.label)}
                style={({ pressed }) => [
                  styles.optionCard,
                  budgetLabel === opt.label && styles.optionCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionTitle, budgetLabel === opt.label && styles.optionTitleSelected]}>
                  {opt.description}
                </Text>
                <Text style={[styles.optionBody, budgetLabel === opt.label && styles.optionBodySelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Budget</Text>
          <Text style={styles.amount}>{formatPrice(monthlyBudget)} / month</Text>
          <RangeSlider
            min={0}
            max={20000}
            value={monthlyBudget}
            onChange={setMonthlyBudget}
            leftLabel="₹0"
            rightLabel="₹20,000"
          />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <PrimaryButton onPress={save} disabled={saving}>
          {saving ? "Saving..." : "Complete Setup"}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell:  { gap: 16 },
  header: { gap: 4 },
  title:  { color: colors.inkOnDark, fontSize: 30, lineHeight: 34, fontWeight: "800" },
  step:   { color: colors.inkOnDarkSoft, fontSize: 14 },
  card: {
    gap: 14,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark,
  },
  cardTitle: { color: colors.inkOnDark, fontSize: 16, fontWeight: "700" },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionCard: {
    width: "47%",
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 6,
  },
  optionCardSelected:   { backgroundColor: colors.accent, borderColor: colors.accentStrong },
  optionTitle:          { color: colors.inkOnDark, fontSize: 14, fontWeight: "800" },
  optionTitleSelected:  { color: colors.inkOnDark },
  optionBody:           { color: colors.inkOnDarkSoft, fontSize: 13 },
  optionBodySelected:   { color: colors.inkOnDark },
  amount:   { color: colors.accent, fontSize: 28, lineHeight: 32, fontWeight: "800" },
  message:  { color: "#fda4af", fontSize: 14 },
  pressed:  { opacity: 0.92 },
});
