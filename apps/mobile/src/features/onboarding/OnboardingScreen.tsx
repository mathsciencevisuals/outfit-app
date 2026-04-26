import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { colors, radius } from "../../theme/design";

const setupSteps = [
  {
    icon: "user",
    title: "Measurements",
    copy: "Height, weight, and body type power size recommendation and fit confidence."
  },
  {
    icon: "heart",
    title: "Style Preferences",
    copy: "Occasions, colors, and fit taste shape recommendations and the Feed."
  },
  {
    icon: "dollar-sign",
    title: "Budget Range",
    copy: "Stay inside your price comfort zone without flattening the style quality."
  }
] as const;

export function OnboardingScreen() {
  const router = useRouter();

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Welcome</Text>
          <Text style={styles.title}>Welcome to Style Studio</Text>
          <Text style={styles.subtitle}>Let&apos;s set up your fit profile in three quick steps so your recommendations, try-ons, and saved looks feel personal from the start.</Text>
        </View>

        <View style={styles.stepsCard}>
          {setupSteps.map((step, index) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepIndex}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.stepIconWrap}>
                <Feather name={step.icon} size={18} color={colors.inkOnDark} />
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.copy}</Text>
              </View>
            </View>
          ))}
        </View>

        <PrimaryButton onPress={() => router.push("/measurements")}>Get Started</PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 18,
    minHeight: "100%",
    justifyContent: "center"
  },
  heroCard: {
    gap: 10,
    padding: 24,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.84)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  eyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase"
  },
  title: {
    color: colors.inkOnDark,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 15,
    lineHeight: 24
  },
  stepsCard: {
    gap: 12,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.84)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft
  },
  stepIndexText: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "800"
  },
  stepIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  stepCopy: {
    flex: 1,
    gap: 4
  },
  stepTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  stepBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  }
});
