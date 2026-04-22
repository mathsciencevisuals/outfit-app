import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { InfoRow } from "../../components/InfoRow";
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
  const { data, loading, error } = useAsyncResource(() => mobileApi.measurements(userId), [userId]);
  const latest = data?.[0] ?? null;

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Measurements" subtitle="Loading fit calibration inputs." />
      </Screen>
    );
  }

  if (error) {
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

  if (!latest) {
    return (
      <Screen>
        <EmptyState
          title="No measurements saved"
          message="Fit scoring is strongest when chest, waist, hips, and inseam are available."
          actionLabel="Go to discover"
          onAction={() => router.push("/discover")}
        />
      </Screen>
    );
  }

  const coverage = [
    latest.chestCm,
    latest.waistCm,
    latest.hipsCm,
    latest.inseamCm,
    latest.shoulderCm,
    latest.footLengthCm
  ].filter((value) => value != null).length;

  return (
    <Screen>
      <SectionCard
        eyebrow="Profile Management"
        title="Body measurements"
        subtitle="These values drive fit scoring, recommendation confidence, and sizing decisions across the experience."
      >
        <View style={styles.row}>
          <Pill label={`Coverage ${coverage}/6`} tone={coverage >= 4 ? "success" : "warning"} />
          <Pill label={latest.source ?? "manual"} tone="neutral" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Chest" value={latest.chestCm ? `${latest.chestCm} cm` : "--"} />
          <MetricTile label="Waist" value={latest.waistCm ? `${latest.waistCm} cm` : "--"} />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Hips" value={latest.hipsCm ? `${latest.hipsCm} cm` : "--"} />
          <MetricTile label="Inseam" value={latest.inseamCm ? `${latest.inseamCm} cm` : "--"} />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Extended Inputs" title="Additional body data">
        <InfoRow label="Shoulder" value={latest.shoulderCm ? `${latest.shoulderCm} cm` : "Not set"} />
        <InfoRow label="Foot length" value={latest.footLengthCm ? `${latest.footLengthCm} cm` : "Not set"} />
        <InfoRow label="Source" value={latest.source ?? "manual"} />
        <Text style={styles.supportText}>
          Measurements can come from manual entry, onboarding, or future try-on calibration updates.
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Next Actions" title="Use this data">
        <PrimaryButton onPress={() => router.push("/discover")}>Go to discover</PrimaryButton>
        <PrimaryButton onPress={() => router.push("/tryon-upload")} variant="secondary">
          Run try-on with current profile
        </PrimaryButton>
      </SectionCard>
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
  supportText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  }
});
