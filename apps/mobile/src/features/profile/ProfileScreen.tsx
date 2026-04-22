import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { InfoRow } from "../../components/InfoRow";
import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

export function ProfileScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data, loading, error } = useAsyncResource(() => mobileApi.profile(userId), [userId]);

  const preferredStyles = Array.isArray(data?.stylePreference?.preferredStyles)
    ? (data?.stylePreference?.preferredStyles as string[])
    : [];
  const completionScore = [
    data?.heightCm,
    data?.bodyShape,
    data?.preferredColors?.length ? "palette" : undefined,
    preferredStyles.length ? "styles" : undefined
  ].filter(Boolean).length;

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Your profile" subtitle="Loading identity, fit, and style preferences." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ErrorState
          title="Your profile"
          message={error ?? "The profile is not available yet."}
          actionLabel="Go to onboarding"
          onRetry={() => router.push("/onboarding")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Profile Management"
        title={`${data.firstName} ${data.lastName}`}
        subtitle="Control the personal signals that feed fit scoring, discovery ranking, and try-on context."
      >
        <View style={styles.heroTop}>
          <Pill label={`${completionScore}/4 profile signals set`} tone={completionScore >= 3 ? "success" : "warning"} />
          <Pill label={data.bodyShape ?? "Body shape pending"} tone="neutral" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Height" value={data.heightCm ? `${Math.round(data.heightCm)} cm` : "Add"} caption="Used in fit calibration" />
          <MetricTile label="Palette" value={`${data.preferredColors?.length ?? 0}`} caption="Preferred color anchors" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Avoided" value={`${data.avoidedColors?.length ?? 0}`} caption="Colors to de-prioritize" />
          <MetricTile label="Styles" value={`${preferredStyles.length}`} caption="Saved preference tags" />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Identity" title="Profile details">
        <InfoRow label="Name" value={`${data.firstName} ${data.lastName}`} emphasized />
        <InfoRow label="Height" value={data.heightCm ? `${Math.round(data.heightCm)} cm` : "Not set"} />
        <InfoRow label="Body shape" value={data.bodyShape ?? "Not set"} />
        <InfoRow label="Age" value={data.age ? `${data.age}` : "Not set"} />
        <InfoRow label="Weight" value={data.weightKg ? `${Math.round(data.weightKg)} kg` : "Not set"} />
      </SectionCard>

      <SectionCard eyebrow="Style Profile" title="How discovery should feel">
        <Text style={styles.bodyText}>
          Preferred palette: {(data.preferredColors ?? []).join(", ") || "No colors selected yet."}
        </Text>
        <Text style={styles.bodyText}>
          Avoided palette: {(data.avoidedColors ?? []).join(", ") || "No excluded colors."}
        </Text>
        <View style={styles.pillRow}>
          {preferredStyles.length > 0 ? (
            preferredStyles.map((style) => <Pill key={style} label={style} tone="accent" />)
          ) : (
            <Pill label="No preferred styles saved" tone="warning" />
          )}
        </View>
      </SectionCard>

      <SectionCard eyebrow="Next Actions" title="Complete your fit profile">
        <View style={styles.actionRow}>
          <View style={styles.actionCopy}>
            <Feather name="sliders" size={18} color="#172033" />
            <Text style={styles.actionTitle}>Update measurements</Text>
            <Text style={styles.actionText}>Turn the profile into a usable sizing signal before discovery.</Text>
          </View>
          <PrimaryButton onPress={() => router.push("/measurements")} fullWidth={false}>
            Measurements
          </PrimaryButton>
        </View>
        <PrimaryButton onPress={() => router.push("/discover")} variant="secondary">
          Go to discover
        </PrimaryButton>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  bodyText: {
    color: "#5c6679",
    fontSize: 15,
    lineHeight: 22
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  actionRow: {
    borderRadius: 22,
    backgroundColor: "#f7f1e8",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 14,
    gap: 12
  },
  actionCopy: {
    gap: 6
  },
  actionTitle: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "700"
  },
  actionText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  }
});
