import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

export function MeasurementsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data, loading, error } = useAsyncResource(() => mobileApi.measurements(userId), [userId, refreshKey]);
  const latest = data?.[0] ?? null;

  const [chestCm, setChestCm] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [hipsCm, setHipsCm] = useState("");
  const [inseamCm, setInseamCm] = useState("");
  const [shoulderCm, setShoulderCm] = useState("");
  const [footLengthCm, setFootLengthCm] = useState("");

  useEffect(() => {
    setChestCm(latest?.chestCm != null ? `${latest.chestCm}` : "");
    setWaistCm(latest?.waistCm != null ? `${latest.waistCm}` : "");
    setHipsCm(latest?.hipsCm != null ? `${latest.hipsCm}` : "");
    setInseamCm(latest?.inseamCm != null ? `${latest.inseamCm}` : "");
    setShoulderCm(latest?.shoulderCm != null ? `${latest.shoulderCm}` : "");
    setFootLengthCm(latest?.footLengthCm != null ? `${latest.footLengthCm}` : "");
  }, [latest]);

  const saveMeasurements = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await mobileApi.saveMeasurement(userId, {
        id: latest?.id,
        chestCm: chestCm ? Number(chestCm) : null,
        waistCm: waistCm ? Number(waistCm) : null,
        hipsCm: hipsCm ? Number(hipsCm) : null,
        inseamCm: inseamCm ? Number(inseamCm) : null,
        shoulderCm: shoulderCm ? Number(shoulderCm) : null,
        footLengthCm: footLengthCm ? Number(footLengthCm) : null,
        source: latest?.source ?? "manual"
      });
      setMessage("Measurements saved");
      setRefreshKey((value) => value + 1);
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Measurements could not be saved");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !latest) {
    return (
      <Screen>
        <LoadingState title="Measurements" subtitle="Loading fit calibration inputs." />
      </Screen>
    );
  }

  if (error && !latest) {
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

  const coverage = [
    latest?.chestCm ?? chestCm,
    latest?.waistCm ?? waistCm,
    latest?.hipsCm ?? hipsCm,
    latest?.inseamCm ?? inseamCm,
    latest?.shoulderCm ?? shoulderCm,
    latest?.footLengthCm ?? footLengthCm
  ].filter((value) => value != null && value !== "").length;

  return (
    <Screen>
      <SectionCard
        eyebrow="Body Measurements"
        title="Manual measurement entry"
        subtitle="These values drive fit scoring, recommendation confidence, and size decisions."
      >
        <View style={styles.row}>
          <Pill label={`Coverage ${coverage}/6`} tone={coverage >= 4 ? "success" : "warning"} />
          <Pill label={latest?.source ?? "manual"} tone="neutral" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Chest" value={chestCm || "--"} />
          <MetricTile label="Waist" value={waistCm || "--"} />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Hips" value={hipsCm || "--"} />
          <MetricTile label="Inseam" value={inseamCm || "--"} />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Manual Entry" title="Update your values">
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
        <PrimaryButton onPress={saveMeasurements} disabled={saving}>
          {saving ? "Saving measurements..." : "Save measurements"}
        </PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Auto Measurement" title="Pose detection">
        <Text style={styles.supportText}>
          Automatic measurement via pose detection is future-scoped. The UI is intentionally non-broken and disabled until the camera + model workflow is ready.
        </Text>
        <PrimaryButton variant="ghost" disabled>
          Auto detect coming soon
        </PrimaryButton>
      </SectionCard>

      {!latest && !loading ? (
        <EmptyState
          title="No measurements saved yet"
          message="Add chest, waist, hips, and inseam to unlock better fit confidence."
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
