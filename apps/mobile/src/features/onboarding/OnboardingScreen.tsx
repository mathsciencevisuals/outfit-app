import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";

const onboardingSignals = [
  {
    icon: "user",
    title: "Profile intelligence",
    copy: "Build a fit-aware identity with measurements, preferences, and body-shape context."
  },
  {
    icon: "camera",
    title: "Try-on preview",
    copy: "Upload a clean look, queue generation, and review confidence before you shop."
  },
  {
    icon: "shopping-bag",
    title: "Retail comparison",
    copy: "Compare ready-to-buy offers across connected partners without leaving the flow."
  }
] as const;

export function OnboardingScreen() {
  const router = useRouter();
  const { data, loading } = useAsyncResource(() => mobileApi.onboarding(), []);

  if (loading) {
    return (
      <Screen>
        <LoadingState title="FitMe" subtitle="Preparing your premium fit journey." />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Fashion Tech"
        title={data?.title ?? "FitMe"}
        subtitle={data?.subtitle ?? "Build your profile and start discovering better fits."}
      >
        <Pill label="Profile + fit + try-on + shopping" tone="accent" />
        <Text style={styles.heroText}>
          Outfit planning, fit confidence, and retail visibility are already connected. This setup flow
          gets you from first sign-in to try-on preview without breaking momentum.
        </Text>
        <View style={styles.metricRow}>
          <MetricTile label="Journey" value="4 steps" caption="Onboard, profile, measure, discover" />
          <MetricTile label="Signal" value="Fit-first" caption="Recommendations stay grounded in measurements" />
        </View>
        <PrimaryButton onPress={() => router.push("/auth")}>Start setup</PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="What You Unlock" title="A wardrobe workflow, not just a catalog">
        {onboardingSignals.map((signal) => (
          <View key={signal.title} style={styles.featureRow}>
            <View style={styles.iconWrap}>
              <Feather name={signal.icon} size={18} color="#172033" />
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>{signal.title}</Text>
              <Text style={styles.featureText}>{signal.copy}</Text>
            </View>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroText: {
    color: "#4e586c",
    fontSize: 15,
    lineHeight: 23
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  featureRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start"
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#f0e6d8",
    alignItems: "center",
    justifyContent: "center"
  },
  featureCopy: {
    flex: 1,
    gap: 4
  },
  featureTitle: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "700"
  },
  featureText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  }
});
