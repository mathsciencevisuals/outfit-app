import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import type { FitPreference } from "../../types/api";

const fitPreferenceOptions: FitPreference[] = ["slim", "regular", "relaxed"];

export function MeasurementsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const setProfile = useAppStore((state) => state.setProfile);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, loading, error } = useAsyncResource(async () => {
    const fitProfile = await mobileApi.fitProfile();
    if (fitProfile.profile) {
      setProfile(fitProfile.profile);
    }
    return fitProfile;
  }, [userId, refreshKey]);

  const profile = data?.profile ?? null;
  const latest = data?.latestMeasurement ?? null;

  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [fitPreference, setFitPreference] = useState<FitPreference>("regular");
  const [chestCm, setChestCm] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [hipsCm, setHipsCm] = useState("");
  const [inseamCm, setInseamCm] = useState("");
  const [shoulderCm, setShoulderCm] = useState("");
  const [footLengthCm, setFootLengthCm] = useState("");

  useEffect(() => {
    setHeightCm(profile?.heightCm != null ? `${profile.heightCm}` : "");
    setWeightKg(profile?.weightKg != null ? `${profile.weightKg}` : "");
    setFitPreference(profile?.fitPreference ?? "regular");
    setChestCm(latest?.chestCm != null ? `${latest.chestCm}` : "");
    setWaistCm(latest?.waistCm != null ? `${latest.waistCm}` : "");
    setHipsCm(latest?.hipsCm != null ? `${latest.hipsCm}` : "");
    setInseamCm(latest?.inseamCm != null ? `${latest.inseamCm}` : "");
    setShoulderCm(latest?.shoulderCm != null ? `${latest.shoulderCm}` : "");
    setFootLengthCm(latest?.footLengthCm != null ? `${latest.footLengthCm}` : "");
  }, [latest, profile]);

  const coverage = useMemo(
    () =>
      [
        chestCm,
        waistCm,
        hipsCm,
        inseamCm,
        shoulderCm,
        footLengthCm,
        heightCm
      ].filter((value) => value != null && value !== "").length,
    [chestCm, footLengthCm, heightCm, hipsCm, inseamCm, shoulderCm, waistCm]
  );

  const saveMeasurements = async () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const [savedMeasurement, nextProfile] = await Promise.all([
        mobileApi.saveMeasurement(userId, {
          id: latest?.id,
          chestCm: chestCm ? Number(chestCm) : null,
          waistCm: waistCm ? Number(waistCm) : null,
          hipsCm: hipsCm ? Number(hipsCm) : null,
          inseamCm: inseamCm ? Number(inseamCm) : null,
          shoulderCm: shoulderCm ? Number(shoulderCm) : null,
          footLengthCm: footLengthCm ? Number(footLengthCm) : null,
          source: latest?.source ?? "manual"
        }),
        mobileApi.updateProfile(userId, {
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUploadId: profile.avatarUploadId ?? null,
          avatarUrl: profile.avatarUrl ?? null,
          gender: profile.gender ?? null,
          age: profile.age ?? null,
          heightCm: heightCm ? Number(heightCm) : null,
          weightKg: weightKg ? Number(weightKg) : null,
          bodyShape: profile.bodyShape ?? null,
          fitPreference,
          budgetMin: profile.budgetMin ?? null,
          budgetMax: profile.budgetMax ?? null,
          budgetLabel: profile.budgetLabel ?? null,
          closetStatus: profile.closetStatus ?? "COMING_SOON",
          stylePreference: profile.stylePreference ?? null,
          preferredColors: profile.preferredColors ?? [],
          avoidedColors: profile.avoidedColors ?? []
        })
      ]);

      setProfile({
        ...nextProfile,
        measurements: savedMeasurement ? [savedMeasurement] : nextProfile.measurements
      });
      setMessage("Fit profile saved")
      setRefreshKey((value) => value + 1);
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Measurements could not be saved");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <Screen>
        <LoadingState title="Measurements" subtitle="Loading fit calibration inputs." />
      </Screen>
    );
  }

  if (error && !profile) {
    return (
      <Screen>
        <ErrorState
          title="Measurements"
          message="Measurements could not be loaded from the API."
          actionLabel="Back to profile"
          onRetry={() => router.push("/profile")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Fit Profile"
        title="Body measurements and preference"
        subtitle="These values drive size recommendation, confidence, issue detection, and recommendation ranking."
      >
        <View style={styles.row}>
          <Pill label={`Coverage ${coverage}/7`} tone={coverage >= 5 ? "success" : "warning"} />
          <Pill label={`Preference ${fitPreference}`} tone="neutral" />
          <Pill label={data?.guidance ?? "Add more measurements for better confidence"} tone="accent" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Height" value={heightCm || "--"} caption="cm" />
          <MetricTile label="Chest" value={chestCm || "--"} caption="cm" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Waist" value={waistCm || "--"} caption="cm" />
          <MetricTile label="Hips" value={hipsCm || "--"} caption="cm" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Shoulder" value={shoulderCm || "--"} caption="cm" />
          <MetricTile label="Inseam" value={inseamCm || "--"} caption="cm" />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Preference" title="How close should the garment wear?">
        <Text style={styles.supportText}>
          Slim accepts slightly tighter suggestions, regular aims for balance, and relaxed tolerates extra room.
        </Text>
        <SegmentedControl options={fitPreferenceOptions} selected={fitPreference} onSelect={(value) => setFitPreference(value as FitPreference)} />
      </SectionCard>

      <SectionCard eyebrow="Manual Entry" title="Update your values">
        <View style={styles.inlineRow}>
          <TextInput style={[styles.input, styles.half]} value={heightCm} onChangeText={setHeightCm} placeholder="Height" keyboardType="numeric" placeholderTextColor="#978b7d" />
          <TextInput style={[styles.input, styles.half]} value={weightKg} onChangeText={setWeightKg} placeholder="Weight" keyboardType="numeric" placeholderTextColor="#978b7d" />
        </View>
        <View style={styles.inlineRow}>
          <TextInput style={[styles.input, styles.half]} value={chestCm} onChangeText={setChestCm} placeholder="Chest" keyboardType="numeric" placeholderTextColor="#978b7d" />
          <TextInput style={[styles.input, styles.half]} value={waistCm} onChangeText={setWaistCm} placeholder="Waist" keyboardType="numeric" placeholderTextColor="#978b7d" />
        </View>
        <View style={styles.inlineRow}>
          <TextInput style={[styles.input, styles.half]} value={hipsCm} onChangeText={setHipsCm} placeholder="Hips" keyboardType="numeric" placeholderTextColor="#978b7d" />
          <TextInput style={[styles.input, styles.half]} value={inseamCm} onChangeText={setInseamCm} placeholder="Inseam" keyboardType="numeric" placeholderTextColor="#978b7d" />
        </View>
        <View style={styles.inlineRow}>
          <TextInput style={[styles.input, styles.half]} value={shoulderCm} onChangeText={setShoulderCm} placeholder="Shoulder" keyboardType="numeric" placeholderTextColor="#978b7d" />
          <TextInput style={[styles.input, styles.half]} value={footLengthCm} onChangeText={setFootLengthCm} placeholder="Foot length" keyboardType="numeric" placeholderTextColor="#978b7d" />
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton onPress={saveMeasurements} disabled={saving || !profile}>
          {saving ? "Saving fit profile..." : "Save fit profile"}
        </PrimaryButton>
      </SectionCard>

      {!latest && !loading ? (
        <EmptyState
          title="No measurements saved yet"
          message="Add chest, waist, hips, shoulders, and inseam to unlock stronger fit guidance."
          actionLabel="Go to discover"
          onAction={() => router.push("/discover")}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10
  },
  half: {
    flex: 1
  },
  input: {
    borderWidth: 1,
    borderColor: "#e4d7c5",
    backgroundColor: "#fbf8f3",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: "#172033"
  },
  message: {
    color: "#5f697d",
    fontSize: 14
  },
  supportText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  }
});
