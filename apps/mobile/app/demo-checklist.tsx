import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "../src/components/Screen";
import { colors, radius, shadow } from "../src/theme/design";
import { demoModeEnabled, env } from "../src/utils/env";

const checklistRows = [
  {
    label: "Demo login works",
    detail: "Verify onboarding/auth can enter demo mode and land on Feed.",
    route: "/auth",
    actionLabel: "Open Auth"
  },
  {
    label: "Feed has recommendation image",
    detail: "Check the feed hero, recommendation card, and floating actions.",
    route: "/feed",
    actionLabel: "Open Feed"
  },
  {
    label: "Try-On has self and garment preview",
    detail: "Confirm camera/upload stage, previews, vibe, fit style, and generate CTA.",
    route: "/try-on",
    actionLabel: "Open Try-On"
  },
  {
    label: "Result has original/result images",
    detail: "Check compare view, metadata chips, actions, and recommendations.",
    route: "/tryon-result",
    actionLabel: "Open Result"
  },
  {
    label: "Saved has wardrobe cards",
    detail: "Confirm saved fits and liked garments render visual wardrobe cards.",
    route: "/saved",
    actionLabel: "Open Saved"
  },
  {
    label: "Shops has offer cards",
    detail: "Check complete-the-look hero, offer cards, and bundle suggestions.",
    route: "/retail",
    actionLabel: "Open Shops"
  },
  {
    label: "Profile has avatar and logout",
    detail: "Verify avatar, quick links, wardrobe preview, and logout control.",
    route: "/account",
    actionLabel: "Open Profile"
  }
] as const;

export default function DemoChecklistRoute() {
  const router = useRouter();

  return (
    <Screen showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Developer</Text>
          <Text style={styles.title}>Screenshot checklist</Text>
          <Text style={styles.subtitle}>
            Use this route to move through every screenshot target quickly and verify the app is in demo-ready state.
          </Text>
        </View>

        <View style={styles.envCard}>
          <Text style={styles.sectionTitle}>Runtime</Text>
          <View style={styles.envRow}>
            <Text style={styles.envLabel}>EXPO_PUBLIC_API_URL</Text>
            <Text style={styles.envValue}>{env.EXPO_PUBLIC_API_URL}</Text>
          </View>
          <View style={styles.envRow}>
            <Text style={styles.envLabel}>EXPO_PUBLIC_DEMO_MODE</Text>
            <Text style={[styles.envValue, demoModeEnabled && styles.envValueActive]}>
              {String(env.EXPO_PUBLIC_DEMO_MODE)}
            </Text>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Checklist</Text>
          <View style={styles.list}>
            {checklistRows.map((row, index) => (
              <View key={row.label} style={[styles.row, index === checklistRows.length - 1 && styles.rowLast]}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{row.label}</Text>
                  <Text style={styles.rowDetail}>{row.detail}</Text>
                </View>
                <Pressable onPress={() => router.push(row.route as never)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                  <Text style={styles.actionButtonText}>{row.actionLabel}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  headerCard: {
    gap: 8,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  envCard: {
    gap: 10,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  envRow: {
    gap: 4
  },
  envLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: "700"
  },
  envValue: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19
  },
  envValueActive: {
    color: colors.success,
    fontWeight: "800"
  },
  listCard: {
    gap: 12,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  list: {
    gap: 0
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0
  },
  rowCopy: {
    flex: 1,
    gap: 4
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  rowDetail: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoft
  },
  actionButtonText: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
