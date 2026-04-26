import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { RangeSlider } from "../../components/RangeSlider";
import { Screen } from "../../components/Screen";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";

const bodyTypes = ["Slim", "Average", "Athletic"] as const;

export function MeasurementsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const profile = useAppStore((state) => state.profile);

  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [bodyType, setBodyType] = useState<(typeof bodyTypes)[number]>("Average");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setHeight(profile.heightCm ?? 170);
    setWeight(profile.weightKg ?? 65);
    setBodyType((bodyTypes.find((entry) => entry.toLowerCase() === String(profile.bodyShape ?? "").toLowerCase()) ?? "Average"));
  }, [profile]);

  const save = async () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await Promise.all([
        mobileApi.updateProfile(userId, {
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUploadId: profile.avatarUploadId ?? null,
          avatarUrl: profile.avatarUrl ?? null,
          gender: profile.gender ?? null,
          age: profile.age ?? null,
          heightCm: height,
          weightKg: weight,
          bodyShape: bodyType,
          fitPreference: profile.fitPreference ?? "regular",
          budgetMin: profile.budgetMin ?? null,
          budgetMax: profile.budgetMax ?? null,
          budgetLabel: profile.budgetLabel ?? null,
          closetStatus: profile.closetStatus ?? "ACTIVE",
          stylePreference: profile.stylePreference ?? null,
          preferredColors: profile.preferredColors ?? [],
          avoidedColors: profile.avoidedColors ?? []
        }),
        mobileApi.saveMeasurement(userId, {
          id: profile.measurements?.[0]?.id,
          chestCm: profile.measurements?.[0]?.chestCm ?? null,
          waistCm: profile.measurements?.[0]?.waistCm ?? null,
          hipsCm: profile.measurements?.[0]?.hipsCm ?? null,
          inseamCm: profile.measurements?.[0]?.inseamCm ?? null,
          shoulderCm: profile.measurements?.[0]?.shoulderCm ?? null,
          footLengthCm: profile.measurements?.[0]?.footLengthCm ?? null,
          source: profile.measurements?.[0]?.source ?? "manual"
        })
      ]);

      router.push("/style-preferences" as never);
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not save measurements.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <Header title="Your Measurements" step="Step 1 of 3" />

        <View style={styles.card}>
          <Text style={styles.label}>Height</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={`${height}`}
              onChangeText={(value) => setHeight(Number(value.replace(/[^0-9]/g, "")) || 0)}
              keyboardType="numeric"
              style={styles.numericInput}
              placeholderTextColor={colors.inkMuted}
            />
            <Text style={styles.unit}>cm</Text>
          </View>
          <RangeSlider min={140} max={220} value={height} onChange={setHeight} leftLabel="140 cm" rightLabel="220 cm" />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Weight</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={`${weight}`}
              onChangeText={(value) => setWeight(Number(value.replace(/[^0-9]/g, "")) || 0)}
              keyboardType="numeric"
              style={styles.numericInput}
              placeholderTextColor={colors.inkMuted}
            />
            <Text style={styles.unit}>kg</Text>
          </View>
          <RangeSlider min={40} max={150} value={weight} onChange={setWeight} leftLabel="40 kg" rightLabel="150 kg" />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Body Type</Text>
          <View style={styles.chipRow}>
            {bodyTypes.map((entry) => (
              <Chip key={entry} label={entry} selected={bodyType === entry} onPress={() => setBodyType(entry)} />
            ))}
          </View>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton onPress={save} disabled={saving || !profile}>
          {saving ? "Saving..." : "Continue"}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

function Header({ title, step }: { title: string; step: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.step}>{step}</Text>
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
  label: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  numericInput: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 16,
    color: colors.inkOnDark,
    fontSize: 24,
    fontWeight: "800"
  },
  unit: {
    color: colors.inkOnDarkSoft,
    fontSize: 16,
    fontWeight: "700"
  },
  chipRow: {
    flexDirection: "row",
    gap: 10
  },
  chip: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  chipText: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    fontWeight: "700"
  },
  chipTextSelected: {
    color: colors.inkOnDark
  },
  message: {
    color: "#fda4af",
    fontSize: 14
  },
  pressed: {
    opacity: 0.92
  }
});
